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

// Maintain map of active transport sessions
const transports = new Map();

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
  // Construct the message URL relative to the incoming request to handle proxy paths
  const protocol = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  // Use the exact path /message regardless of where the /mcp request came from
  const messageUrl = `${protocol}://${host}/message`;

  const transport = new SSEServerTransport(messageUrl, res);
  // Store the transport using its generated sessionId
  transports.set(transport.sessionId, transport);

  // Clean up when connection closes
  res.on("close", () => {
    transports.delete(transport.sessionId);
  });

  await server.connect(transport);
});

app.post("/message", express.json(), async (req, res) => {
  // Extract sessionId from the query parameter 
  const sessionId = req.query.sessionId;

  if (!sessionId) {
    return res.status(400).send("Session ID is required in query parameters.");
  }

  const transport = transports.get(sessionId);

  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(404).send("Session not found or connection not established");
  }
});

/* Start server */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});