// Vercel Serverless Function — POST /api/session/start

const cors = require('../_lib/cors');
const { createSession } = require('../../backend/server/sessionStore');
const { PHASE_CONFIG } = require('../../backend/server/phaseLogic');

module.exports = cors(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await createSession();
    const config = PHASE_CONFIG[session.current_phase];

    res.json({
      sessionToken: session.token,
      agentMessage: "Hi, I'm Anna. I'm here to help you navigate the Social Security Disability application.\n\nBefore we start filling out forms, let me ask a few quick questions to make sure you qualify.\n\n" + config.initialQuestion,
      synthesisLabel: "Getting Started",
      nextPhase: session.current_phase,
      progressUpdate: { complete: 0, partial: 0 },
      inputHint: { label: 'Your Answer', placeholder: 'e.g. No, I stopped working', disabled: false }
    });
  } catch (err) {
    console.error('Session start error:', err);
    res.status(500).json({ error: 'Failed to start session' });
  }
});
