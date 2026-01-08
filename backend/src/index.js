import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectXRPL } from "./config/xrplClient.js";
import authRoutes from "./routes/auth.js";
import auctionRoutes from "./routes/auctions.js";
import { authenticateToken } from "./middleware/auth.js";

dotenv.config();

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
});

export default app;
