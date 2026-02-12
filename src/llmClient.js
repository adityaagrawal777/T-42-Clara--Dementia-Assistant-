/**
 * LLM Client
 * Wrapper around the LLM provider (Groq SDK).
 * Handles generation, retries, timeouts, and fallback.
 * Supports storyLengthMode for extended story generation.
 */

const Groq = require("groq-sdk");
const persona = require("./config/persona");
const { getResponse } = require("./safeResponseBank");

// Timeout durations
const DEFAULT_TIMEOUT_MS = 10000;    // 10 seconds for normal responses
const EXTENDED_TIMEOUT_MS = 45000;   // 45 seconds for extended bedtime stories

class LLMClient {
    constructor() {
        if (!process.env.GROQ_API_KEY) {
            console.warn("[LLMClient] ⚠️  GROQ_API_KEY not found in environment. LLM calls will fail.");
        }

        this.groq = new Groq({
            apiKey: process.env.GROQ_API_KEY,
        });
    }

    /**
     * Generate a response from the LLM.
     * @param {Array} messages - Array of { role, content }
     * @param {number} [maxTokensOverride] - Optional token limit override (for intent-specific limits)
     * @param {string} [storyLengthMode] - "standard" or "extended" — affects timeout
     * @returns {string} - Generated response text
     */
    async generate(messages, maxTokensOverride = null, storyLengthMode = "standard") {
        const timeoutMs = storyLengthMode === "extended" ? EXTENDED_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;

        try {
            const completion = await Promise.race([
                this.groq.chat.completions.create({
                    messages,
                    model: persona.model,
                    temperature: persona.temperature,
                    max_tokens: maxTokensOverride || persona.maxResponseTokens,
                    top_p: persona.topP,
                }),
                this._timeout(timeoutMs)
            ]);

            const reply = completion.choices?.[0]?.message?.content;

            if (!reply || reply.trim().length === 0) {
                console.warn("[LLMClient] Empty response from LLM, using fallback.");
                return getResponse("fallbacks");
            }

            return reply.trim();
        } catch (error) {
            console.error("[LLMClient] Generation failed:", error.message);
            return getResponse("fallbacks");
        }
    }

    /**
     * Generate with retry (for post-safety or completeness validation rejections).
     * @param {Array} messages - Original messages
     * @param {string} rejectionReason - Why the previous output was rejected
     * @param {number} attempt - Current attempt number (max 2 retries)
     * @param {string} [storyLengthMode] - "standard" or "extended"
     * @returns {string}
     */
    async regenerate(messages, rejectionReason, attempt = 1, storyLengthMode = "standard") {
        if (attempt > 2) {
            console.warn("[LLMClient] Max regeneration attempts reached, using fallback.");
            return getResponse("fallbacks");
        }

        // Build mode-aware corrective instruction
        let correctionDirective;

        if (storyLengthMode === "extended") {
            correctionDirective =
                `Your previous response was not suitable. Reason: ${rejectionReason}. ` +
                "Please try again. Generate a COMPLETE, long, slow bedtime-style story with 40–50 sentences. " +
                "The story must have a clear beginning, a rich detailed middle, and a warm conclusive ending. " +
                "Do NOT cut it short. Do NOT offer to continue. This must be the ENTIRE story.";
        } else if (storyLengthMode === "standard") {
            correctionDirective =
                `Your previous response was not suitable. Reason: ${rejectionReason}. ` +
                "Please try again. If this is a story, generate a complete gentle story with 7–8 sentences — " +
                "beginning, middle, and a warm ending. If not a story, respond with a shorter, simpler, warmer message.";
        } else {
            correctionDirective =
                `Your previous response was not suitable. Reason: ${rejectionReason}. ` +
                "Please respond again with a shorter, simpler, warmer message. " +
                "Use 1-2 sentences maximum. Do not mention medical topics, future plans, or past conversations.";
        }

        const correctedMessages = [
            ...messages,
            {
                role: "system",
                content: correctionDirective
            }
        ];

        return this.generate(correctedMessages, null, storyLengthMode);
    }

    /**
     * @param {number} ms - Timeout duration in milliseconds
     */
    _timeout(ms = DEFAULT_TIMEOUT_MS) {
        return new Promise((_, reject) => {
            setTimeout(() => reject(new Error("LLM request timed out")), ms);
        });
    }
}

module.exports = new LLMClient();
