/**
 * Completeness Validator
 * Validates LLM output against the intent's response contract.
 * Ensures responses are structurally complete before reaching the user.
 * Supports storyLengthMode: "standard" (7–8 sentences) or "extended" (40–50 sentences).
 */

class CompletenessValidator {

    /**
     * Validate a response against the intent's contract.
     * @param {string} response - LLM-generated response text
     * @param {object} intentResult - From IntentDetector.detect()
     * @param {string} [storyLengthMode] - "standard" or "extended" (only for calming_story)
     * @returns {{ valid: boolean, reason: string|null }}
     */
    validate(response, intentResult, storyLengthMode = "standard") {
        const contract = intentResult.contract;
        const intent = intentResult.intent;

        if (!response || response.trim().length === 0) {
            return { valid: false, reason: "Empty response" };
        }

        const trimmed = response.trim();

        // 1. Check minimum sentence count
        const sentenceCount = this._countSentences(trimmed);
        if (sentenceCount < contract.minSentences) {
            return {
                valid: false,
                reason: `Too few sentences: got ${sentenceCount}, need at least ${contract.minSentences} for ${intent}`
            };
        }

        // 2. Check for incompletion signals (response ends mid-thought)
        const endsIncomplete = this._endsWithIncompletionSignal(trimmed, contract.incompletionSignals);
        if (endsIncomplete) {
            return {
                valid: false,
                reason: `Response appears incomplete — ends with truncation signal for ${intent}`
            };
        }

        // 3. Check for promise without delivery (story-specific)
        if (intent === "calming_story") {
            const storyCheck = this._validateStory(trimmed, contract, storyLengthMode);
            if (!storyCheck.valid) {
                return storyCheck;
            }
        }

        // 4. Check for "would you like more" pattern (incomplete for all intents)
        if (this._offersMore(trimmed)) {
            return {
                valid: false,
                reason: "Response offers to continue — must be self-contained"
            };
        }

        // 5. Check it ends with a completion signal
        const endsComplete = this._endsWithCompletionSignal(trimmed, contract.completionSignals);
        if (!endsComplete) {
            return {
                valid: false,
                reason: `Response does not end with a proper conclusion for ${intent}`
            };
        }

        return { valid: true, reason: null };
    }

    /**
     * Count sentences in a response.
     */
    _countSentences(text) {
        // Split on sentence-ending punctuation
        const sentences = text
            .split(/[.!?]+/)
            .map(s => s.trim())
            .filter(s => s.length > 3); // Filter out fragments and emoji-only splits

        return sentences.length;
    }

    /**
     * Check if the response ends with an incompletion signal.
     */
    _endsWithIncompletionSignal(text, signals) {
        const lastChars = text.slice(-20).toLowerCase();
        return signals.some(signal => lastChars.endsWith(signal.trim()));
    }

    /**
     * Check if the response ends with a completion signal.
     */
    _endsWithCompletionSignal(text, signals) {
        const lastChars = text.slice(-5);
        return signals.some(signal => lastChars.includes(signal));
    }

    /**
     * Check if the response offers to continue (bad for dementia care).
     */
    _offersMore(text) {
        const lower = text.toLowerCase();
        const offerPatterns = [
            "would you like to hear more",
            "shall i continue",
            "want to hear more",
            "would you like another",
            "want me to go on",
            "should i tell you more",
            "do you want more",
            "i can tell you more"
        ];
        return offerPatterns.some(p => lower.includes(p));
    }

    /**
     * Story-specific validation — adapts to storyLengthMode.
     */
    _validateStory(text, contract, storyLengthMode) {
        const sentenceCount = this._countSentences(text);

        if (storyLengthMode === "extended") {
            // Extended story: expect at least 30 sentences (relaxed from 40 to account for LLM variance)
            if (sentenceCount < 30) {
                return {
                    valid: false,
                    reason: `Extended story too short: ${sentenceCount} sentences. Need at least 30 for a bedtime-style story.`
                };
            }

            // Check for a conclusive ending (extended stories must feel finished)
            if (!this._hasConclusiveEnding(text)) {
                return {
                    valid: false,
                    reason: "Extended story does not end with a conclusive, peaceful ending."
                };
            }
        } else {
            // Standard story: must have at least 7 sentences for a proper story
            if (sentenceCount < 7) {
                return {
                    valid: false,
                    reason: `Story too short: ${sentenceCount} sentences. Need at least 7 for a complete story with beginning, middle, and end.`
                };
            }
        }

        // Check for promise without delivery (both modes)
        const promisePatterns = [
            "let me tell you a story",
            "here's a story",
            "i'll tell you a story",
            "once upon a time"
        ];
        const hasPromise = promisePatterns.some(p => text.toLowerCase().includes(p));

        if (hasPromise && sentenceCount < 4) {
            return {
                valid: false,
                reason: "Story was promised but not delivered — too short to contain beginning, middle, and end."
            };
        }

        return { valid: true, reason: null };
    }

    /**
     * Check if a story has a conclusive ending (for extended stories).
     * Looks for peaceful, settled language in the final 2 sentences.
     */
    _hasConclusiveEnding(text) {
        const lastChunk = text.slice(-300).toLowerCase();
        const conclusivePatterns = [
            "and all was",
            "everything was",
            "peacefully",
            "drifted",
            "settled",
            "the end",
            "fell asleep",
            "closed its eyes",
            "softly to sleep",
            "from that day",
            "and so",
            "quiet and still",
            "warm and safe",
            "gently",
            "at last",
            "finally",
            "came to rest",
            "💛",
            "🌸"
        ];
        return conclusivePatterns.some(p => lastChunk.includes(p));
    }
}

module.exports = new CompletenessValidator();

