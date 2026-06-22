// ──────────────────────────────────────────────────────────────
// Session Store — Supabase-backed session persistence
// ──────────────────────────────────────────────────────────────

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const { computeEligibility } = require('./ruleEngine');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

let supabase = null;
let useInMemoryFallback = false;

// In-memory fallback for development when Supabase isn't configured
const memoryStore = new Map();

function initSupabase() {
  if (supabaseUrl && supabaseKey && supabaseUrl.startsWith('http')) {
    try {
      supabase = createClient(supabaseUrl, supabaseKey);
      console.log('✅ Supabase connected');
    } catch (err) {
      useInMemoryFallback = true;
      console.warn('⚠️  Supabase init failed — using in-memory session store:', err.message);
    }
  } else {
    useInMemoryFallback = true;
    console.warn('⚠️  SUPABASE_URL or SUPABASE_ANON_KEY not set — using in-memory session store (data will not persist across restarts)');
  }
}

initSupabase();

// ── CREATE SESSION ───────────────────────────────────────────

async function createSession() {
  const token = crypto.randomUUID();
  const now = new Date().toISOString();

  const sessionData = {
    token,
    current_phase: 'STEP1_SGA',
    sub_step: 0,
    form_data: {
      meta: {
        form_id: 'SSA-3373-BK',
        version: '02-2024',
        created_at: now,
        messages: [
          {
            role: 'assistant',
            content: "Hi, I'm Anna. I'm here to help you navigate the Social Security Disability application.\n\nBefore we start filling out forms, let me ask a few quick questions to make sure you qualify.\n\nAre you currently working at any job, even part-time or occasional work?"
          }
        ]
      },
      section_sga: {},
      section_severity: {},
      section_a_general: {},
      section_b_conditions: { conditions: [] },
      section_blue_book: {},
      section_c_daily_activities: {},
      section_d_abilities: { affected_abilities: [], ability_explanations: {} },
      section_work_history: { jobs_last_15_years: [] },
      section_vocational: { transferable_skills: [] },
      section_medications: {},
      remarks: '',
      completed_by: {},
      eligibility_assessment: {}
    },
    created_at: now,
    updated_at: now
  };

  if (useInMemoryFallback) {
    memoryStore.set(token, sessionData);
  } else {
    const { error } = await supabase
      .from('sessions')
      .insert({
        token,
        current_phase: sessionData.current_phase,
        sub_step: sessionData.sub_step,
        form_data: sessionData.form_data,
        created_at: now,
        updated_at: now
      });

    if (error) {
      console.error('Supabase insert error:', error);
      // Fallback to memory
      memoryStore.set(token, sessionData);
    }
  }

  return sessionData;
}

// ── GET SESSION ──────────────────────────────────────────────

async function getSession(token) {
  if (useInMemoryFallback || memoryStore.has(token)) {
    return memoryStore.get(token) || null;
  }

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('token', token)
    .single();

  if (error || !data) {
    return null;
  }

  // Cache in memory for fast access during conversation
  const session = {
    token: data.token,
    current_phase: data.current_phase,
    sub_step: data.sub_step,
    form_data: data.form_data,
    created_at: data.created_at,
    updated_at: data.updated_at
  };

  memoryStore.set(token, session);
  return session;
}

// ── UPDATE SESSION ───────────────────────────────────────────

async function updateSession(token, updates) {
  const session = await getSession(token);
  if (!session) return null;

  // Merge form data
  if (updates.form_data) {
    for (const [section, fields] of Object.entries(updates.form_data)) {
      if (typeof fields === 'object' && fields !== null && !Array.isArray(fields)) {
        session.form_data[section] = {
          ...(session.form_data[section] || {}),
          ...fields
        };
      } else {
        session.form_data[section] = fields;
      }
    }
  }

  // Update phase and sub_step
  if (updates.current_phase !== undefined) {
    session.current_phase = updates.current_phase;
  }
  if (updates.sub_step !== undefined) {
    session.sub_step = updates.sub_step;
  }

  session.updated_at = new Date().toISOString();

  // Persist
  if (useInMemoryFallback) {
    memoryStore.set(token, session);
  } else {
    const { error } = await supabase
      .from('sessions')
      .update({
        current_phase: session.current_phase,
        sub_step: session.sub_step,
        form_data: session.form_data,
        updated_at: session.updated_at
      })
      .eq('token', token);

    if (error) {
      console.error('Supabase update error:', error);
    }
    memoryStore.set(token, session);
  }

  return session;
}

// ── GET ELIGIBILITY ──────────────────────────────────────────

async function getEligibility(token) {
  const session = await getSession(token);
  if (!session) return null;

  const assessment = await computeEligibility(session.form_data);

  // Store the assessment
  await updateSession(token, {
    form_data: { eligibility_assessment: assessment }
  });

  return {
    assessment,
    form_data: session.form_data
  };
}

module.exports = {
  createSession,
  getSession,
  updateSession,
  getEligibility
};
