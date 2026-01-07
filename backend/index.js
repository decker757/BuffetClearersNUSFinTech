import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectXRPL } from "./xrplClient.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("XRPL Invoice Auction Backend Running");
});

app.post("/connect-xrpl", async (req, res) => {
  await connectXRPL();
  res.json({ status: "connected" });
});

const PORT = 6767;
app.listen(PORT, async () => {
  await connectXRPL();
  console.log(`Backend running on http://localhost:${PORT}`);
});
