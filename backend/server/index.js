// ──────────────────────────────────────────────────────────────
// SSD Application Agent — Backend Server
// ──────────────────────────────────────────────────────────────

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { createSession, getSession, updateSession, getEligibility } = require('./sessionStore');
const { extractFields, generateResponse } = require('./openRouterClient');
const { EXTRACTION_PROMPTS, getQuestionPrompt, getBlueBookRecommendationPrompt, getSynthesisPrompt } = require('./agentPrompts');
const { matchBlueBook, evaluateSGA, evaluateGridRules, getAgeCategory } = require('./ruleEngine');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// ── Phase configuration: required fields + sub-step questions ──

const PHASE_CONFIG = {
  STEP1_SGA: {
    section: 'section_sga',
    requiredFields: ['currently_working'],
    conditionalFields: {
      'currently_working:true': ['work_type', 'hours_per_week', 'monthly_earnings']
    },
    nextPhase: 'STEP2_SEVERITY',
    initialQuestion: "Are you currently working at any job, even part-time or occasional work?"
  },
  STEP2_SEVERITY: {
    section: 'section_severity',
    requiredFields: ['condition_expected_to_last_12_months', 'basic_work_activities_affected'],
    conditionalFields: {},
    nextPhase: 'MFA_PHONE',
    rejectPhase: 'ELIGIBILITY_REJECT',
    initialQuestion: "Is your medical condition expected to last at least 12 months, or is it indefinite?"
  },
  ELIGIBILITY_REJECT: {
    section: null,
    requiredFields: [],
    conditionalFields: {},
    nextPhase: null,
    initialQuestion: null
  },
  MFA_PHONE: {
    section: 'section_a_general',
    requiredFields: ['phone_number'],
    conditionalFields: {},
    nextPhase: 'MFA_CODE',
    initialQuestion: "To keep your data safe, what is your mobile phone number?"
  },
  MFA_CODE: {
    section: null,
    requiredFields: [],
    conditionalFields: {},
    nextPhase: 'MEDICAL_RELEASE',
    initialQuestion: "I've sent a 6-digit code to your phone. Please enter it now."
  },
  MEDICAL_RELEASE: {
    section: null,
    requiredFields: [],
    conditionalFields: {},
    nextPhase: 'STEP3_CONDITIONS',
    initialQuestion: "To build your case, I'll need to help you gather your medical records. Do I have your permission? Please sign below."
  },
  STEP3_CONDITIONS: {
    section: 'section_b_conditions',
    requiredFields: ['conditions'],
    conditionalFields: {},
    nextPhase: 'STEP3_BLUE_BOOK',
    initialQuestion: "What medical conditions prevent you from working? Please list all of them — physical and mental."
  },
  STEP3_BLUE_BOOK: {
    section: 'section_blue_book',
    requiredFields: [],
    conditionalFields: {},
    nextPhase: 'STEP4_DEMOGRAPHICS',
    initialQuestion: null // Auto-generated from Blue Book match
  },
  STEP4_DEMOGRAPHICS: {
    section: 'section_vocational',
    requiredFields: ['age', 'education_level'],
    conditionalFields: {},
    nextPhase: 'STEP4_WORK_HISTORY',
    initialQuestion: "How old are you?"
  },
  STEP4_WORK_HISTORY: {
    section: 'section_work_history',
    requiredFields: ['jobs_last_15_years'],
    conditionalFields: {},
    nextPhase: 'STEP4_DAILY_ACTIVITIES',
    initialQuestion: "Tell me about your most recent job. What was the title, and what kind of work did you do?"
  },
  STEP4_DAILY_ACTIVITIES: {
    section: 'section_c_daily_activities',
    requiredFields: ['daily_routine'],
    conditionalFields: {},
    nextPhase: 'STEP4_ABILITIES',
    initialQuestion: "Walk me through a typical day. What do you do from the time you wake up until you go to bed?"
  },
  STEP4_ABILITIES: {
    section: 'section_d_abilities',
    requiredFields: ['affected_abilities'],
    conditionalFields: {},
    nextPhase: 'STEP5_VOCATIONAL',
    initialQuestion: "I need to understand how your condition affects your physical and mental abilities. Let's start — how far can you walk before you need to stop and rest?"
  },
  STEP5_VOCATIONAL: {
    section: 'section_vocational',
    requiredFields: [],
    conditionalFields: {},
    nextPhase: 'STEP5_GRID_RESULT',
    initialQuestion: "Do you have any skills from past jobs that could be used in a different, less physical job? For example: computer skills, bookkeeping, customer service."
  },
  STEP5_GRID_RESULT: {
    section: null,
    requiredFields: [],
    conditionalFields: {},
    nextPhase: 'APPLICATION_REVIEW',
    initialQuestion: null // Auto-generated from Grid Rules
  },
  APPLICATION_REVIEW: {
    section: null,
    requiredFields: [],
    conditionalFields: {},
    nextPhase: 'APPLICATION_COMPLETE',
    initialQuestion: "We've collected all the necessary information. Are you ready to submit your application for review?"
  },
  APPLICATION_COMPLETE: {
    section: null,
    requiredFields: [],
    conditionalFields: {},
    nextPhase: null,
    initialQuestion: null
  }
};

