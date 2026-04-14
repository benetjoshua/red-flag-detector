export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, label } = req.body;

  if (!text || text.length < 50) {
    return res.status(400).json({ error: 'Text too short' });
  }

  if (text.length > 10000) {
    return res.status(400).json({ error: 'Text too long' });
  }

  const prompt = `You are a sharp, no-nonsense career advisor analyzing a ${label || 'Job Description'}. Find red flags and score how employee-friendly this organization appears.

Return ONLY a valid JSON object. No markdown fences, no explanation, no preamble. Just the raw JSON.

{
  "company_name": "company name or Unknown Company if not found",
  "major_flags": [
    {"title": "short flag name", "roast": "1-2 punchy sentences"},
    {"title": "short flag name", "roast": "1-2 punchy sentences"},
    {"title": "short flag name", "roast": "1-2 punchy sentences"}
  ],
  "minor_flags": [
    {"title": "short flag name", "roast": "1-2 punchy sentences"},
    {"title": "short flag name", "roast": "1-2 punchy sentences"}
  ],
  "score": 5,
  "verdict": "2-3 sentence verdict paragraph. Honest and direct."
}

Score 1-10 on employee-friendliness. Consider: pay transparency, workload realism (8hr day), learning/growth, work model (hybrid=best, full remote=neutral, full in-office=penalise), job security language, autonomy vs micromanagement, genuine vs performative DEI, perks quality.

Tone: honest, punchy, no corporate fluff.

Document to analyze:
${text}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: err?.error?.message || 'API error' });
    }

    const data = await response.json();
    const raw = data.content[0].text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(raw);

    return res.status(200).json(parsed);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
