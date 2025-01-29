import express, { Request, Response } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import axios from "axios";
import { exec } from "child_process";
import util from "util";

const app = express();
const PORT = process.env.PORT || 3001;

// when forking for the first time, adjust to match your actual Ollama server URL/port.
const OLLAMA_SERVER_URL = "http://localhost:11434";

const execAsync = util.promisify(exec);

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

// basic test route.
app.get("/", (req: Request, res: Response) => {
  res.send("Llama-box backend is running!");
});

// the chat route to handle requests from the frontend.
app.post("/chat", async (req: Request, res: Response) => {
  try {
    const { prompt, context, modelName } = req.body;

    // Set headers for SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const fullPrompt = `
You are a helpful AI assistant.

Context:
${context || ""}

User's prompt:
${prompt}
    `;

    const response = await axios.post(
      `${OLLAMA_SERVER_URL}/api/generate`,
      {
        prompt: fullPrompt,
        model: modelName || "llama3.2:latest",
        stream: true,
      },
      {
        responseType: "stream",
      }
    );

    let isThinking = false;
    let thinkingBuffer = "";
    let responseBuffer = "";

    // Handle client disconnection
    req.on("close", () => {
      response.data.destroy();
      res.end();
    });

    response.data.on("data", (chunk: Buffer) => {
      const lines = chunk.toString().split("\n").filter(Boolean);

      lines.forEach((line) => {
        try {
          const parsed = JSON.parse(line);

          if (parsed.response) {
            if (!isThinking && parsed.response.includes("<think>")) {
              isThinking = true;
              thinkingBuffer = "";
              // Skip the initial <think> tag
              const afterThinkTag = parsed.response.split("<think>")[1] || "";
              if (afterThinkTag) {
                thinkingBuffer = afterThinkTag;
              }
            } else if (isThinking) {
              if (parsed.response.includes("</think>")) {
                // Handle the end of thinking
                const [remainingThinking, afterThink] =
                  parsed.response.split("</think>");
                thinkingBuffer += remainingThinking;
                isThinking = false;
                if (afterThink) {
                  responseBuffer = afterThink.trim();
                }
              } else {
                thinkingBuffer += parsed.response;
              }
            } else {
              responseBuffer += parsed.response;
            }

            // Format thinking text with proper paragraphs
            const formattedThinking = thinkingBuffer
              .split(/\n\s*\n/)
              .filter(Boolean)
              .map((para) => para.replace(/\n/g, " ").trim())
              .join("\n\n");

            // Send the chunk with a type indicator
            res.write(
              `data: ${JSON.stringify({
                type: isThinking ? "thinking" : "response",
                content: parsed.response,
                buffer: isThinking ? formattedThinking : responseBuffer,
              })}\n\n`
            );
          }
        } catch (e) {
          console.error("Error parsing chunk:", e);
        }
      });
    });

    response.data.on("end", () => {
      res.write("data: [DONE]\n\n");
      res.end();
    });

    response.data.on("error", (err: any) => {
      console.error("Ollama streaming error:", err);
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    });
  } catch (error: any) {
    console.error("Error calling Ollama:", error.message);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

// Add this new endpoint
app.get("/models", async (_req: Request, res: Response) => {
  try {
    const { stdout } = await execAsync("ollama list");

    // Parse the output into structured data
    const lines = stdout.split("\n").slice(1); // Skip header
    const models = lines
      .filter((line) => line.trim())
      .map((line) => {
        const [name] = line.split(/\s+/);
        return name;
      });

    res.json({ models });
  } catch (error: any) {
    console.error("Error fetching models:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// spin up the server.
app.listen(PORT, () => {
  console.log(`Backend server listening on port ${PORT}`);
});