// ── Progress calculation ──

function calculateProgress(formData) {
  const totalSections = 10;
  let complete = 0;
  let partial = 0;

  const checks = [
    { section: formData.section_sga, key: 'currently_working' },
    { section: formData.section_severity, key: 'condition_expected_to_last_12_months' },
    { section: formData.section_a_general, key: 'phone_number' },
    { section: formData.section_b_conditions, key: 'conditions', isArray: true },
    { section: formData.section_blue_book, key: 'matched_listing_id' },
    { section: formData.section_vocational, key: 'age' },
    { section: formData.section_work_history, key: 'jobs_last_15_years', isArray: true },
    { section: formData.section_c_daily_activities, key: 'daily_routine' },
    { section: formData.section_d_abilities, key: 'affected_abilities', isArray: true },
    { section: formData.section_vocational, key: 'education_level' }
  ];

  for (const check of checks) {
    if (!check.section) continue;
    const val = check.section[check.key];
    if (check.isArray) {
      if (Array.isArray(val) && val.length > 0) complete++;
      else if (val !== undefined) partial++;
    } else {
      if (val !== undefined && val !== null && val !== '') complete++;
    }
  }

  const completePercent = Math.round((complete / totalSections) * 100);
  const partialPercent = Math.round((partial / totalSections) * 100);

  return { complete: completePercent, partial: partialPercent };
}

// ── Determine missing fields for current phase ──

function getMissingFields(phase, formData) {
  const config = PHASE_CONFIG[phase];
  if (!config || !config.section) return [];

  const sectionData = formData[config.section] || {};
  const missing = [];

  for (const field of config.requiredFields) {
    const val = sectionData[field];
    if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
      missing.push(field);
    }
  }

  // Check conditional fields
  for (const [condition, fields] of Object.entries(config.conditionalFields)) {
    const [condField, condValue] = condition.split(':');
    const actual = String(sectionData[condField]);
    if (actual === condValue) {
      for (const field of fields) {
        const val = sectionData[field];
        if (val === undefined || val === null || val === '') {
          missing.push(field);
        }
      }
    }
  }

  return missing;
}

// ── Deterministic synthesis labels (no LLM needed) ──

function buildSynthesisLabel(phase, fields) {
  const keys = Object.keys(fields).filter(k => fields[k] !== null && fields[k] !== undefined);
  if (keys.length === 0) return 'No information was saved from your response.';

  // Phase-specific labels
  if (phase === 'STEP1_SGA') {
    if (fields.reason_stopped_working) return 'Reason for stopping work saved.';
    if (fields.last_date_worked) return 'Last date worked saved.';
    if (fields.monthly_earnings) return `Monthly earnings: $${fields.monthly_earnings}.`;
    if (fields.currently_working === false) return 'Noted: not currently working.';
    if (fields.currently_working === true) return 'Noted: currently working.';
  }
  if (phase === 'STEP2_SEVERITY') {
    if (fields.condition_expected_to_last_12_months === true) return 'Condition duration confirmed.';
    if (fields.basic_work_activities_affected) return 'Affected abilities recorded.';
  }
  if (phase === 'STEP3_CONDITIONS') {
    const conditions = fields.conditions;
    if (Array.isArray(conditions) && conditions.length > 0) {
      return `Conditions recorded: ${conditions.join(', ')}.`;
    }
  }
  if (phase === 'STEP4_DEMOGRAPHICS') {
    if (fields.age) return `Age recorded: ${fields.age}.`;
    if (fields.education_level) return `Education level saved.`;
  }
  if (phase === 'STEP4_WORK_HISTORY') {
    return 'Work history saved.';
  }
  if (phase === 'STEP4_DAILY_ACTIVITIES') {
    return 'Daily routine recorded.';
  }
  if (phase === 'STEP4_ABILITIES') {
    return 'Abilities information saved.';
  }

  return 'Information saved.';
}

