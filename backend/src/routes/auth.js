import express from "express";
import { generateChallenge, verifySignature } from "../controllers/authController.js";

const router = express.Router();

// POST /auth/challenge - Request authentication challenge
router.post("/challenge", generateChallenge);

// POST /auth/verify - Verify signature and get JWT token
router.post("/verify", verifySignature);

export default router;
