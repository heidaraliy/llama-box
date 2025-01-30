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

// Keep track of active Ollama requests
const activeRequests = new Map<string, any>();

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

// basic test route.
app.get("/", (req: Request, res: Response) => {
  res.send("Llama-box backend is running!");
});

// the chat route to handle requests from the frontend.
app.post("/chat", async (req: Request, res: Response) => {
  const requestId = Date.now().toString();
  let ollamaRequest: any = null;

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

    ollamaRequest = await axios.post(
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

    // Store the request
    activeRequests.set(requestId, ollamaRequest);

    // Handle client disconnection
    req.on("close", () => {
      if (ollamaRequest) {
        try {
          // Destroy the stream which will trigger Ollama to stop generation
          ollamaRequest.data.destroy();
          activeRequests.delete(requestId);
        } catch (error) {
          console.error("Error cleaning up request:", error);
        }
      }
      res.end();
    });

    // Send the requestId to the client
    res.write(`data: ${JSON.stringify({ requestId })}\n\n`);

    let isThinking = false;
    let thinkingBuffer = "";
    let responseBuffer = "";

    ollamaRequest.data.on("data", (chunk: Buffer) => {
      const lines = chunk.toString().split("\n\n").filter(Boolean);

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
              // First split into paragraphs
              .split(/\n\s*\n/)
              .filter(Boolean)
              .map((para) => {
                // Preserve list formatting by not collapsing certain patterns
                if (
                  para.match(/^(\d+\.|\-|\+|\*)\s/) || // Numbered lists or bullet points
                  para.trim().startsWith("```") || // Code blocks
                  para.trim().startsWith(">") // Blockquotes
                ) {
                  return para.trim();
                }
                // For regular paragraphs, collapse newlines
                return para.replace(/\n/g, " ").trim();
              })
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

    ollamaRequest.data.on("end", () => {
      res.write("data: [DONE]\n\n");
      res.end();
    });

    ollamaRequest.data.on("error", (err: any) => {
      console.error("Ollama streaming error:", err);
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    });
  } catch (error: any) {
    activeRequests.delete(requestId);
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

// Update the cancel endpoint
app.post("/cancel", async (req: Request, res: Response) => {
  try {
    // Clean up any active requests by destroying their streams
    for (const [_, request] of activeRequests) {
      request.data.destroy();
    }
    activeRequests.clear();

    res.json({ success: true });
  } catch (error) {
    console.error("Error cancelling requests:", error);
    res.status(500).json({ error: "Failed to cancel requests" });
  }
});

// Add this near your other endpoints
app.get("/health", async (_req: Request, res: Response) => {
  try {
    await axios.get(`${OLLAMA_SERVER_URL}/api/tags`);
    res.status(200).json({ status: "connected" });
  } catch (error) {
    res.status(503).json({ status: "disconnected" });
  }
});

// spin up the server.
app.listen(PORT, () => {
  console.log(`Backend server listening on port ${PORT}`);
});
