import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

/* Health check */
app.get("/", (req, res) => {
  res.json({ status: "Tenant Insights MCP server running" });
});

app.get("/.well-known/openai-apps-challenge", (req, res) => {
  res.type("text/plain");
  res.send("TTtakprO69cDepChf1RsQYg7Nh29B27cDuNfkI2QRDk");
});
/* MCP endpoint */
app.post("/mcp", (req, res) => {
  try {
    const { method, id, params } = req.body || {};

    /* 1️⃣ MCP Initialize (required for scanners) */
    if (method === "initialize") {
      return res.json({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: "tenant-insights",
            version: "1.0.0"
          }
        }
      });
    }

    /* 2️⃣ Tools list */
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

    /* 3️⃣ Tool execution */
    if (method === "tools/call") {
      const tool = params?.name;
      const message = params?.arguments?.message || "";

      let sentiment = "Neutral";
      let priority = "Medium";

      const text = message.toLowerCase();

      if (
        text.includes("leak") ||
        text.includes("broken") ||
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

    /* Unknown method */
    return res.json({
      jsonrpc: "2.0",
      id,
      error: {
        code: -32601,
        message: "Method not found"
      }
    });

  } catch (err) {
    console.error(err);

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