import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

/*
Health check route
*/
app.get("/", (req, res) => {
  res.json({ status: "API running" });
});

/*
MCP endpoint
*/
app.post("/mcp", async (req, res) => {
  const { method, id, params } = req.body;

  /*
  tools/list
  */
  if (method === "tools/list") {
    return res.json({
      jsonrpc: "2.0",
      id: id ?? null,
      result: {
        tools: [
          {
            name: "analyze_feedback",
            description: "Analyze tenant feedback and return sentiment and priority",
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
  tools/call
  */
  if (method === "tools/call") {
    const toolName = params?.name;
    const args = params?.arguments;

    if (toolName === "analyze_feedback") {
      const message = args?.message || "";

      // Simple demo analysis logic
      let sentiment = "Neutral";
      let priority = "Medium";

      const text = message.toLowerCase();

      if (text.includes("bad") || text.includes("broken") || text.includes("complaint")) {
        sentiment = "Negative";
        priority = "High";
      }

      if (text.includes("good") || text.includes("great") || text.includes("nice")) {
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
  unknown method
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