// ── Deterministic follow-up questions (no LLM needed) ──

const FOLLOW_UP_QUESTIONS = {
  // STEP1_SGA conditional fields
  'work_type': "What type of work are you doing? Is it full-time, part-time, self-employed, or gig work?",
  'hours_per_week': "About how many hours per week do you work?",
  'monthly_earnings': "How much do you earn per month before taxes?",
  'last_date_worked': "When was the last time you worked at any job?",
  'reason_stopped_working': "Why did you stop working?",
  'employer_name': "What was the name of your last employer?",

  // STEP2_SEVERITY
  'condition_expected_to_last_12_months': "Is your medical condition expected to last at least 12 months, or is it expected to be permanent?",
  'basic_work_activities_affected': "Which basic activities does your condition affect? For example: walking, standing, sitting, lifting, concentrating, remembering things.",

  // STEP3_CONDITIONS
  'conditions': "What medical conditions prevent you from working? Please list all of them — physical and mental.",

  // STEP4_DEMOGRAPHICS
  'age': "How old are you?",
  'education_level': "What is the highest level of education you completed?",

  // STEP4_WORK_HISTORY
  'jobs_last_15_years': "Tell me about your most recent job. What was the title, and what kind of work did you do?",

  // STEP4_DAILY_ACTIVITIES
  'daily_routine': "Walk me through a typical day. What do you do from the time you wake up until you go to bed?",

  // STEP4_ABILITIES
  'affected_abilities': "How does your condition limit what you can do physically and mentally? For example, how far can you walk before you need to rest?"
};

function buildFollowUpQuestion(phase, formData, missingFields, extractedFields) {
  // Acknowledge what was saved, then ask the next question
  const savedKeys = Object.keys(extractedFields).filter(k => extractedFields[k] !== null && extractedFields[k] !== undefined);

  let ack = '';
  if (savedKeys.length > 0) {
    ack = 'Thank you for that. ';
  }

  // Ask about the first missing field
  const nextField = missingFields[0];
  const question = FOLLOW_UP_QUESTIONS[nextField];

  if (question) {
    return ack + question;
  }

  // Generic fallback
  const readable = nextField ? nextField.replace(/_/g, ' ') : missingFields.join(', ').replace(/_/g, ' ');
  return `${ack}Could you tell me about your ${readable}?`;
}

// ── Fast keyword-based extraction for simple phases ──

