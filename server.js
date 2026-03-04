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
  const { id, method, params } = req.body;

  // Required JSON-RPC response wrapper
  const respond = (result) => {
    res.json({
      jsonrpc: "2.0",
      id: id ?? null,
      result
    });
  };

  if (method === "tools/list") {
    return respond({
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

      return respond({
        content: [
          {
            type: "text",
            text: `Feedback received: "${message}". Sentiment: Neutral. Priority: Medium.`
          }
        ]
      });
    }
  }

  res.status(400).json({
    jsonrpc: "2.0",
    id: id ?? null,
    error: {
      code: -32601,
      message: "Method not found"
    }
  });
});