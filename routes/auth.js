/**
 * Auth Routes
 * POST /api/v1/auth/register
 * POST /api/v1/auth/login
 * POST /api/v1/auth/logout
 * GET  /api/v1/auth/me
 */

const express = require("express");
const router = express.Router();
const authManager = require("../src/auth");

// Register
router.post("/register", async (req, res) => {
    try {
        const { email, password, displayName } = req.body;
        if (!email || !password || !displayName) {
            return res.status(400).json({ error: "All fields are required." });
        }

        const { user, token } = await authManager.register(email, password, displayName);

        // Set cookie
        res.cookie("clara_token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production"
        });

        res.status(201).json({ user });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Login
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required." });
        }

        const { user, token } = await authManager.login(email, password);

        // Set cookie
        res.cookie("clara_token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production"
        });

        res.json({ user });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Logout
router.post("/logout", (req, res) => {
    res.clearCookie("clara_token");
    res.json({ message: "Logged out successfully." });
});

// Get current user (verify token)
router.get("/me", (req, res) => {
    const token = req.cookies.clara_token;
    if (!token) {
        return res.status(401).json({ error: "Not logged in." });
    }

    const decoded = authManager.verifyToken(token);
    if (!decoded) {
        res.clearCookie("clara_token");
        return res.status(401).json({ error: "Invalid session." });
    }

    res.json({ user: decoded });
});

module.exports = router;
