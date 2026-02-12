/**
 * Response Pacer
 * Calculates humanized delivery delays and splits responses into
 * timed chunks to simulate natural, caring conversation rhythm.
 */

class ResponsePacer {
    /**
     * Calculate pacing metadata for a response.
     * @param {string} response - Clara's full response text
     * @param {object} emotionResult - From EmotionAnalyzer
     * @param {object} [intentResult] - From IntentDetector.detect() (optional)
     * @returns {{ initialDelayMs: number, chunks: Array<{ text: string, preDelayMs: number }> }}
     */
    pace(response, emotionResult, intentResult = null) {
        // Check if chunking is disabled for this intent (e.g., calming_story)
        const allowChunking = intentResult?.contract?.allowChunking ?? true;

        if (!allowChunking) {
            // Deliver as a single block with extended delay (story mode)
            const initialDelayMs = this._calculateStoryDelay(response, emotionResult);
            return {
                initialDelayMs,
                chunks: [{ text: response.trim(), preDelayMs: 0 }]
            };
        }

        // 1. Split into sentence chunks
        const chunks = this._chunkResponse(response);

        // 2. Calculate initial typing delay
        const initialDelayMs = this._calculateInitialDelay(response, emotionResult);

        // 3. Calculate inter-chunk delays
        const pacedChunks = chunks.map((text, index) => ({
            text,
            preDelayMs: index === 0 ? 0 : this._calculateChunkDelay(emotionResult)
        }));

        return {
            initialDelayMs,
            chunks: pacedChunks
        };
    }

    /**
     * Calculate the initial "thinking" delay before the first chunk appears.
     */
    _calculateInitialDelay(response, emotionResult) {
        const baseDelay = 1200;
        const emotionDelay = emotionResult.distressScore * 800;
        const lengthDelay = response.length * 0.8;
        const variance = (Math.random() * 600) - 200; // -200 to +400

        const total = baseDelay + emotionDelay + lengthDelay + variance;

        // Clamp between 1500ms and 4000ms
        return Math.round(Math.max(1500, Math.min(4000, total)));
    }

    /**
     * Calculate the delay between chunks.
     */
    _calculateChunkDelay(emotionResult) {
        const base = 900;
        const emotionAdj = emotionResult.distressScore * 400;
        const variance = (Math.random() * 400) - 100; // -100 to +300

        const total = base + emotionAdj + variance;
        return Math.round(Math.max(800, Math.min(1800, total)));
    }

    /**
     * Split a response into natural sentence chunks.
     * Maximum 2 chunks to avoid overwhelming the user.
     */
    _chunkResponse(response) {
        // Split on sentence boundaries
        const sentences = response
            .split(/(?<=[.!?])\s+/)
            .map(s => s.trim())
            .filter(s => s.length > 0);

        if (sentences.length <= 1) {
            return [response.trim()];
        }

        if (sentences.length === 2) {
            return sentences;
        }

        // More than 2 sentences: group into 2 chunks
        const midpoint = Math.ceil(sentences.length / 2);
        return [
            sentences.slice(0, midpoint).join(" "),
            sentences.slice(midpoint).join(" ")
        ];
    }

    /**
     * Calculate extended delay for story delivery.
     * Stories get a longer "thinking" pause to feel like Clara is composing something special.
     */
    _calculateStoryDelay(response, emotionResult) {
        const baseDelay = 3000;
        const emotionDelay = emotionResult.distressScore * 500;
        const variance = (Math.random() * 800) - 200; // -200 to +600

        const total = baseDelay + emotionDelay + variance;
        return Math.round(Math.max(3000, Math.min(4500, total)));
    }
}

module.exports = new ResponsePacer();
