import express from "express";
import cors from "cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";

const app = express();

app.use(cors());

// Serve frontend files
app.use(express.static("public"));

/* Root endpoint fallback */
app.get("/", (req, res) => {
  res.sendFile(process.cwd() + "/public/index.html");
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
  {
    description: "Analyze tenant feedback sentiment and urgency",
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
      destructiveHint: false
    }
  },
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
  const transport = new SSEServerTransport("/message", res);
  // Store the transport using its generated sessionId
  transports.set(transport.sessionId, transport);

  // Clean up when connection closes
  res.on("close", () => {
    transports.delete(transport.sessionId);
  });

  await server.connect(transport);
});

app.post("/message", async (req, res) => {
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