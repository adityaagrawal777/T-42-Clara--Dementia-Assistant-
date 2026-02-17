/**
 * Context Assembler
 * Builds the full LLM prompt from persona config, emotion directives,
 * memory fragments, caregiver context, and conversation window.
 */

const persona = require("./config/persona");

class ContextAssembler {
    /**
     * Build the complete message array for the LLM.
     * @param {string} userMessage - Current user message
     * @param {object} emotionResult - From EmotionAnalyzer
     * @param {object} memoryResult - From MemoryManager.query()
     * @param {object} safetyResult - From SafetyGuard.validateInput()
     * @param {object} [intentResult] - From IntentDetector.detect() (optional for backward compat)
     * @param {object} [storyContext] - Optional: { theme, storyLengthMode } for calming_story intents
     * @returns {Array} messages - Array of { role, content } for the LLM
     */
    build(userMessage, emotionResult, memoryResult, safetyResult, intentResult = null, storyContext = null) {
        const systemParts = [];

        // 1. Base persona
        systemParts.push(persona.basePrompt);

        // 2. Emotion-specific directive
        const emotionDirective = persona.emotionDirectives[emotionResult.emotion];
        if (emotionDirective) {
            systemParts.push(`\nCURRENT EMOTIONAL STATE:\n${emotionDirective}`);
        }

        // 3. Distress awareness
        if (emotionResult.distressScore > 0.5) {
            systemParts.push(
                `\nDISTRESS LEVEL: The user's distress is elevated (${Math.round(emotionResult.distressScore * 100)}%). ` +
                `Be especially gentle, warm, and brief. Prioritize making them feel safe above all else.`
            );
        }

        // 4. Trajectory awareness
        if (emotionResult.trajectory === "escalating") {
            systemParts.push(
                "\nEMOTIONAL TRAJECTORY: The user's distress has been increasing. " +
                "Focus on grounding and calming. Use the shortest, warmest possible responses."
            );
        } else if (emotionResult.trajectory === "de-escalating") {
            systemParts.push(
                "\nEMOTIONAL TRAJECTORY: The user is beginning to calm down. " +
                "Maintain warmth but you can be slightly more conversational."
            );
        }

        // 5. Repetition awareness
        if (memoryResult.isRepeat) {
            systemParts.push(`\n${persona.repetitionDirective}`);
        }

        // 6. Identity confusion flag
        if (safetyResult.flag === "identity_confusion") {
            systemParts.push(
                "\nIDENTITY NOTE: The user may be confusing you with a real person. " +
                "Do NOT harshly correct them. Gently and warmly clarify that you are Clara, " +
                "an AI companion here to help. Do not make them feel embarrassed."
            );
        }

        // 7. Caregiver context
        const cc = memoryResult.caregiverContext;
        if (cc && (cc.userName || cc.knownTopics?.length > 0 || cc.avoidTopics?.length > 0)) {
            let caregiverSection = "\nCAREGIVER-PROVIDED CONTEXT:";

            if (cc.userName) {
                caregiverSection += `\n- The user's preferred name is "${cc.userName}". Use it occasionally to make them feel known.`;
            }
            if (cc.knownTopics && cc.knownTopics.length > 0) {
                caregiverSection += `\n- Familiar topics the user enjoys: ${cc.knownTopics.join(", ")}. You may gently reference these if the conversation allows.`;
            }
            if (cc.avoidTopics && cc.avoidTopics.length > 0) {
                caregiverSection += `\n- Topics to AVOID (may cause distress): ${cc.avoidTopics.join(", ")}. Do NOT bring these up.`;
            }

            systemParts.push(caregiverSection);
        }

        // 8. Known anchors from conversation
        if (memoryResult.anchors && memoryResult.anchors.length > 0) {
            systemParts.push(
                `\nFAMILIAR ANCHORS from this conversation: ${memoryResult.anchors.join(", ")}. ` +
                `You may gently reference these to provide continuity, but do not force them into the conversation.`
            );
        }

        // --- NEW: Multi-session memory injection ---
        if (memoryResult.pastSessionsContext && memoryResult.pastSessionsContext.length > 0) {
            let memorySnippet = "\nCRITICAL: MEMORIES OF OUR PAST CONVERSATIONS (Prioritize if the user asks 'do you remember'):";

            memoryResult.pastSessionsContext.forEach((session, index) => {
                const logs = session.messages
                    .map(m => `${m.role === 'user' ? 'User' : 'Clara'}: ${m.content}`)
                    .join('\n');
                memorySnippet += `\n\n[Conversation ${index + 1}]:\n${logs}`;
            });

            memorySnippet += `\n\nINSTRUCTION: If the user asks what you talked about before, or asks 'do you remember what I told you', use the logs above to answer specifically. For example: "Last time we talked about [detail]" or "You told me you enjoy [hobby]". If they don't ask, keep this in your heart but don't bring it up unless it makes them feel safe.`;

            systemParts.push(memorySnippet);
        }

        // 9. Intent-specific directive (if intent detection is active)
        if (intentResult && intentResult.contract && intentResult.contract.promptDirective) {
            systemParts.push(`\n${intentResult.contract.promptDirective}`);
        }

        // 10. Story theme injection (for calming_story intents)
        if (storyContext && storyContext.theme) {
            const modeLabel = storyContext.storyLengthMode === "extended" ? "long, detailed bedtime" : "gentle, short";
            const interests = (memoryResult.caregiverContext?.knownTopics || []).join(", ");
            const interestSnippet = interests ? `- USER INTERESTS to weave into the story: ${interests}\n` : "";

            systemParts.push(
                `\nSTORY THEME SEED (use this as inspiration — do NOT copy it literally):\n` +
                `- Setting: ${storyContext.theme.label}\n` +
                `- Sensory details to weave in: ${storyContext.theme.sensoryHints}\n` +
                interestSnippet +
                `- Tone: ${modeLabel} story\n` +
                `- IMPORTANT: Make this story unique and fresh. Incorporate the user's interests gently into this setting. Do not repeat stories you have told before.`
            );
        }

        // Assemble final system prompt
        const systemPrompt = systemParts.join("\n");

        // Build messages array
        const messages = [
            { role: "system", content: systemPrompt }
        ];

        // Add conversation window (maintaining context)
        if (memoryResult.conversationWindow && memoryResult.conversationWindow.length > 0) {
            messages.push(...memoryResult.conversationWindow);
        }

        // Add current user message
        messages.push({ role: "user", content: userMessage });

        return messages;
    }
}

module.exports = new ContextAssembler();
