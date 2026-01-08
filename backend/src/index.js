// CRITICAL: This MUST be the first import to load environment variables
import "./init.js";

// Now import everything else - env vars are now loaded
import express from "express";
import cors from "cors";
import { connectXRPL } from "./config/xrplClient.js";
import authRoutes from "./routes/auth.js";
import auctionRoutes from "./routes/auctions.js";
import nftRoutes from "./routes/nft.js";
import { authenticateToken } from "./middleware/auth.js";
import { startAuctionScheduler } from "./jobs/auctionScheduler.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get("/", (req, res) => {
  res.send("XRPL Invoice Auction Backend Running");
});

// Auth routes
app.use("/auth", authRoutes);

// Auction routes
app.use("/", auctionRoutes);

// NFT routes
app.use("/nft", nftRoutes);

// Protected route example
app.get("/protected", authenticateToken, (req, res) => {
  res.json({
    message: "This is a protected route",
    user: req.user
  });
});

// XRPL connection route
app.post("/connect-xrpl", async (req, res) => {
  await connectXRPL();
  res.json({ status: "connected" });
});

const PORT = process.env.PORT || 6767;

app.listen(PORT, async () => {
  await connectXRPL();
  console.log(`Backend running on http://localhost:${PORT}`);

  // Start the auction finalization scheduler
  startAuctionScheduler();
});

export default app;
