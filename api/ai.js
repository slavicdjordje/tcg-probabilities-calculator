/**
 * api/ai.js — Vercel serverless proxy for Anthropic API calls.
 *
 * Keeps ANTHROPIC_API_KEY server-side so it is never exposed to the browser.
 * All three AI services (AIComboGenerationService, FunctionalRoleInferenceService,
 * LegalCheckService) call POST /api/ai with the same body shape they would have
 * sent directly to Anthropic. This handler forwards the body upstream and streams
 * the response back unchanged.
 *
 * Environment variable required (set in Vercel dashboard + .env.local):
 *   ANTHROPIC_API_KEY
 */

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured on the server.' });
  }

  try {
    const upstream = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(req.body),
    });

    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (err) {
    return res.status(502).json({ error: `Upstream error: ${err.message}` });
  }
}
