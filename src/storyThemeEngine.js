/**
 * Story Theme Engine
 * Selects a random, dementia-safe story theme.
 * Tracks last-used themes per session to prevent consecutive repetition.
 *
 * Themes are curated to be:
 * - Nature/comfort-based
 * - Free of conflict, danger, or sadness
 * - Rich in sensory detail prompts
 * - Familiar and grounding
 */

// Curated safe theme list — every theme generates warm, gentle imagery
const SAFE_THEMES = [
    {
        id: "garden_butterflies",
        label: "a small garden full of butterflies and golden flowers",
        sensoryHints: "warm sunshine, soft petals, fluttering wings"
    },
    {
        id: "cottage_rain",
        label: "a cozy cottage on a rainy afternoon with a warm fireplace",
        sensoryHints: "rain on the roof, crackling fire, warm blankets"
    },
    {
        id: "meadow_stream",
        label: "a sunny meadow beside a gentle stream",
        sensoryHints: "sparkling water, wildflowers, birdsong"
    },
    {
        id: "bakery_morning",
        label: "a warm bakery on a quiet morning with fresh bread baking",
        sensoryHints: "warm dough, golden crust, sweet cinnamon"
    },
    {
        id: "forest_path",
        label: "a peaceful walk along a quiet forest path in autumn",
        sensoryHints: "golden leaves, soft earth, gentle breeze"
    },
    {
        id: "seaside_sunset",
        label: "a calm seaside beach at sunset with gentle waves",
        sensoryHints: "warm sand, soft waves, orange and pink sky"
    },
    {
        id: "starry_night",
        label: "a still night under a sky full of softly glowing stars",
        sensoryHints: "cool air, twinkling stars, quiet stillness"
    },
    {
        id: "cat_windowsill",
        label: "a little cat napping on a sunny windowsill",
        sensoryHints: "warm fur, soft purring, golden sunlight"
    },
    {
        id: "pond_lilies",
        label: "a quiet pond with lily pads and a tiny frog",
        sensoryHints: "still water, green leaves, dragonfly wings"
    },
    {
        id: "orchard_harvest",
        label: "a sunny orchard with ripe apples and a gentle breeze",
        sensoryHints: "sweet fruit, rustling leaves, warm sunlight"
    },
    {
        id: "robin_nest",
        label: "a small robin building a cozy nest in a blooming tree",
        sensoryHints: "soft feathers, tiny twigs, cherry blossoms"
    },
    {
        id: "lavender_field",
        label: "a sprawling lavender field humming with bees on a warm day",
        sensoryHints: "purple rows, sweet fragrance, buzzing bees"
    },
    {
        id: "snow_cabin",
        label: "a snowy morning outside a warm cabin with hot cocoa",
        sensoryHints: "soft snow, warm mug, gentle woodsmoke"
    },
    {
        id: "turtle_journey",
        label: "a tiny turtle making its way slowly across a sunlit meadow",
        sensoryHints: "warm grass, slow steps, patient journey"
    },
    {
        id: "windchime_porch",
        label: "a breezy porch with soft wind chimes and a rocking chair",
        sensoryHints: "gentle tinkling, creaking wood, afternoon light"
    },
    {
        id: "duckling_pond",
        label: "a family of ducklings paddling across a quiet pond",
        sensoryHints: "rippling water, tiny quacks, soft down feathers"
    },
    {
        id: "rainbow_after_rain",
        label: "a gentle rainbow appearing after a soft spring rain",
        sensoryHints: "glistening drops, bright colors, fresh air"
    },
    {
        id: "teacup_garden",
        label: "a peaceful afternoon sipping tea in a small flower garden",
        sensoryHints: "warm teacup, fragrant blooms, dappled shade"
    }
];

const narrativeUsageQueries = require("./db/queries/narrativeUsageQueries");

// Track last used theme per session (in-memory cache for speed, fallback to DB)
const sessionThemeCache = new Map();

class StoryThemeEngine {

    /**
     * Select a random theme, avoiding the last-used theme for this session.
     * @param {string} sessionId
     * @returns {{ id: string, label: string, sensoryHints: string }}
     */
    selectTheme(sessionId) {
        let lastThemeId = sessionThemeCache.get(sessionId);

        // If not in cache, try to fetch the most recent one from DB
        if (!lastThemeId) {
            try {
                // Ensure stmts are prepared (the DB should already be init by server.js)
                // narrativeUsageQueries.prepare() is called by MemoryManager.prepareStatements()
                const used = narrativeUsageQueries.getSessionNarratives(sessionId);
                if (used && used.length > 0) {
                    lastThemeId = used[used.length - 1];
                }
            } catch (err) {
                // Silence DB errors here, just proceed with no history
            }
        }

        // Filter out the last-used theme to prevent consecutive repetition
        const available = lastThemeId
            ? SAFE_THEMES.filter(t => t.id !== lastThemeId)
            : SAFE_THEMES;

        // Random selection from available pool
        const selected = available[Math.floor(Math.random() * available.length)];

        // Update cache
        sessionThemeCache.set(sessionId, selected.id);

        return {
            id: selected.id,
            label: selected.label,
            sensoryHints: selected.sensoryHints
        };
    }

    /**
     * Get the full theme list (for testing/inspection).
     */
    getThemeCount() {
        return SAFE_THEMES.length;
    }

    /**
     * Clear session theme cache.
     * @param {string} sessionId
     */
    clearSession(sessionId) {
        sessionThemeCache.delete(sessionId);
    }
}

module.exports = new StoryThemeEngine();
