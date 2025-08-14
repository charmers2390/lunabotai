import express from "express";
import cors from "cors";
import { OpenAI } from "openai";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Middleware
app.use(cors());
app.use(express.json());

// Simple health check
app.get("/", (_req, res) => {
  res.send("LunaBot Responses API server is running.");
});

/**
 * POST /chat
 * Request body:
 *   { "id": "pmpt_...", "version": "1" }
 * or
 *   { "prompt": { "id": "...", "version": "1" } }
 */
app.post("/chat", async (req, res) => {
  try {
    let promptData;
    if (req.body.prompt) {
      promptData = req.body.prompt;
    } else if (req.body.id && req.body.version) {
      promptData = { id: req.body.id, version: req.body.version };
    } else {
      return res.status(400).json({ error: "Missing prompt data" });
    }

    const response = await openai.responses.create({
      prompt: promptData
    });

    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});
