import dotenv from "dotenv";
import express, { Request, Response } from "express";
import OpenAI from "openai";
import cors from "cors";

dotenv.config();

if (!process.env.OPENAI_API_KEY) {
  console.error("Error: OPENAI_API_KEY is not set in .env");
  process.exit(1);
}

const app = express();
const port = 5001;

const allowedOrigins = [
  /^http:\/\/localhost(:\d+)?$/,
  /\.netlify\.app$/,
  /\.onrender\.com$/,
];
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MAX_HISTORY = 20;

const SYSTEM_PROMPT =
  "You are a helpful, concise assistant. Answer clearly and directly.";

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", model: "gpt-3.5-turbo" });
});

app.post("/chat", async (req: Request, res: Response) => {
  const { messages } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "messages must be a non-empty array" });
    return;
  }

  const invalid = messages.some(
    (m) =>
      typeof m !== "object" ||
      !["user", "assistant"].includes(m.role) ||
      typeof m.content !== "string" ||
      m.content.trim() === ""
  );

  if (invalid) {
    res.status(400).json({
      error: "Each message must have role ('user' | 'assistant') and content",
    });
    return;
  }

  const recentMessages = messages.slice(-MAX_HISTORY);

  const thread: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...recentMessages,
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: thread,
    });

    const reply = completion.choices[0].message;

    res.status(200).json({
      role: reply.role,
      content: reply.content,
    });
  } catch (err) {
    if (err instanceof OpenAI.APIError) {
      console.error(`OpenAI ${err.status} — ${err.message}`);
      res.status(err.status ?? 500).json({ error: err.message });
    } else {
      console.error("Unexpected error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
