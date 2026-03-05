import express from "express";
import cors from "cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import { randomUUID, randomBytes } from "crypto";
import pg from "pg";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();
const { Pool } = pg;
const openai = new OpenAI();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
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

app.post("/register-tenant", async (req, res) => {
  try {
    const tenant_id = randomUUID();
    const api_key = "ti_" + randomBytes(24).toString("hex");

    await pool.query(
      "INSERT INTO tenants (tenant_id, api_key) VALUES ($1, $2)",
      [tenant_id, api_key]
    );

    res.json({ tenant_id, api_key });
  } catch (err) {
    console.error("Error registering tenant:", err);
    res.status(500).json({ error: "Database error registering tenant" });
  }
});

app.post("/analyze", express.json(), async (req, res) => {
  try {
    const { tenant_id, api_key, message } = req.body;

    if (!tenant_id || !api_key || !message) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await pool.query(
      "SELECT * FROM tenants WHERE tenant_id=$1 AND api_key=$2",
      [tenant_id, api_key]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Return JSON:
{
"sentiment":"",
"priority_level":"",
"categories":[],
"summary":"",
"recommended_action":""
}`
        },
        { role: "user", content: message }
      ]
    });

    const analysis = JSON.parse(response.choices[0].message.content);

    await pool.query(
      "INSERT INTO feedback (tenant_id, message, analysis) VALUES ($1, $2, $3)",
      [tenant_id, message, analysis]
    );

    res.json({ success: true, analysis });
  } catch (err) {
    console.error("Error analyzing feedback:", err);
    res.status(500).json({ error: "Internal server error during analysis" });
  }
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