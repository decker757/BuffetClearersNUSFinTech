import jwt from "jsonwebtoken";
import { verify as verifyRippleSignature, deriveAddress } from "ripple-keypairs";
import { storeChallenge, getChallenge, deleteChallenge } from "../utils/challengeStore.js";

// JWT secret (should be in .env in production)
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Generate authentication challenge
export function generateChallenge(req, res) {
  const { address } = req.body;

  if (!address) {
    return res.status(400).json({ error: "Wallet address is required" });
  }

  // Generate random challenge message
  const challenge = `Verify ownership of ${address}\nTimestamp: ${Date.now()}\nNonce: ${Math.random().toString(36).substring(7)}`;

  // Store challenge with 5-minute expiration
  storeChallenge(address, challenge);

  res.json({ challenge });
}

// Verify signature and issue JWT token
export function verifySignature(req, res) {
  const { address, signature, publicKey } = req.body;

  if (!address || !signature || !publicKey) {
    return res.status(400).json({ error: "Address, signature, and publicKey are required" });
  }

  const stored = getChallenge(address);

  if (!stored) {
    return res.status(400).json({ error: "Challenge not found. Request a new challenge." });
  }

  if (stored.expires < Date.now()) {
    deleteChallenge(address);
    return res.status(400).json({ error: "Challenge expired. Request a new challenge." });
  }

  try {
    // Verify that the publicKey matches the address
    const derivedAddress = deriveAddress(publicKey);

    if (derivedAddress !== address) {
      return res.status(401).json({ error: "Public key does not match address" });
    }

    // Convert challenge to hex format for verification
    const messageHex = Buffer.from(stored.challenge, 'utf8').toString('hex').toUpperCase();

    // Verify signature using public key
    const isValid = verifyRippleSignature(messageHex, signature, publicKey);

    if (isValid) {
      // Clear the used challenge
      deleteChallenge(address);

      // Generate JWT token
      const token = jwt.sign(
        { address, timestamp: Date.now() },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.json({
        success: true,
        token,
        address,
        message: "Authentication successful",
      });
    } else {
      res.status(401).json({ error: "Invalid signature" });
    }
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({ error: "Signature verification failed" });
  }
}
