/**
 * Knowledge Extractor
 * Uses the LLM to extract persistent facts about the user from an exchange.
 */

const llmClient = require("./llmClient");

class KnowledgeExtractor {
    /**
     * Extract new facts about the user from a single turn.
     * @param {string} userMessage
     * @param {string} claraReply
     * @returns {Promise<object|null>} - New facts to add to caregiver context, or null
     */
    async extract(userMessage, claraReply) {
        const prompt = `You are a knowledge extraction assistant for "Clara", an AI for dementia care.
Analyze the following exchange and identify any PERSISTENT facts about the user that Clara should remember.

EXCHANGE:
User: "${userMessage}"
Clara: "${claraReply}"

FACT CATEGORIES:
- Preferred Name (if they explicitly state it)
- Hobbies & Interests
- Family & Loved ones mentioned
- Favorite foods/places/memories
- Topics they find comforting
- Topics they find distressing (mark as "avoid")

INSTRUCTIONS:
- Return ONLY a JSON object with any new found information.
- If no new persistent facts are found, return an empty object {}.
- Do NOT include fleeting emotions or temporary states.
- Be concise.

EXAMPLE OUTPUT:
{ "userName": "Alice", "knownTopics": ["gardening", "her cat Muffin"], "avoidTopics": ["the hospital"] }`;

        try {
            const result = await llmClient.generate([
                { role: "system", content: prompt }
            ], 200);

            // Attempt to parse JSON from result
            const jsonMatch = result.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return null;
        } catch (e) {
            console.error("[KnowledgeExtractor] Extraction failed:", e.message);
            return null;
        }
    }

    /**
     * Merge new knowledge into existing caregiver context.
     */
    merge(existing, discovered) {
        if (!discovered) return existing;

        const merged = { ...existing };

        if (discovered.userName && !merged.userName) {
            merged.userName = discovered.userName;
        }

        if (discovered.knownTopics && Array.isArray(discovered.knownTopics)) {
            const set = new Set(merged.knownTopics || []);
            discovered.knownTopics.forEach(t => set.add(t));
            merged.knownTopics = Array.from(set);
        }

        if (discovered.avoidTopics && Array.isArray(discovered.avoidTopics)) {
            const set = new Set(merged.avoidTopics || []);
            discovered.avoidTopics.forEach(t => set.add(t));
            merged.avoidTopics = Array.from(set);
        }

        return merged;
    }
}

module.exports = new KnowledgeExtractor();
