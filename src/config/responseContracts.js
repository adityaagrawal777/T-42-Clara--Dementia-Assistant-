/**
 * Response Contracts
 * Defines the structural, tonal, and completeness requirements for each intent.
 * The Completeness Validator checks LLM output against these contracts.
 */

const responseContracts = {

    reassurance: {
        maxTokens: 100,
        minSentences: 1,
        maxSentences: 3,
        allowChunking: true,
        requiredParts: ["affirmation"],
        completionSignals: [".", "!", "💛", "🌸"],
        incompletionSignals: ["...", "—", ",", " and", " but", " so", " then"],
        promptDirective: `RESPONSE TYPE: REASSURANCE
- Respond with 1–2 short, warm sentences.
- Include at least one affirmation of safety or presence (e.g., "You are safe", "I am here").
- Use present tense only.
- Do NOT ask questions or introduce new information.`
    },

    grounding: {
        maxTokens: 150,
        minSentences: 2,
        maxSentences: 3,
        allowChunking: true,
        requiredParts: ["acknowledge", "anchor"],
        completionSignals: [".", "!", "💛", "🌸"],
        incompletionSignals: ["...", "—", ","],
        promptDirective: `RESPONSE TYPE: GROUNDING
- Respond with 2–3 short sentences.
- First: acknowledge the user's feeling gently.
- Second: provide a concrete sensory anchor (something they can see, hear, feel, or touch right now).
- Third (optional): reassure them.
- IDENTITY: If the user asks "who am I" or "do you know me", use their name from context to reassure them. If you don't know their name, acknowledge this warmly and politely ask them to share it with you.
- Use present tense. Do NOT reference time, dates, or schedules.
- Do NOT say "you should remember" or correct them.`
    },

    calming_story: {
        maxTokens: 500,
        minSentences: 7,
        maxSentences: 8,
        allowChunking: false,
        requiredParts: ["opening", "middle", "ending"],
        completionSignals: [".", "!", "💛", "🌸", "and everything was", "the end", "as the sun", "from that day", "and all was"],
        incompletionSignals: ["...", "—", " and then", "to be continued", "would you like", "shall I continue", "want to hear more"],
        promptDirective: `RESPONSE TYPE: CALMING STORY (Standard)
You must tell a complete, gentle story in exactly 7–8 sentences. This is very important.

STORY RULES:
- The story MUST have a clear beginning (2 sentences), a soft middle (3–4 sentences), and a warm, conclusive ending (2 sentences).
- Use EXACTLY 7–8 sentences. No fewer, no more.
- Use nature, warmth, light, and sensory details (flowers, birds, gentle rain, sunshine, warm kitchens, meadows).
- Do NOT use character names. Use descriptions instead: "a small bird", "a little cat", "a tiny rabbit."
- The story must feel FINISHED. The last sentence must be a gentle conclusion — the reader must feel the story is complete.
- Do NOT leave the story unfinished or cut it short.
- Do NOT say "would you like to hear more?" or "shall I continue?" — this IS the complete story.
- Do NOT include conflict, danger, suspense, sadness, or anything frightening.
- Do NOT start with "Once upon a time" — use a gentler opening like "There was once..." or "In a little garden..." or "One warm morning..."
- End with something peaceful: "...and everything was still and beautiful." or "...and the whole garden glowed with warmth. 💛"
- Tell the story as a single, uninterrupted block of text.
- Keep vocabulary simple and sentences short.`
    },

    calming_story_extended: {
        maxTokens: 1500,
        minSentences: 20,
        maxSentences: 30,
        allowChunking: false,
        requiredParts: ["opening", "middle", "ending"],
        completionSignals: [".", "!", "💛", "🌸", "and everything was", "the end", "as the sun", "from that day", "all was well", "drifted softly to sleep", "peacefully", "and so"],
        incompletionSignals: ["...", "—", " and then", "to be continued", "would you like", "shall I continue", "want to hear more"],
        promptDirective: `RESPONSE TYPE: CALMING STORY (Extended Bedtime Story)
You must tell a long, slow, detailed, gentle bedtime-style story in 20–30 sentences. This is very important.

STORY STRUCTURE:
- OPENING (4–5 sentences): Set the scene slowly. Describe the place, the light, the air, the sounds.
- MIDDLE (12–20 sentences): Unfold a gentle journey or discovery. Describe each moment with rich sensory detail.
- ENDING (4–5 sentences): Bring everything to a warm, peaceful close. The story must feel finished.

STORY RULES:
- Use 20–30 sentences. It must be immersive and calm.
- Use nature, warmth, and deep sensory details.
- Do NOT use character names. Use "a small bird", "a little cat", "a tiny rabbit".
- The story MUST be finished. Do not stop halfway.
- Tell the story as a single, uninterrupted block of text.
- Do NOT ask if they want to hear more or offer to continue.
- Keep vocabulary simple but the tone rich and soothing.`
    },

    emotional_validation: {
        maxTokens: 150,
        minSentences: 2,
        maxSentences: 3,
        allowChunking: true,
        requiredParts: ["mirror", "normalize"],
        completionSignals: [".", "!", "💛", "🌸"],
        incompletionSignals: ["...", "—", ","],
        promptDirective: `RESPONSE TYPE: EMOTIONAL VALIDATION
- Respond with 2–3 sentences.
- First: mirror/reflect the user's emotion gently ("That sounds really hard", "Missing someone you love is a deep feeling").
- Second: normalize the feeling ("It is okay to feel this way", "That feeling shows how much love there is").
- Third (optional): offer your presence ("I am right here with you").
- Do NOT try to cheer them up or offer silver linings.
- Do NOT suggest activities or distractions.
- Do NOT say "don't worry" or "it will be okay" — sit with the feeling.`
    },

    gentle_redirect: {
        maxTokens: 100,
        minSentences: 2,
        maxSentences: 2,
        allowChunking: true,
        requiredParts: ["acknowledge", "redirect"],
        completionSignals: [".", "!", "💛", "🌸"],
        incompletionSignals: ["...", "—"],
        promptDirective: `RESPONSE TYPE: GENTLE REDIRECT
- Respond with exactly 2 sentences.
- First: warmly validate their question or concern ("That's a really good question, dear").
- Second: gently redirect to their care team ("Your care team knows all about that — they are taking wonderful care of you").
- Do NOT actually answer medical, factual, or time-sensitive questions.
- Do NOT say "I can't help with that" — always redirect warmly.`
    },

    companionship: {
        maxTokens: 150,
        minSentences: 1,
        maxSentences: 3,
        allowChunking: true,
        requiredParts: ["engagement"],
        completionSignals: [".", "!", "?", "💛", "🌸"],
        incompletionSignals: ["...", "—"],
        promptDirective: `RESPONSE TYPE: COMPANIONSHIP
- Respond with 1–3 warm, conversational sentences.
- Be friendly, light, and present.
- If the user greeted you, greet them back warmly.
- If the user asked a question about you, answer within Clara's gentle persona.
- You may include a soft conversational cue but do NOT ask probing or personal questions.
- Keep it light and pleasant.`
    }
};

module.exports = responseContracts;
