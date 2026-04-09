const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const { protect } = require('../middleware/auth');

router.use(protect);

function buildPoolText(pool) {
  return pool
    .map((item) => {
      const nominees = item.nominees
        .map(
          (n, i) =>
            `  ${i + 1}. ${n.nomineeName}` +
            (n.nomineeDesignation ? ` (${n.nomineeDesignation})` : '') +
            (n.manager?.name ? ` — nominated by ${n.manager.name}` : '') +
            (n.remarks ? `\n     Reason: "${n.remarks}"` : '\n     Reason: (none provided)')
        )
        .join('\n');
      return `CATEGORY: ${item.category.name}\n${item.category.description ? 'Description: ' + item.category.description + '\n' : ''}Nominees:\n${nominees || '  (none submitted yet)'}`;
    })
    .join('\n\n');
}

function getGroq() {
  if (!process.env.GROQ_API_KEY) return null;
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

// POST /api/ai/recommend
router.post('/recommend', async (req, res) => {
  try {
    const { pool } = req.body;
    if (!pool || !Array.isArray(pool) || pool.length === 0)
      return res.status(400).json({ message: 'Pool data is required' });

    const groq = getGroq();
    if (!groq)
      return res.status(503).json({ message: 'AI not configured. Add GROQ_API_KEY to backend/.env (free at console.groq.com)' });

    const poolText = buildPoolText(pool);

    const prompt = `You are a senior HR awards advisor. Your job is to recommend ONE winner per category from the nominees below, based purely on the nomination reasons provided.

${poolText}

For EACH category, you must:
1. Pick the strongest nominee based on the specificity and impact of their nomination reason
2. Write a clear reason (3-5 sentences) that:
   - Cites specific achievements mentioned in the nomination (quote key phrases)
   - Explains WHY those achievements fit this particular award category
   - Explicitly states why this person stands out compared to the other nominees (name them if relevant)
3. If reasons are generic or missing, say so and reflect that in a lower confidence level

Do NOT just repeat the nomination reason. Analyse and compare — explain the differentiating factor.

Respond ONLY with a valid JSON array, no markdown, no text outside JSON:
[
  {
    "category": "exact category name",
    "recommended": "nominee full name",
    "reason": "your detailed comparative reasoning here",
    "comparison": "one sentence on why the others were not chosen",
    "confidence": "high | medium | low"
  }
]`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
    });

    const raw = completion.choices[0]?.message?.content?.trim() || '';
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    let recommendations;
    try {
      recommendations = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\[[\s\S]*\]/);
      if (match) recommendations = JSON.parse(match[0]);
      else return res.status(500).json({ message: 'AI returned unexpected format', raw });
    }

    res.json({ recommendations });
  } catch (err) {
    console.error('AI recommend error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/ai/chat
router.post('/chat', async (req, res) => {
  try {
    const { pool, recommendations, messages } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0)
      return res.status(400).json({ message: 'Messages are required' });

    const groq = getGroq();
    if (!groq)
      return res.status(503).json({ message: 'AI not configured. Add GROQ_API_KEY to backend/.env' });

    const poolText = buildPoolText(pool || []);
    const recSummary = recommendations
      ? recommendations.map((r) => `• ${r.category}: recommended ${r.recommended} — ${r.reason}`).join('\n')
      : 'No recommendations generated yet.';

    const systemPrompt = `You are an HR awards advisor helping a senior manager decide on award nominees.

Here is the full nomination data you already analysed:

${poolText}

Your previous recommendations were:
${recSummary}

Answer the user's questions with specific references to the nominee names and their nomination reasons.
Be direct and comparative. If asked why someone was not chosen, explain it honestly based on their nomination reason vs others.
Keep answers concise (3-6 sentences unless more detail is asked).`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.slice(-10), // keep last 10 messages to stay within token limit
      ],
      temperature: 0.5,
    });

    const reply = completion.choices[0]?.message?.content?.trim() || 'No response from AI.';
    res.json({ reply });
  } catch (err) {
    console.error('AI chat error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
