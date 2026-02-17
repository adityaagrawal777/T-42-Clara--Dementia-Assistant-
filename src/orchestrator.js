/**
 * Clara Orchestrator
 * Central coordination layer — the brain's conductor.
 * Invokes each pipeline component in sequence and handles branching.
 *
 * Story Logic:
 * - Determines storyLengthMode ("standard" or "extended") for calming_story intent.
 * - Extended mode triggers when distressScore > 0.75 OR user explicitly asks for a long story.
 * - Selects a unique story theme via StoryThemeEngine to ensure variety.
 */

const emotionAnalyzer = require("./emotionAnalyzer");
const memoryManager = require("./memoryManager");
const safetyGuard = require("./safetyGuard");
const contextAssembler = require("./contextAssembler");
const llmClient = require("./llmClient");
const responsePacer = require("./responsePacer");
const intentDetector = require("./intentDetector");
const completenessValidator = require("./completenessValidator");
const storyThemeEngine = require("./storyThemeEngine");
const responseContracts = require("./config/responseContracts");
const { getResponse, getIntentFallback } = require("./safeResponseBank");
const logger = require("./logger");

// Distress threshold for triggering extended story mode
const EXTENDED_STORY_DISTRESS_THRESHOLD = 0.75;

class ClaraOrchestrator {
    /**
     * Process a single user message through the full pipeline.
     * @param {string} sessionId
     * @param {string} message
     * @returns {object} ClaraResponse
     */
    async processMessage(sessionId, message, userId = null) {
        const startTime = Date.now();
        const responseId = this._generateId();

        // --- Ensure session exists ---
        let session = memoryManager.getSession(sessionId);
        if (!session) {
            session = memoryManager.createSession(sessionId, {}, userId);
        } else if (userId && !session.userId) {
            // Link userId if it was missing (e.g. session created before full auth context available)
            session.userId = userId;
        }

        // --- Step 1: Emotion Analysis ---
        const emotionResult = emotionAnalyzer.analyze(
            message,
            session.emotionHistory || []
        );

        console.log(`[Orchestrator] Emotion: ${emotionResult.emotion} (${emotionResult.confidence}) | Distress: ${emotionResult.distressScore} | Trajectory: ${emotionResult.trajectory}`);

        // --- Step 2: Memory Query ---
        const memoryResult = memoryManager.query(sessionId, message);

        if (memoryResult.isRepeat) {
            console.log(`[Orchestrator] Repetition detected (count: ${memoryResult.repeatCount}) — responding as if first time.`);
        }

        // --- Step 3: Safety Guard (Pre-Response) ---
        const safetyPreResult = safetyGuard.validateInput(message, emotionResult);

        if (safetyPreResult.status === "ESCALATE") {
            logger.escalation({
                sessionId,
                reason: safetyPreResult.category,
                severity: safetyPreResult.severity,
                context: message.slice(0, 200)
            });
            logger.safety({ sessionId, status: "ESCALATE", category: safetyPreResult.category });

            memoryManager.update(sessionId, message, safetyPreResult.safeResponse, emotionResult);

            return this._buildResponse({
                sessionId,
                responseId,
                reply: safetyPreResult.safeResponse,
                emotionResult,
                startTime,
                escalation: {
                    triggered: true,
                    category: safetyPreResult.category,
                    severity: safetyPreResult.severity
                }
            });
        }

        if (safetyPreResult.status === "REDIRECT") {
            logger.safety({ sessionId, status: "REDIRECT", category: safetyPreResult.category });

            memoryManager.update(sessionId, message, safetyPreResult.safeResponse, emotionResult);

            return this._buildResponse({
                sessionId,
                responseId,
                reply: safetyPreResult.safeResponse,
                emotionResult,
                startTime
            });
        }

        // --- Step 4: Intent Detection ---
        const intentResult = intentDetector.detect(message, emotionResult, safetyPreResult);

        // --- Step 4.5: Story Length Mode Determination ---
        let storyLengthMode = "standard";
        let storyContext = null;

        if (intentResult.intent === "calming_story") {
            // Determine if extended mode should activate
            const isHighDistress = emotionResult.distressScore > EXTENDED_STORY_DISTRESS_THRESHOLD;
            const isExplicitlyLong = intentResult.explicitlyLong === true;

            if (isHighDistress || isExplicitlyLong) {
                storyLengthMode = "extended";

                // Swap the contract to extended version
                const extendedContract = responseContracts.calming_story_extended;
                intentResult.contract = {
                    maxTokens: extendedContract.maxTokens,
                    minSentences: extendedContract.minSentences,
                    maxSentences: extendedContract.maxSentences,
                    allowChunking: extendedContract.allowChunking,
                    promptDirective: extendedContract.promptDirective,
                    requiredParts: extendedContract.requiredParts,
                    completionSignals: extendedContract.completionSignals,
                    incompletionSignals: extendedContract.incompletionSignals
                };

                console.log(`[Orchestrator] 📖 Extended story mode activated (distress: ${emotionResult.distressScore}, explicit: ${isExplicitlyLong})`);
            } else {
                console.log(`[Orchestrator] 📖 Standard story mode`);
            }

            // Select a unique story theme (avoids consecutive repeats)
            const theme = storyThemeEngine.selectTheme(sessionId, session.userId);
            storyContext = { theme, storyLengthMode };

            console.log(`[Orchestrator] 🎨 Story theme: "${theme.id}" — ${theme.label}`);
        }

        console.log(`[Orchestrator] Intent: ${intentResult.intent} (${intentResult.confidence}) | Rule: ${intentResult.matchedRule} | MaxTokens: ${intentResult.contract.maxTokens}${storyLengthMode !== "standard" ? ` | StoryMode: ${storyLengthMode}` : ""}`);

        // --- Step 5: Context Assembly (now intent + story-aware) ---
        const messages = contextAssembler.build(message, emotionResult, memoryResult, safetyPreResult, intentResult, storyContext);

        // --- Step 6: LLM Generation (with intent-specific token limit + story mode) ---
        let reply = await llmClient.generate(messages, intentResult.contract.maxTokens, storyLengthMode);

        // --- Step 7: Completeness Validation (story-mode-aware) ---
        const completenessCheck = completenessValidator.validate(reply, intentResult, storyLengthMode);

        if (!completenessCheck.valid) {
            console.warn(`[Orchestrator] Completeness rejection: ${completenessCheck.reason}`);

            // Attempt full regeneration (not "continue" — fresh attempt)
            reply = await llmClient.regenerate(messages, completenessCheck.reason, 1, storyLengthMode);

            // Validate again
            const retryCompleteness = completenessValidator.validate(reply, intentResult, storyLengthMode);
            if (!retryCompleteness.valid) {
                console.warn(`[Orchestrator] Regeneration still incomplete. Using intent-specific fallback.`);
                reply = getIntentFallback(intentResult.intent, sessionId);
            }
        }

        // --- Step 8: Safety Guard (Post-Response) ---
        const safetyPostResult = safetyGuard.validateOutput(reply);

        if (!safetyPostResult.valid) {
            console.warn(`[Orchestrator] Post-safety rejection: ${safetyPostResult.reason}`);

            // Attempt regeneration (up to 2 times)
            reply = await llmClient.regenerate(messages, safetyPostResult.reason, 1, storyLengthMode);

            // Validate again
            const retryValidation = safetyGuard.validateOutput(reply);
            if (!retryValidation.valid) {
                console.warn(`[Orchestrator] Regeneration also rejected. Using fallback.`);
                reply = getIntentFallback(intentResult.intent, sessionId);
            }
        }

        // --- Step 9: Update Memory & Log ---
        memoryManager.update(sessionId, message, reply, emotionResult, intentResult, storyContext);

        logger.interaction({
            sessionId,
            userMessage: message,
            emotion: emotionResult.emotion,
            distressScore: emotionResult.distressScore,
            trajectory: emotionResult.trajectory,
            isRepeat: memoryResult.isRepeat,
            intent: intentResult.intent,
            intentConfidence: intentResult.confidence,
            storyLengthMode: intentResult.intent === "calming_story" ? storyLengthMode : undefined,
            storyTheme: storyContext ? storyContext.theme.id : undefined,
            reply,
            processingTimeMs: Date.now() - startTime,
            safetyStatus: "SAFE"
        });

        // --- Step 10: Build Response with Pacing (now intent-aware) ---
        return this._buildResponse({
            sessionId,
            responseId,
            reply,
            emotionResult,
            intentResult,
            storyLengthMode: intentResult.intent === "calming_story" ? storyLengthMode : undefined,
            startTime
        });
    }

    /**
     * Build the final response object with pacing metadata.
     */
    _buildResponse({ sessionId, responseId, reply, emotionResult, intentResult = null, storyLengthMode, startTime, escalation = null }) {
        const pacing = responsePacer.pace(reply, emotionResult, intentResult);

        return {
            sessionId,
            reply,
            emotion: {
                detected: emotionResult.emotion,
                confidence: emotionResult.confidence,
                distressScore: emotionResult.distressScore,
                trajectory: emotionResult.trajectory
            },
            intent: intentResult ? {
                detected: intentResult.intent,
                confidence: intentResult.confidence,
                storyLengthMode: storyLengthMode || undefined
            } : null,
            pacing,
            escalation: escalation || { triggered: false },
            meta: {
                responseId,
                processingTimeMs: Date.now() - startTime
            }
        };
    }

    _generateId() {
        return "resp_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
    }
}

module.exports = new ClaraOrchestrator();
