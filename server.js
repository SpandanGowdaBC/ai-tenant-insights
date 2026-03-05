import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

/*
Health check
*/
app.get("/", (req, res) => {
  res.json({ status: "Tenant Insights MCP running" });
});

/*
MCP endpoint GET (scanner check)
*/
app.get("/mcp", (req, res) => {
  res.json({
    status: "MCP endpoint active"
  });
});

/*
MCP endpoint POST
*/
app.post("/mcp", async (req, res) => {
  const { jsonrpc, method, id, params } = req.body;

  if (!method) {
    return res.status(400).json({
      jsonrpc: "2.0",
      id: id ?? null,
      error: {
        code: -32600,
        message: "Invalid Request"
      }
    });
  }

  /*
  Tool list
  */
  if (method === "tools/list") {
    return res.json({
      jsonrpc: "2.0",
      id: id ?? null,
      result: {
        tools: [
          {
            name: "analyze_feedback",
            description: "Analyze tenant feedback and determine sentiment and urgency",
            inputSchema: {
              type: "object",
              properties: {
                message: {
                  type: "string",
                  description: "Tenant feedback message"
                }
              },
              required: ["message"]
            }
          }
        ]
      }
    });
  }

  /*
  Tool execution
  */
  if (method === "tools/call") {
    const tool = params?.name;
    const args = params?.arguments || {};

    if (tool === "analyze_feedback") {
      const message = args.message || "";

      let sentiment = "Neutral";
      let priority = "Medium";

      const text = message.toLowerCase();

      if (
        text.includes("broken") ||
        text.includes("leak") ||
        text.includes("complaint")
      ) {
        sentiment = "Negative";
        priority = "High";
      }

      if (
        text.includes("good") ||
        text.includes("great") ||
        text.includes("nice")
      ) {
        sentiment = "Positive";
        priority = "Low";
      }

      return res.json({
        jsonrpc: "2.0",
        id: id ?? null,
        result: {
          content: [
            {
              type: "text",
              text: `Feedback: "${message}"\nSentiment: ${sentiment}\nPriority: ${priority}`
            }
          ]
        }
      });
    }
  }

  /*
  Unknown method
  */
  return res.status(400).json({
    jsonrpc: "2.0",
    id: id ?? null,
    error: {
      code: -32601,
      message: "Method not found"
    }
  });
});

/*
Start server
*/
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});