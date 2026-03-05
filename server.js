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
  const { method, id } = req.body;

  if (method === "tools/list") {
    return res.json({
      jsonrpc: "2.0",
      id,
      result: {
        tools: [
          {
            name: "get_tenant_insights",
            description: "Analyze tenant reviews",
            input_schema: {
              type: "object",
              properties: {
                property: { type: "string" }
              }
            }
          }
        ]
      }
    });
  }

  res.status(400).json({
    jsonrpc: "2.0",
    id,
    error: { code: -32601, message: "Method not found" }
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});