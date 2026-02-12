/**
 * Safety Guard
 * Pre-response and post-response validation for dementia-safe interaction.
 * Rules are config-driven for clinical team editability.
 */

const { getResponse } = require("./safeResponseBank");

// === Pre-response patterns (user input scanning) ===

const CRISIS_PATTERNS = [
    /\b(kill\s*(my)?self)\b/i,
    /\b(want\s*to\s*die)\b/i,
    /\b(end\s*it\s*all)\b/i,
    /\bsuicid/i,
    /\b(hurt\s*(my)?self)\b/i,
    /\b(self[\s-]?harm)\b/i,
    /\b(don'?t\s*want\s*to\s*live)\b/i,
    /\b(no\s*reason\s*to\s*live)\b/i,
    /\b(better\s*off\s*dead)\b/i
];

const MEDICAL_PATTERNS = [
    /\b(what\s*(medicine|medication|pill|drug|dose))\b/i,
    /\b(should\s*i\s*take)\b/i,
    /\b(medical\s*advice)\b/i,
    /\b(diagnos[ei]s?)\b/i,
    /\b(treatment|prescription|symptom)/i,
    /\b(what('?s)?\s*wrong\s*with\s*me)\b/i
];

const IDENTITY_CONFUSION_PATTERNS = [
    /\bare\s*you\s*(my|a)\s*(daughter|son|mother|father|wife|husband|sister|brother|friend|nurse|doctor)/i,
    /\b(you'?re\s*(my|a)\s*(daughter|son|mother|father|wife|husband))/i
];

// === Post-response forbidden patterns (LLM output scanning) ===

const FORBIDDEN_OUTPUT_PATTERNS = [
    /\b(you\s*(already|just)\s*(asked|said|told|mentioned))\b/i,
    /\b(as\s*i\s*(mentioned|said|told))\b/i,
    /\b(like\s*i\s*said)\b/i,
    /\b(i\s*(already|just)\s*(told|said|mentioned|explained))\b/i,
    /\b(remember\s*when\s*i\s*said)\b/i,
    /\bdementia\b/i,
    /\bmemory\s*loss\b/i,
    /\bcognitive\s*(decline|impairment|issue)/i,
    /\bAlzheimer/i,
    /\bdiagnos[ei]s?\b/i,
    /\bmedication\b/i,
    /\bprescri(be|ption)\b/i,
    /\btreatment\s*plan\b/i,
    /\bdoctor\s*recommend/i,
    /\byou\s*should\s*(see|visit|call)\s*(a|your|the)\s*doctor/i,
    /\b(tomorrow|next\s*week|next\s*month|next\s*year|schedule|appointment)\b/i
];

class SafetyGuard {
    /**
     * Pre-response validation — scan user input before sending to LLM.
     * @returns {{ status: 'SAFE'|'REDIRECT'|'ESCALATE', category: string|null, safeResponse: string|null }}
     */
    validateInput(message, emotionResult) {
        const normalizedMsg = message.toLowerCase();

        // 1. Crisis detection (highest priority)
        if (emotionResult.isCrisis || CRISIS_PATTERNS.some(p => p.test(message))) {
            return {
                status: "ESCALATE",
                category: "crisis",
                severity: "critical",
                safeResponse: getResponse("crisis")
            };
        }

        // 2. High distress escalation
        if (emotionResult.distressScore > 0.85 && emotionResult.trajectory === "escalating") {
            return {
                status: "ESCALATE",
                category: "distress_threshold",
                severity: "high",
                safeResponse: getResponse("fearResponse")
            };
        }

        // 3. Medical questions
        if (MEDICAL_PATTERNS.some(p => p.test(message))) {
            return {
                status: "REDIRECT",
                category: "medical",
                severity: "low",
                safeResponse: getResponse("medicalRedirect")
            };
        }

        // 4. Identity confusion — not a redirect, but flag for context assembly
        if (IDENTITY_CONFUSION_PATTERNS.some(p => p.test(message))) {
            return {
                status: "SAFE",
                category: "identity_confusion",
                severity: null,
                safeResponse: null,
                flag: "identity_confusion"
            };
        }

        // 5. All clear
        return {
            status: "SAFE",
            category: null,
            severity: null,
            safeResponse: null
        };
    }

    /**
     * Post-response validation — scan LLM output before delivering to user.
     * @returns {{ valid: boolean, reason: string|null }}
     */
    validateOutput(response) {
        for (const pattern of FORBIDDEN_OUTPUT_PATTERNS) {
            if (pattern.test(response)) {
                return {
                    valid: false,
                    reason: `Forbidden pattern detected: ${pattern.toString()}`
                };
            }
        }

        // Check response length (too long is bad for dementia care)
        const wordCount = response.split(/\s+/).length;
        if (wordCount > 60) {
            return {
                valid: false,
                reason: `Response too long: ${wordCount} words (max 60)`
            };
        }

        // Check for overly complex language (rough heuristic: average word length)
        const avgWordLength = response.replace(/[^a-zA-Z\s]/g, "").split(/\s+/)
            .reduce((sum, w) => sum + w.length, 0) / wordCount;

        if (avgWordLength > 6.5) {
            return {
                valid: false,
                reason: `Language too complex: avg word length ${avgWordLength.toFixed(1)}`
            };
        }

        return { valid: true, reason: null };
    }
}

module.exports = new SafetyGuard();
