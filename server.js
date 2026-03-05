import express from "express";
import cors from "cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";

const app = express();

app.use(cors());

/* Health check */
app.get("/", (req, res) => {
  res.json({ status: "Tenant Insights MCP server running" });
});

app.get("/.well-known/openai-apps-challenge", (req, res) => {
  res.type("text/plain");
  res.send("TTtakprO69cDepChf1RsQYg7Nh29B27cDuNfkI2QRDk");
});

// Create MCP Server
const server = new McpServer({
  name: "tenant-insights",
  version: "1.0.0"
});

// Global state for transport session
let transport;

server.tool(
  "analyze_feedback",
  "Analyze tenant feedback sentiment and urgency",
  {
    message: z.string().describe("Tenant feedback message")
  },
  async ({ message }) => {
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
    } else if (
      text.includes("good") ||
      text.includes("great") ||
      text.includes("nice")
    ) {
      sentiment = "Positive";
      priority = "Low";
    }

    return {
      content: [
        {
          type: "text",
          text: `Feedback: "${message}" | Sentiment: ${sentiment} | Priority: ${priority}`
        }
      ]
    };
  }
);

app.get("/mcp", async (req, res) => {
  transport = new SSEServerTransport("/message", res);
  await server.connect(transport);
});

app.post("/message", express.json(), async (req, res) => {
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(503).send("SSE connection not established");
  }
});

/* Start server */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});