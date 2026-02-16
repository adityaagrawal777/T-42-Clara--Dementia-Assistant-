/**
 * Clara Auth Manager
 * Handles user authentication, password hashing, and JWT tokens.
 */

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const userQueries = require("./db/queries/userQueries");
const logger = require("./logger");

const JWT_SECRET = process.env.JWT_SECRET || "clara-heart-secret-keep-it-safe";
const JWT_EXPIRES_IN = "7d";

class AuthManager {
    /**
     * Register a new user.
     * @param {string} email
     * @param {string} password
     * @param {string} displayName
     * @returns {object} { user, token }
     */
    async register(email, password, displayName) {
        // Check if user already exists
        const existing = userQueries.getUserByEmail(email);
        if (existing) {
            throw new Error("A user with this email already exists.");
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);
        const userId = uuidv4();
        const now = new Date().toISOString();

        // Insert user
        userQueries.insertAuthUser(userId, email, passwordHash, displayName, now);

        const user = { user_id: userId, email, display_name: displayName };
        const token = this.generateToken(user);

        logger.system(`New user registered: ${email}`);
        return { user, token };
    }

    /**
     * Login an existing user.
     * @param {string} email
     * @param {string} password
     * @returns {object} { user, token }
     */
    async login(email, password) {
        const user = userQueries.getUserByEmail(email);
        if (!user || !user.password_hash) {
            throw new Error("Invalid email or password.");
        }

        // Verify password
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            throw new Error("Invalid email or password.");
        }

        // Update last active
        userQueries.updateLastActive(user.user_id, new Date().toISOString());

        const userData = { user_id: user.user_id, email: user.email, display_name: user.display_name };
        const token = this.generateToken(userData);

        logger.system(`User logged in: ${email}`);
        return { user: userData, token };
    }

    /**
     * Generate a JWT token for a user.
     */
    generateToken(user) {
        return jwt.sign(
            { userId: user.user_id, email: user.email, displayName: user.display_name },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );
    }

    /**
     * Verify a JWT token.
     */
    verifyToken(token) {
        try {
            return jwt.verify(token, JWT_SECRET);
        } catch (err) {
            return null;
        }
    }

    /**
     * Middleware to protect routes.
     */
    authenticateRequest(req, res, next) {
        const token = req.cookies.clara_token || req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({ error: "Authentication required." });
        }

        const decoded = this.verifyToken(token);
        if (!decoded) {
            return res.status(401).json({ error: "Invalid or expired token." });
        }

        req.user = decoded;
        next();
    }
}

module.exports = new AuthManager();
