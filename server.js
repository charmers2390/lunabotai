import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import fetch from 'node-fetch';

// ==== Config ====
const PORT = process.env.PORT || 8080;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error('❌ Missing OPENAI_API_KEY in environment variables.');
  process.exit(1);
}

// Only allow your frontend + localhost for dev
const allowedOrigins = [
  'https://chat.lunabotai.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];
const corsOptions = {
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) cb(null, true);
    else cb(new Error(`CORS blocked for origin: ${origin}`));
  }
};

const app = express();
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(rateLimit({ windowMs: 60_000, max: 60 }));

// Helper to extract plain text from OpenAI Responses API JSON
function extractText(data) {
  if (!data) return '';
  if (typeof data.output_text === 'string') return data.output_text;
  if (Array.isArray(data.output)) {
    const parts = [];
    for (const item of data.output) {
      if (item.type === 'output_text' && Array.isArray(item.text)) {
        for (const t of item.text) {
          if (typeof t.content === 'string') parts.push(t.content);
        }
      }
    }
    if (parts.length) return parts.join('');
  }
  if (data.choices?.[0]?.message?.content) return data.choices[0].message.content;
  return '';
}

// ==== Routes ====

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'lunabotai-backend', model: 'gpt-5', time: new Date().toISOString() });
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const body = {
      model: 'gpt-5', // ✅ Always use GPT-5
      input: Array.isArray(req.body?.messages) ? req.body.messages : [{ role: 'user', content: 'Hello!' }]
    };

    const r = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!r.ok) {
      const errTxt = await r.text().catch(() => '');
      console.error('❌ OpenAI API Error:', errTxt);
      return res.status(r.status || 502).json({ error: errTxt || 'OpenAI API error' });
    }

    const data = await r.json();
    console.log('✅ OpenAI API Response:', JSON.stringify(data, null, 2));

    const text = extractText(data);
    if (!text) {
      return res.status(502).json({ error: 'No text returned from GPT-5' });
    }

    res.json({ text });
  } catch (e) {
    console.error('❌ Server Error in /api/chat:', e);
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// ==== Start server ====
app.listen(PORT, () => {
  console.log(`🚀 LunaBot AI backend (GPT-5) listening on port ${PORT}`);
});

