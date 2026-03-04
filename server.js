import express from "express";
import cors from "cors";
import { randomUUID } from "crypto";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "API running" });
});

/*
   MCP endpoint
*/
app.post("/mcp", async (req, res) => {
  const { method, params } = req.body;

  if (method === "tools/list") {
    return res.json({
      tools: [
        {
          name: "analyze_feedback",
          description: "Analyze tenant feedback and return sentiment and priority",
          inputSchema: {
            type: "object",
            properties: {
              message: { type: "string" }
            },
            required: ["message"]
          }
        }
      ]
    });
  }

  if (method === "tools/call") {
    const { name, arguments: args } = params;

    if (name === "analyze_feedback") {
      const message = args.message;

      // Basic demo AI logic (replace later with OpenAI call)
      return res.json({
        content: [
          {
            type: "text",
            text: `Feedback received: "${message}". Sentiment: Neutral. Priority: Medium.`
          }
        ]
      });
    }
  }

  res.status(400).json({ error: "Invalid MCP request" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});