function extractSGA(msg) {
  const lower = msg.toLowerCase();
  const result = {};

  // Detect working status
  const notWorkingPatterns = [
    /^(no|nope|nah|not really|negative|no way)\b/,  // Bare "no" answers to "are you working?"
    /\b(not|no|nope|nah|ain't|haven't been|haven't|don't|can't|cannot|unable)\b.*\b(work|employ|job)/,
    /\b(unemploy|disabled|off work|stopped work|quit|laid off|let go|fired|terminated)/,
    /\b(not? +(currently )?working)/,
    /\bno i'm not\b/,
    /\bnot at all\b/
  ];

  const workingPatterns = [
    /^(yes|yeah|yep|yup)\b/,  // Bare "yes" answers to "are you working?"
    /\b(yes|yeah|yep|yup)\b.*\b(work|job|employ)/,
    /\b(i work|i am working|i'm working|currently working|still working)/,
    /\b(part[- ]time|full[- ]time|freelanc|self[- ]employ|gig)/
  ];

  for (const pat of notWorkingPatterns) {
    if (pat.test(lower)) {
      result.currently_working = false;
      result.work_type = 'none';
      break;
    }
  }

  if (result.currently_working === undefined) {
    for (const pat of workingPatterns) {
      if (pat.test(lower)) {
        result.currently_working = true;
        // Try to detect work type
        if (/part[- ]?time/.test(lower)) result.work_type = 'part_time';
        else if (/full[- ]?time/.test(lower)) result.work_type = 'full_time';
        else if (/self[- ]?employ|freelanc|own business/.test(lower)) result.work_type = 'self_employed';
        else if (/gig|uber|lyft|doordash|instacart/.test(lower)) result.work_type = 'gig_work';
        break;
      }
    }
  }

  // Try to extract earnings
  const earningsMatch = lower.match(/\$\s*([\d,]+)\s*(a |per )?(month|mo)/);
  if (earningsMatch) {
    result.monthly_earnings = parseInt(earningsMatch[1].replace(/,/g, ''));
  }
  const weeklyMatch = lower.match(/\$\s*([\d,]+)\s*(a |per )?(week|wk)/);
  if (weeklyMatch) {
    result.monthly_earnings = Math.round(parseInt(weeklyMatch[1].replace(/,/g, '')) * 4.33);
  }

  // Try to extract hours
  const hoursMatch = lower.match(/(\d+)\s*hours?\s*(a |per )?(week|wk)/);
  if (hoursMatch) {
    result.hours_per_week = parseInt(hoursMatch[1]);
  }

  // Reason stopped working (if mentioned)
  const reasonPatterns = [
    /because (?:of )?(?:my )?(.*?)(?:\.|$)/,
    /due to (?:my )?(.*?)(?:\.|$)/,
    /(?:can't|cannot|couldn't) work (?:because|due to) (.*?)(?:\.|$)/
  ];
  for (const pat of reasonPatterns) {
    const m = lower.match(pat);
    if (m && m[1]) {
      result.reason_stopped_working = m[1].trim();
      break;
    }
  }

  return result;
}

function extractSeverity(msg) {
  const lower = msg.toLowerCase();
  const result = {};

  // Detect duration / permanence
  const permanentPatterns = [
    /\b(permanent|forever|indefinite|lifelong|life-?long|chronic|degenerative)\b/,
    /\b(rest of|end of) (my |their )?life\b/,
    /\b(never|won't|will not) (get better|heal|recover|go away|improve)\b/,
    /\b(always|for ?ever)\b/,
    /\b(until (i|I) die)\b/,
    /\bfor life\b/,
    /\b(terminal|incurable)\b/,
    /\bno cure\b/,
    /\bwill (last|continue) ?(forever|indefinitely|permanently)\b/
  ];

  const shortTermPatterns = [
    /\b(temporary|short[- ]?term)\b/,
    /\b(few (weeks|months)|couple (of )?(weeks|months))\b/,
    /\b(getting better|recovering|healing|will heal|should recover)\b/,
    /\b(less than (a year|12 months|six months))\b/
  ];

  for (const pat of permanentPatterns) {
    if (pat.test(lower)) {
      result.condition_expected_to_last_12_months = true;
      result.condition_duration_months = 'indefinite';
      break;
    }
  }

  // Check for explicit "yes" answers (since the question asks "will it last 12 months?")
  if (result.condition_expected_to_last_12_months === undefined) {
    if (/\b(yes|yeah|yep|yup|definitely|absolutely|for sure)\b/.test(lower)) {
      result.condition_expected_to_last_12_months = true;
    }
  }

  // Check for short-term only if not already marked as permanent
  if (result.condition_expected_to_last_12_months === undefined) {
    for (const pat of shortTermPatterns) {
      if (pat.test(lower)) {
        result.condition_expected_to_last_12_months = false;
        break;
      }
    }
  }

  // Check for explicit "no" only as last resort
  if (result.condition_expected_to_last_12_months === undefined) {
    if (/^(no|nope|nah)\b/.test(lower.trim())) {
      result.condition_expected_to_last_12_months = false;
    }
  }

  // Extract any mentioned duration
  const durationMatch = lower.match(/(\d+)\s*(year|yr|month|mo)/);
  if (durationMatch) {
    let months = parseInt(durationMatch[1]);
    if (/year|yr/.test(durationMatch[2])) months *= 12;
    result.condition_duration_months = months;
    result.condition_expected_to_last_12_months = months >= 12;
  }

  // Extract affected work activities from keywords
  const activityMap = {
    'walk': 'walking', 'stand': 'standing', 'sit': 'sitting',
    'lift': 'lifting', 'carry': 'carrying', 'push': 'pushing',
    'pull': 'pulling', 'reach': 'reaching', 'grip': 'handling',
    'see': 'seeing', 'hear': 'hearing', 'speak': 'speaking',
    'talk': 'speaking', 'understand': 'understanding',
    'remember': 'remembering', 'concentrat': 'concentrating',
    'focus': 'concentrating', 'interact': 'interacting_with_others',
    'social': 'interacting_with_others', 'adapt': 'adapting_to_changes',
    'leg': 'walking', 'back': 'lifting', 'arm': 'reaching',
    'hand': 'handling', 'knee': 'walking', 'hip': 'walking',
    'shoulder': 'reaching', 'spine': 'lifting', 'eye': 'seeing',
    'deaf': 'hearing', 'blind': 'seeing', 'anxiety': 'concentrating',
    'depression': 'concentrating', 'pain': 'lifting'
  };

  const activities = new Set();
  for (const [keyword, activity] of Object.entries(activityMap)) {
    if (lower.includes(keyword)) {
      activities.add(activity);
    }
  }

  if (activities.size > 0) {
    result.basic_work_activities_affected = [...activities];
  }

  // Extract severity explanation if they describe their condition
  const conditionPatterns = [
    /my (.*?) is (completely |totally |fully )?(broken|damaged|gone|destroyed)/,
    /i (have|got|suffer from) (a )?(.*?)(?:\.|,|$)/,
    /(?:diagnosed with|dealing with) (.*?)(?:\.|,|$)/
  ];
  for (const pat of conditionPatterns) {
    const m = lower.match(pat);
    if (m) {
      result.severity_explanation = m[0].trim();
      break;
    }
  }

  return result;
}

// ── ROUTES ───────────────────────────────────────────────────

app.get('/', (req, res) => {
  res.send('SSD Application Agent Backend 🚀');
});

// ── Start Session ──

app.post('/api/session/start', async (req, res) => {
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

// ── Process Turn ──

app.post('/api/agent/turn', async (req, res) => {
  try {
    const { userMessage, currentPhase } = req.body;
    const token = (req.headers.authorization || '').replace('Bearer ', '');

    const session = await getSession(token);
    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const phase = currentPhase || session.current_phase;
    const config = PHASE_CONFIG[phase];

    if (!config) {
      return res.status(400).json({ error: `Unknown phase: ${phase}` });
    }

    // ── Special phases that don't need LLM extraction ──

    if (phase === 'MFA_CODE') {
      await updateSession(token, { current_phase: 'MEDICAL_RELEASE', sub_step: 0 });
      const nextConfig = PHASE_CONFIG['MEDICAL_RELEASE'];
      return res.json({
        agentMessage: nextConfig.initialQuestion,
        synthesisLabel: "Identity securely verified.",
        nextPhase: 'MEDICAL_RELEASE',
        progressUpdate: calculateProgress(session.form_data),
        inputHint: { label: 'Awaiting Signature', placeholder: '', disabled: true }
      });
    }

    if (phase === 'MEDICAL_RELEASE') {
      if (userMessage.startsWith('__SIGNED__')) {
        await updateSession(token, { current_phase: 'STEP3_CONDITIONS', sub_step: 0 });
        const nextConfig = PHASE_CONFIG['STEP3_CONDITIONS'];
        return res.json({
          agentMessage: nextConfig.initialQuestion,
          synthesisLabel: "Medical Release SSA-827 signed securely.",
          nextPhase: 'STEP3_CONDITIONS',
          progressUpdate: calculateProgress(session.form_data),
          inputHint: { label: 'Your Conditions', placeholder: 'e.g. Back pain, depression', disabled: false }
        });
      }
      return res.status(400).json({ error: 'Signature expected' });
    }

    if (phase === 'APPLICATION_REVIEW') {
      await updateSession(token, { current_phase: 'APPLICATION_COMPLETE', sub_step: 0 });
      return res.json({
        agentMessage: "Your application has been submitted for review. Thank you for your patience throughout this process.",
        synthesisLabel: "Application Complete",
        nextPhase: 'APPLICATION_COMPLETE',
        progressUpdate: { complete: 100, partial: 0 },
        inputHint: { label: 'Application Submitted', placeholder: '', disabled: true }
      });
    }

    if (phase === 'APPLICATION_COMPLETE') {
      return res.json({
        agentMessage: "You have already completed the application.",
        synthesisLabel: "Application Complete",
        nextPhase: 'APPLICATION_COMPLETE',
        progressUpdate: { complete: 100, partial: 0 },
        inputHint: { label: 'Application Submitted', placeholder: '', disabled: true }
      });
    }

    // ── LLM-powered phases ──

    let extractedFields = {};
    let synthesisLabel = '';
    let agentMessage = '';
    let nextPhase = phase;
    let inputHint = { label: 'Your Answer', placeholder: '', disabled: false };

    // Step 1: Extract fields from user message
    // Use fast keyword extraction for simple phases, LLM for complex ones
    if (phase === 'STEP1_SGA') {
      extractedFields = extractSGA(userMessage);
    } else if (phase === 'STEP2_SEVERITY') {
      extractedFields = extractSeverity(userMessage);
    } else {
      const extractionPrompt = EXTRACTION_PROMPTS[phase];
      if (extractionPrompt) {
        try {
          const raw = await extractFields(extractionPrompt, userMessage);
          // Filter out null/undefined values — they would overwrite existing data
          for (const [key, val] of Object.entries(raw)) {
            if (val !== null && val !== undefined) {
              extractedFields[key] = val;
            }
          }
        } catch (err) {
          console.error('Extraction failed, using empty:', err.message);
          extractedFields = {};
        }
      }
    }
    console.log(`[${phase}] Extracted:`, JSON.stringify(extractedFields));

    // Step 2: Update session with extracted fields
    if (config.section && Object.keys(extractedFields).length > 0) {
      // Handle special cases
      if (phase === 'STEP4_WORK_HISTORY' && extractedFields.job) {
        const currentJobs = session.form_data.section_work_history?.jobs_last_15_years || [];
        extractedFields.jobs_last_15_years = [...currentJobs, extractedFields.job];
        delete extractedFields.job;
      }
      if (phase === 'STEP4_ABILITIES' && extractedFields.affected_abilities) {
        const current = session.form_data.section_d_abilities?.affected_abilities || [];
        const merged = [...new Set([...current, ...extractedFields.affected_abilities])];
        extractedFields.affected_abilities = merged;
      }

      await updateSession(token, { form_data: { [config.section]: extractedFields } });
    }

    // Refresh session after update
    const updatedSession = await getSession(token);
    const formData = updatedSession.form_data;

    // Step 3: Generate synthesis label LOCALLY (no LLM call needed)
    if (Object.keys(extractedFields).length > 0) {
      synthesisLabel = buildSynthesisLabel(phase, extractedFields);
    }

    // Step 4: Check if phase is complete
    const missingFields = getMissingFields(phase, formData);
    const phaseComplete = missingFields.length === 0;

    // Step 5: Handle phase-specific logic
    if (phase === 'STEP1_SGA') {
      const sga = formData.section_sga || {};
      if (sga.currently_working === true && sga.monthly_earnings !== undefined) {
        const sgaResult = evaluateSGA(sga.monthly_earnings, sga.is_blind);
        await updateSession(token, {
          form_data: { section_sga: { sga_pass: sgaResult.sga_pass, sga_threshold: sgaResult.sga_threshold } }
        });
        if (!sgaResult.sga_pass) {
          synthesisLabel = `Monthly earnings: $${sga.monthly_earnings}`;
          agentMessage = `Your monthly earnings of $${sga.monthly_earnings} are above the SSA's limit of $${sgaResult.sga_threshold}. This means you're currently considered to be doing "Substantial Gainful Activity."\n\nHowever, if your earnings decrease or you stop working, you may become eligible. Would you like to continue anyway, or would you prefer to come back when your situation changes?`;
        }
      }
    }

    if (phase === 'STEP2_SEVERITY') {
      const sev = formData.section_severity || {};
      if (sev.condition_expected_to_last_12_months === false) {
        nextPhase = 'ELIGIBILITY_REJECT';
        await updateSession(token, { current_phase: nextPhase, sub_step: 0 });
        return res.json({
          agentMessage: "The SSA requires conditions to last at least 12 months. Based on what you've told me, your condition may not meet this requirement.\n\nIf your condition worsens or your doctor's prognosis changes, you can reapply. I recommend discussing this with your doctor.",
          synthesisLabel: "Duration requirement not met.",
          nextPhase,
          progressUpdate: calculateProgress(formData),
          inputHint: { label: 'Application Paused', placeholder: '', disabled: true }
        });
      }
    }

    // Step 6: Advance phase or ask next question
    if (phaseComplete && !agentMessage) {
      // Special handling for Blue Book phase
      if (phase === 'STEP3_CONDITIONS') {
        const conditions = formData.section_b_conditions?.conditions || [];
        const blueBookMatch = matchBlueBook(conditions);
        await updateSession(token, {
          form_data: { section_blue_book: blueBookMatch },
          current_phase: 'STEP3_BLUE_BOOK',
          sub_step: 0
        });

        if (blueBookMatch.match_confidence !== 'none' && blueBookMatch.matched_listing_id) {
          try {
            agentMessage = await generateResponse(
              getBlueBookRecommendationPrompt(conditions, blueBookMatch),
              `Conditions: ${conditions.join(', ')}`
            );
          } catch (err) {
            agentMessage = blueBookMatch.recommendation;
          }
        } else {
          agentMessage = blueBookMatch.recommendation;
        }

        nextPhase = 'STEP3_BLUE_BOOK';
        // Auto-advance past Blue Book to demographics after showing the match
        setTimeout(async () => {
          await updateSession(token, { current_phase: 'STEP4_DEMOGRAPHICS', sub_step: 0 });
        }, 100);
        nextPhase = 'STEP4_DEMOGRAPHICS';

        const demoConfig = PHASE_CONFIG['STEP4_DEMOGRAPHICS'];
        agentMessage += `\n\nNow let me collect some background information. ${demoConfig.initialQuestion}`;
        inputHint = { label: 'Your Age', placeholder: 'e.g. 58', disabled: false };
      }
      // Grid Rules result
      else if (phase === 'STEP5_VOCATIONAL') {
        const voc = formData.section_vocational || {};
        const abilities = formData.section_d_abilities || {};
        const { determineRFC } = require('./ruleEngine');
        const rfc = determineRFC(abilities);
        const gridResult = evaluateGridRules(
          voc.age, voc.education_level, rfc.rfc_level, voc.transferable_skills
        );

        await updateSession(token, {
          form_data: {
            section_vocational: {
              grid_rule_result: gridResult.grid_rule_result,
              grid_rule_explanation: gridResult.grid_rule_explanation,
              age_category: getAgeCategory(voc.age)
            }
          },
          current_phase: 'APPLICATION_REVIEW',
          sub_step: 0
        });

        agentMessage = gridResult.grid_rule_explanation + "\n\n" + PHASE_CONFIG['APPLICATION_REVIEW'].initialQuestion;
        nextPhase = 'APPLICATION_REVIEW';
        inputHint = { label: 'Submit Application', placeholder: 'e.g. Yes', disabled: false };
      }
      // Normal phase advancement
      else {
        nextPhase = config.nextPhase;
        const nextConfig = PHASE_CONFIG[nextPhase];
        await updateSession(token, { current_phase: nextPhase, sub_step: 0 });

        if (nextConfig?.initialQuestion) {
          agentMessage = nextConfig.initialQuestion;
        }

        // Set input hints per phase
        if (nextPhase === 'MFA_PHONE') {
          inputHint = { label: 'Phone Number', placeholder: 'e.g. 555-0198', disabled: false };
        } else if (nextPhase === 'MFA_CODE') {
          inputHint = { label: '6-Digit Code', placeholder: 'e.g. 123456', disabled: false };
        } else if (nextPhase === 'MEDICAL_RELEASE') {
          inputHint = { label: 'Awaiting Signature', placeholder: '', disabled: true };
        }
      }
    } else if (!agentMessage) {
      // Still in the same phase — ask for missing info using direct follow-up
      agentMessage = buildFollowUpQuestion(phase, formData, missingFields, extractedFields);
    }

    const progress = calculateProgress(formData);

    res.json({
      agentMessage,
      synthesisLabel: synthesisLabel || undefined,
      nextPhase,
      progressUpdate: progress,
      inputHint
    });

  } catch (err) {
    console.error('Turn error:', err);
    res.status(500).json({ error: 'Failed to process turn' });
  }
});

// ── Eligibility Assessment ──

app.get('/api/session/:token/eligibility', async (req, res) => {
  try {
    const result = await getEligibility(req.params.token);
    if (!result) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(result);
  } catch (err) {
    console.error('Eligibility error:', err);
    res.status(500).json({ error: 'Failed to compute eligibility' });
  }
});

// ── Start Server ──

app.listen(PORT, () => {
  console.log(`SSD Agent Backend running on http://localhost:${PORT}`);
});
