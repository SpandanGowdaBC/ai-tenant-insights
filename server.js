import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

/* Root health check */
app.get("/", (req, res) => {
  res.json({ status: "Tenant Insights MCP running" });
});

/* MCP endpoint health */
app.get("/mcp", (req, res) => {
  res.json({ status: "MCP endpoint active" });
});

/* MCP main endpoint */
app.post("/mcp", (req, res) => {
  try {

    const body = req.body || {};
    const method = body.method;
    const id = body.id ?? null;
    const params = body.params || {};

    /*
    TOOL LIST
    */
    if (method === "tools/list") {
      return res.json({
        jsonrpc: "2.0",
        id,
        result: {
          tools: [
            {
              name: "analyze_feedback",
              description: "Analyze tenant feedback sentiment and urgency",
              inputSchema: {
                type: "object",
                properties: {
                  message: {
                    type: "string",
                    description: "Tenant feedback text"
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
    TOOL EXECUTION
    */
    if (method === "tools/call") {

      const tool = params.name;
      const args = params.arguments || {};
      const message = args.message || "";

      let sentiment = "Neutral";
      let priority = "Medium";

      const text = message.toLowerCase();

      if (text.includes("broken") || text.includes("leak") || text.includes("complaint")) {
        sentiment = "Negative";
        priority = "High";
      }

      if (text.includes("good") || text.includes("great") || text.includes("nice")) {
        sentiment = "Positive";
        priority = "Low";
      }

      return res.json({
        jsonrpc: "2.0",
        id,
        result: {
          content: [
            {
              type: "text",
              text: `Feedback: "${message}" | Sentiment: ${sentiment} | Priority: ${priority}`
            }
          ]
        }
      });
    }

    /* Scanner sometimes calls without method */
    if (!method) {
      return res.json({
        jsonrpc: "2.0",
        id,
        result: {}
      });
    }

    return res.json({
      jsonrpc: "2.0",
      id,
      error: {
        code: -32601,
        message: "Method not found"
      }
    });

  } catch (err) {
    console.error("MCP ERROR:", err);

    return res.json({
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32603,
        message: "Internal server error"
      }
    });
  }
});

/* Start server */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});