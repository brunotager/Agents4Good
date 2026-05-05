// Vercel Serverless Function — GET /api/session/[token]/eligibility

const cors = require('../../../_lib/cors');
const { getEligibility } = require('../../../../backend/server/sessionStore');

module.exports = cors(async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token } = req.query;
    const result = await getEligibility(token);
    if (!result) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(result);
  } catch (err) {
    console.error('Eligibility error:', err);
    res.status(500).json({ error: 'Failed to compute eligibility' });
  }
});
