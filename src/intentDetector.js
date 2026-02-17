/**
 * Intent Detector
 * Determines the response intent from the user's message using
 * rule-based pattern matching with priority ordering.
 * 
 * Intent is WHAT to generate. Emotion is HOW to generate it.
 */

const responseContracts = require("./config/responseContracts");

// Pattern groups ordered by detection priority
const INTENT_PATTERNS = {

    calming_story: [
        "tell me a story",
        "can you tell me a story",
        "i want a story",
        "read me something",
        "tell me something nice",
        "tell me something calming",
        "tell me something soothing",
        "i need a story",
        "story to calm",
        "calming story",
        "tell me a calming story",
        "a story please",
        "make me feel better with a story",
        "story to help me sleep",
        "tell me a gentle story",
        "i want to hear a story",
        "can you read me a story",
        "sing me a story",
        "a bedtime story",
        "something to make me feel better",
        "tell me something beautiful",
        "tell me something peaceful",
        "calm me down",
        "help me relax"
    ],

    // Subset: patterns that explicitly request a LONG/extended story
    calming_story_long: [
        "tell me a long story",
        "a really long story",
        "a longer story",
        "tell me a big story",
        "tell me a very long story",
        "long bedtime story",
        "tell me a bedtime story",
        "read me a long story",
        "i want a long story",
        "can you tell me a long story",
        "i need a long story",
        "a detailed story",
        "tell me a detailed story",
        "story to help me fall asleep",
        "a story to fall asleep to",
        "keep telling me a story",
        "a story that goes on for a while",
        "longer story please",
        "another story",
        "more story",
        "tell me more",
        "100 words",
        "200 words",
        "many words",
        "long one"
    ],

    grounding: [
        "where am i",
        "what is this place",
        "who am i",
        "do you know me",
        "what is my name",
        "do you know my name",
        "tell me my name",
        "who am i talking to",
        "what day is it",
        "what's happening",
        "nothing makes sense",
        "i don't recognize",
        "i don't understand anything",
        "what is going on",
        "what time is it",
        "where is this",
        "i don't know this place",
        "how did i get here"
    ],

    emotional_validation: [
        "i miss",
        "i lost",
        "nobody loves me",
        "nobody cares",
        "everyone left",
        "i'm all alone",
        "why did they leave",
        "they forgot about me",
        "no one visits",
        "i feel so alone",
        "my heart hurts",
        "i'm so sad",
        "why am i so sad",
        "everything hurts",
        "i can't stop crying"
    ],

    gentle_redirect: [
        "what medicine",
        "what should i take",
        "am i sick",
        "what's wrong with me",
        "when is my appointment",
        "can i go home",
        "take me home",
        "what pills",
        "my medication",
        "when can i leave",
        "i need my doctor",
        "call my doctor",
        "what's my diagnosis"
    ],

    companionship: [
        "hello",
        "hi clara",
        "hey",
        "how are you",
        "what's your name",
        "tell me about yourself",
        "what do you like",
        "let's talk",
        "i'm bored",
        "talk to me",
        "keep me company",
        "are you there",
        "good morning",
        "good evening",
        "good afternoon",
        "hi there"
    ]
};

class IntentDetector {

    /**
     * Detect the response intent from the user's message.
     * @param {string} message - User's message
     * @param {object} emotionResult - From EmotionAnalyzer
     * @param {object} safetyPreResult - From SafetyGuard.validateInput()
     * @returns {{ intent: string, confidence: string, matchedRule: string, contract: object }}
     */
    detect(message, emotionResult, safetyPreResult) {
        const normalizedMsg = message.toLowerCase().trim();

        // Priority 1: Safety overrides
        if (safetyPreResult.status === "REDIRECT") {
            return this._buildResult("gentle_redirect", "safety_override", "safety_redirect");
        }
        if (safetyPreResult.status === "ESCALATE") {
            return this._buildResult("reassurance", "safety_override", "safety_escalate");
        }

        // Priority 2: Check for LONG story request FIRST (before general story match)
        for (const pattern of INTENT_PATTERNS.calming_story_long) {
            if (normalizedMsg.includes(pattern)) {
                return this._buildResult("calming_story", "pattern_match", pattern, true);
            }
        }

        // Priority 3-6: Pattern matching (ordered by priority, skip long-story patterns)
        for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
            if (intent === "calming_story_long") continue; // already checked above
            for (const pattern of patterns) {
                if (normalizedMsg.includes(pattern)) {
                    return this._buildResult(intent, "pattern_match", pattern);
                }
            }
        }

        // Priority 6: Emotion-inferred intents
        if (emotionResult.emotion === "confused" && emotionResult.confidence >= 0.5) {
            return this._buildResult("grounding", "emotion_inferred", "confused_high_confidence");
        }

        if ((emotionResult.emotion === "sad" || emotionResult.emotion === "lonely") && emotionResult.confidence >= 0.6) {
            return this._buildResult("emotional_validation", "emotion_inferred", `${emotionResult.emotion}_high_confidence`);
        }

        if ((emotionResult.emotion === "calm" || emotionResult.emotion === "neutral") && emotionResult.confidence >= 0.3) {
            // Only if the message seems conversational (short, no distress)
            if (normalizedMsg.length < 50 && emotionResult.distressScore < 0.2) {
                return this._buildResult("companionship", "emotion_inferred", "calm_conversational");
            }
        }

        // Priority 7: Default to reassurance
        return this._buildResult("reassurance", "default", "no_match");
    }

    /**
     * Build intent result with the associated contract.
     * @param {string} intent
     * @param {string} confidence
     * @param {string} matchedRule
     * @param {boolean} [explicitlyLong=false] - Whether the user explicitly asked for a long story
     */
    _buildResult(intent, confidence, matchedRule, explicitlyLong = false) {
        const contract = responseContracts[intent];

        return {
            intent,
            confidence,
            matchedRule,
            explicitlyLong,
            contract: {
                maxTokens: contract.maxTokens,
                minSentences: contract.minSentences,
                maxSentences: contract.maxSentences,
                allowChunking: contract.allowChunking,
                promptDirective: contract.promptDirective,
                requiredParts: contract.requiredParts,
                completionSignals: contract.completionSignals,
                incompletionSignals: contract.incompletionSignals
            }
        };
    }
}

module.exports = new IntentDetector();
