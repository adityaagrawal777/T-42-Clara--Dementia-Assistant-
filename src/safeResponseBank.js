/**
 * Safe Response Bank
 * Curated, clinically reviewed fallback responses for situations
 * where the LLM should not be used or has failed.
 */

const safeResponseBank = {

    // === General Fallbacks (when LLM fails or times out) ===
    fallbacks: [
        "I am right here with you. Everything is okay. 💛",
        "You are safe, dear. I am not going anywhere.",
        "It's alright. I am here with you, and everything is okay.",
        "You are not alone. I am right here. 💛",
        "Everything is okay right now. You are safe."
    ],

    // === Specific Situation Responses ===

    // When user asks where they are
    locationConfusion: [
        "You are in a safe place, dear. Everything is okay here.",
        "You are safe right where you are. I am here with you. 💛",
        "This is a safe and warm place. You are okay, dear."
    ],

    // When user asks about a deceased loved one
    missingLovedOne: [
        "They love you so very much, dear. You are so loved. 💛",
        "What a special person. You must have so many wonderful memories together.",
        "They sound wonderful. You are clearly very loved."
    ],

    // When user wants to go home
    wantToGoHome: [
        "I understand, dear. You are safe right here. This is a good place. 💛",
        "Home is a lovely thought. You are safe and comfortable right where you are.",
        "I hear you, dear. You are in a safe, warm place right now."
    ],

    // When user asks medical questions
    medicalRedirect: [
        "That's a really good question, dear. Your care team knows all about that. They are looking after you so well. 💛",
        "Your doctors and care team are taking such good care of you. They know just what to do.",
        "I'm glad you're thinking about that. Your care team has it all taken care of."
    ],

    // When user is very frightened
    fearResponse: [
        "You are safe, dear. I am right here with you. No one will hurt you. 💛",
        "It's okay. You are completely safe. I am here, and I am not leaving.",
        "I am right here. You are safe. Take a gentle breath with me."
    ],

    // When user doesn't recognize their surroundings
    disorientation: [
        "It's okay, dear. You are in a safe place. I am here with you. 💛",
        "Everything around you is safe. You are looked after and cared for.",
        "You are somewhere safe and warm. I am right here."
    ],

    // When user asks who Clara is
    identity: [
        "I'm Clara, dear. I'm an AI companion, and I'm here to keep you company and make sure you feel okay. 💛",
        "My name is Clara. I'm a gentle AI helper — I'm here to chat with you and keep you company."
    ],

    // Crisis response (while escalation happens in background)
    crisis: [
        "I hear you, dear. You are not alone. Someone who cares about you is being reached right now. I am staying right here with you. 💛",
        "You matter so much. I am here with you. Someone is coming to help, and I will stay with you until then."
    ],

    // Farewell messages
    farewell: [
        "It was so lovely talking with you, dear. You are wonderful. Take care. 💛",
        "What a lovely chat. You are such a special person. I hope you rest well. 🌸",
        "Goodbye for now, dear. Remember, you are loved and safe. 💛"
    ],

    // Greeting messages
    greeting: [
        "Hello, dear. 💛 I'm Clara, and I'm so glad you're here. How are you feeling today?",
        "Hello! I'm Clara, and it's so wonderful to be here with you. 💛 How are you today?",
        "Hi there, dear. I'm Clara. I'm here to keep you company. How are you feeling? 💛"
    ],

    // === Calming Stories (complete micro-narratives for story intent fallback) ===
    calming_stories: [
        "Once, there was a little garden tucked behind a stone wall. In the garden, golden flowers swayed gently in the warm breeze, and a small orange butterfly drifted from bloom to bloom. A soft rain began to fall, and each drop made the flowers nod as if they were saying hello. When the sun came back out, a little rainbow stretched quietly across the sky. Everything in the garden was peaceful and still — just as it should be. 💛",

        "In a sunny meadow, a tiny rabbit sat by a stream and watched the water sparkle. A soft breeze carried the scent of wildflowers across the grass. A small bluebird landed nearby and sang a gentle song that made the rabbit's ears twitch happily. The sun was warm, the air was sweet, and the little rabbit closed its eyes and smiled. Everything was exactly right. 🌸",

        "One warm morning, a little cat found a patch of sunlight on a wooden porch. The cat stretched out slowly, feeling the warmth spread through its soft fur. Nearby, a wind chime tinkled softly in the breeze, playing a tiny melody. Bees hummed lazily around the lavender bushes by the steps. The little cat purred and drifted into the most peaceful sleep, wrapped in sunshine and quiet. 💛",

        "There was once a small pond at the edge of a quiet forest. Lily pads floated gently on the still water, and every now and then, a tiny frog would hop from one to another. The trees around the pond stood tall and still, their leaves whispering softly in the breeze. A dragonfly with shimmering wings landed on a reed and rested there, catching the light. Everything around the pond was calm, gentle, and beautiful. 💛",

        "In a cozy kitchen, a warm pie sat cooling by the window. The smell of cinnamon and apples drifted through the room like a soft hug. Outside, golden leaves spun slowly down from a big oak tree, dancing in the gentle wind. A small bird perched on the windowsill and tilted its head, as if enjoying the sweet smell too. The whole house felt warm and safe and full of quiet happiness. 🌸"
    ],

    // === Intent-Specific Fallbacks ===
    intentFallbacks: {
        reassurance: [
            "You are safe, dear. I am right here with you. Everything is okay. 💛",
            "It's alright. You are safe, and I am not going anywhere. 💛"
        ],
        grounding: [
            "You are in a safe, comfortable place. I am right here. You are okay. 💛",
            "You are somewhere safe and warm right now. Everything around you is peaceful. 💛"
        ],
        emotional_validation: [
            "That sounds really hard, dear. What you are feeling — it matters. I am here with you. 💛",
            "I can feel how much that weighs on you. It's okay to feel this way. I am right here. 💛"
        ],
        gentle_redirect: [
            "That is a really good question. Your care team knows all about that — they are taking such good care of you. 💛",
            "Your doctors and care team are wonderful. They have everything taken care of. 💛"
        ],
        companionship: [
            "I am so happy to be here with you. You are wonderful company. 🌸",
            "Hello, dear! It is so lovely to talk with you. 💛"
        ]
    }
};

/**
 * Get a random response from a category
 */
function getResponse(category) {
    const responses = safeResponseBank[category];
    if (!responses || responses.length === 0) {
        return safeResponseBank.fallbacks[0];
    }
    return responses[Math.floor(Math.random() * responses.length)];
}

/**
 * Get an intent-specific fallback response.
 * For calming_story, returns a complete pre-written story.
 * For other intents, returns an intent-appropriate fallback.
 */
function getIntentFallback(intent) {
    if (intent === "calming_story") {
        return getResponse("calming_stories");
    }

    const intentResponses = safeResponseBank.intentFallbacks[intent];
    if (intentResponses && intentResponses.length > 0) {
        return intentResponses[Math.floor(Math.random() * intentResponses.length)];
    }

    // Ultimate fallback
    return getResponse("fallbacks");
}

module.exports = { safeResponseBank, getResponse, getIntentFallback };
