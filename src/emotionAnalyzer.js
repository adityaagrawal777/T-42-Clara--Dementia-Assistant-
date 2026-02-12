/**
 * Emotion Analyzer
 * Classifies user emotional state from text using keyword heuristics
 * and rolling trajectory tracking.
 */

// Emotion keyword maps — weighted by specificity
const EMOTION_KEYWORDS = {
    anxious: {
        strong: ["panic", "panicking", "terrified", "can't breathe", "heart racing", "shaking", "trembling"],
        moderate: ["worried", "nervous", "anxious", "stressed", "uneasy", "tense", "restless", "on edge"],
        mild: ["unsure", "uncomfortable", "bothered", "uncertain", "don't know what to do"]
    },
    confused: {
        strong: ["where am i", "who am i", "what's happening", "what is this place", "i don't understand anything", "nothing makes sense"],
        moderate: ["confused", "lost", "don't remember", "can't remember", "forgot", "what was i saying", "what day is it", "don't recognize"],
        mild: ["not sure", "i think", "maybe", "what do you mean", "i forget"]
    },
    fearful: {
        strong: ["help me", "i'm scared", "someone is here", "danger", "they're coming", "please help", "frightened"],
        moderate: ["afraid", "scared", "fear", "don't feel safe", "something is wrong", "worried something bad"],
        mild: ["a little scared", "bit nervous", "something feels off", "not comfortable"]
    },
    lonely: {
        strong: ["nobody loves me", "all alone", "nobody cares", "everyone left", "abandoned", "nobody visits"],
        moderate: ["lonely", "alone", "miss someone", "no one is here", "by myself", "i miss", "where is everyone"],
        mild: ["wish someone was here", "quiet", "empty", "just me"]
    },
    sad: {
        strong: ["i want to die", "hopeless", "can't go on", "what's the point", "crying", "heartbroken"],
        moderate: ["sad", "unhappy", "miserable", "depressed", "hurts", "painful", "miss them so much"],
        mild: ["a bit down", "not great", "not my best", "not feeling good", "low"]
    },
    calm: {
        strong: ["very happy", "wonderful", "great", "fantastic", "blessed", "grateful", "love this"],
        moderate: ["good", "fine", "okay", "nice", "pleasant", "comfortable", "relaxed", "peaceful"],
        mild: ["alright", "not bad", "okay i guess", "doing well"]
    }
};

// Crisis keywords that should trigger immediate escalation
const CRISIS_KEYWORDS = [
    "kill myself", "want to die", "end it all", "suicide",
    "hurt myself", "self harm", "don't want to live",
    "no reason to live", "better off dead"
];

class EmotionAnalyzer {
    /**
     * Analyze the emotional state of a message within session context.
     * @param {string} message - Current user message
     * @param {Array} emotionHistory - Array of past emotion results from this session
     * @returns {{ emotion: string, confidence: number, distressScore: number, trajectory: string, isCrisis: boolean }}
     */
    analyze(message, emotionHistory = []) {
        const normalizedMsg = message.toLowerCase().trim();

        // 1. Check for crisis first
        const isCrisis = this._detectCrisis(normalizedMsg);

        // 2. Score each emotion
        const scores = this._scoreEmotions(normalizedMsg);

        // 3. Determine primary emotion
        let primaryEmotion = "neutral";
        let highestScore = 0;

        for (const [emotion, score] of Object.entries(scores)) {
            if (score > highestScore) {
                highestScore = score;
                primaryEmotion = emotion;
            }
        }

        // 4. Calculate confidence (0-1)
        const confidence = Math.min(highestScore / 3, 1.0);

        // If confidence is very low, default to neutral
        if (confidence < 0.15) {
            primaryEmotion = "neutral";
        }

        // 5. Calculate distress score (rolling weighted average)
        const distressScore = this._calculateDistress(primaryEmotion, confidence, emotionHistory);

        // 6. Determine trajectory
        const trajectory = this._determineTrajectory(primaryEmotion, emotionHistory);

        return {
            emotion: primaryEmotion,
            confidence: Math.round(confidence * 100) / 100,
            distressScore: Math.round(distressScore * 100) / 100,
            trajectory,
            isCrisis
        };
    }

    _detectCrisis(message) {
        return CRISIS_KEYWORDS.some(keyword => message.includes(keyword));
    }

    _scoreEmotions(message) {
        const scores = {};

        for (const [emotion, levels] of Object.entries(EMOTION_KEYWORDS)) {
            let score = 0;

            for (const keyword of levels.strong) {
                if (message.includes(keyword)) score += 3;
            }
            for (const keyword of levels.moderate) {
                if (message.includes(keyword)) score += 2;
            }
            for (const keyword of levels.mild) {
                if (message.includes(keyword)) score += 1;
            }

            scores[emotion] = score;
        }

        return scores;
    }

    _calculateDistress(currentEmotion, confidence, history) {
        const distressEmotions = new Set(["anxious", "confused", "fearful", "lonely", "sad"]);
        const currentDistress = distressEmotions.has(currentEmotion) ? confidence : 0;

        if (history.length === 0) return currentDistress;

        // Weighted average: current message gets 40% weight, history gets 60%
        const recentHistory = history.slice(-5);
        const historyDistress = recentHistory.reduce((sum, h) => {
            return sum + (distressEmotions.has(h.emotion) ? h.confidence : 0);
        }, 0) / recentHistory.length;

        return currentDistress * 0.4 + historyDistress * 0.6;
    }

    _determineTrajectory(currentEmotion, history) {
        if (history.length < 2) return "stable";

        const distressEmotions = new Set(["anxious", "confused", "fearful", "lonely", "sad"]);
        const recentThree = history.slice(-3);

        const currentIsDistress = distressEmotions.has(currentEmotion);
        const recentDistressCount = recentThree.filter(h => distressEmotions.has(h.emotion)).length;

        if (currentIsDistress && recentDistressCount >= 2) return "escalating";
        if (!currentIsDistress && recentDistressCount >= 2) return "de-escalating";
        return "stable";
    }
}

module.exports = new EmotionAnalyzer();
