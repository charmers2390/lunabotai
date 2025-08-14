import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import fetch from 'node-fetch';

const app = express();
app.use(cors({ origin: [/localhost:\d+$/, /.*/] }));
app.use(express.json({ limit: '1mb' }));
app.use(rateLimit({ windowMs: 60_000, max: 60 }));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PORT = process.env.PORT || 8080;

// Health endpoint
app.get('/health', (_req, res) => res.json({ ok: true }));

// Chat endpoint that calls your stored prompt
app.post('/api/chat', async (req, res) => {
  try {
    const body = {
      prompt: {
        id: "pmpt_689d3bb4f90081949d3d7dfe65db68640545dc8e25fec9f7",
        version: "2"
      }
    };

    const r = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!r.ok) {
      const errTxt = await r.text().catch(() => '');
      return res.status(r.status).json({ error: errTxt || 'OpenAI API error' });
    }

    const data = await r.json();
    res.json(data);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err?.message || err) });
  }
});

app.listen(PORT, () => {
  console.log(`LunaBot AI backend running on http://localhost:${PORT}`);
});
