import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";
import cors from "cors";
import pkg from "pg";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const app = express();
app.use(express.json());
app.use(cors());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.get("/", (req, res) => {
  res.json({ status: "AI Tenant Insights Running" });
});

app.post("/register-tenant", async (req, res) => {
  const tenant_id = uuidv4();
  const api_key = uuidv4();

  await pool.query(
    "INSERT INTO tenants (tenant_id, name, api_key) VALUES ($1, $2, $3)",
    [tenant_id, req.body.name, api_key]
  );

  res.json({ tenant_id, api_key });
});

app.post("/analyze", async (req, res) => {
  const { tenant_id, api_key, message } = req.body;

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
});

app.listen(process.env.PORT, () =>
  console.log("Server running on port " + process.env.PORT)
);