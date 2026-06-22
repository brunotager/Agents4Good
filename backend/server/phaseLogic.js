// ──────────────────────────────────────────────────────────────
// Phase Logic — Shared helpers extracted from index.js
// Used by both local Express server and Vercel serverless fns
// ──────────────────────────────────────────────────────────────

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
    nextPhase: 'MEDICAL_RELEASE',
    rejectPhase: 'ELIGIBILITY_REJECT',
    initialQuestion: "Is your medical condition expected to last at least 12 months, or is it indefinite?"
  },
  ELIGIBILITY_REJECT: {
    section: null, requiredFields: [], conditionalFields: {},
    nextPhase: null, initialQuestion: null
  },
  MFA_PHONE: {
    section: 'section_a_general',
    requiredFields: ['phone_number'],
    conditionalFields: {},
    nextPhase: 'MFA_CODE',
    initialQuestion: "To keep your data safe, what is your mobile phone number?"
  },
  MFA_CODE: {
    section: null, requiredFields: [], conditionalFields: {},
    nextPhase: 'MEDICAL_RELEASE',
    initialQuestion: "I've sent a 6-digit code to your phone. Please enter it now."
  },
  MEDICAL_RELEASE: {
    section: null, requiredFields: [], conditionalFields: {},
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
    section: 'section_blue_book', requiredFields: [], conditionalFields: {},
    nextPhase: 'STEP4_DEMOGRAPHICS', initialQuestion: null
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
    initialQuestion: "To complete your application, I need to list your jobs from the last 15 years. Let's start with your most recent one: what was your job title, and what kind of work did you do?"
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
    section: 'section_vocational', requiredFields: [], conditionalFields: {},
    nextPhase: 'STEP5_GRID_RESULT',
    initialQuestion: "Do you have any skills from past jobs that could be used in a different, less physical job? For example: computer skills, bookkeeping, customer service."
  },
  STEP5_GRID_RESULT: {
    section: null, requiredFields: [], conditionalFields: {},
    nextPhase: 'APPLICATION_REVIEW', initialQuestion: null
  },
  APPLICATION_REVIEW: {
    section: null, requiredFields: [], conditionalFields: {},
    nextPhase: 'APPLICATION_COMPLETE',
    initialQuestion: "We've collected all the necessary information. Are you ready to submit your application for review?"
  },
  APPLICATION_COMPLETE: {
    section: null, requiredFields: [], conditionalFields: {},
    nextPhase: null, initialQuestion: null
  }
};

// ── Progress calculation ──

function calculateProgress(formData) {
  const totalSections = 9;
  let complete = 0;
  let partial = 0;

  const checks = [
    { section: formData.section_sga, key: 'currently_working' },
    { section: formData.section_severity, key: 'condition_expected_to_last_12_months' },
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

  return {
    complete: Math.round((complete / totalSections) * 100),
    partial: Math.round((partial / totalSections) * 100)
  };
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

// ── Deterministic synthesis labels ──

function buildSynthesisLabel(phase, fields) {
  const keys = Object.keys(fields).filter(k => fields[k] !== null && fields[k] !== undefined);
  if (keys.length === 0) return 'No information was saved from your response.';

  if (phase === 'STEP1_SGA') {
    if (fields.reason_stopped_working) return 'Reason for stopping work saved.';
    if (fields.last_date_worked) return 'Last date worked saved.';
    if (fields.monthly_earnings) return `Monthly earnings: $${fields.monthly_earnings}.`;
    if (fields.hours_per_week) return `Weekly hours: ${fields.hours_per_week} hours.`;
    if (fields.work_type) {
      const typeLabels = {
        full_time: 'Full-time work',
        part_time: 'Part-time work',
        self_employed: 'Self-employed work',
        gig_work: 'Gig work',
        none: 'Not working'
      };
      return `${typeLabels[fields.work_type] || 'Work type'} recorded.`;
    }
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
  if (phase === 'STEP4_WORK_HISTORY') return 'Work history saved.';
  if (phase === 'STEP4_DAILY_ACTIVITIES') return 'Daily routine recorded.';
  if (phase === 'STEP4_ABILITIES') return 'Abilities information saved.';

  return 'Information saved.';
}

// ── Deterministic follow-up questions ──

const FOLLOW_UP_QUESTIONS = {
  'work_type': "What type of work are you doing? Is it full-time, part-time, self-employed, or gig work?",
  'hours_per_week': "About how many hours per week do you work?",
  'monthly_earnings': "How much do you earn per month before taxes?",
  'last_date_worked': "When was the last time you worked at any job?",
  'reason_stopped_working': "Why did you stop working?",
  'employer_name': "What was the name of your last employer?",
  'condition_expected_to_last_12_months': "Is your medical condition expected to last at least 12 months, or is it expected to be permanent?",
  'basic_work_activities_affected': "Which basic activities does your condition affect? For example: walking, standing, sitting, lifting, concentrating, remembering things.",
  'conditions': "What medical conditions prevent you from working? Please list all of them — physical and mental.",
  'age': "How old are you?",
  'education_level': "What is the highest level of education you completed?",
  'jobs_last_15_years': "To complete your application, I need to list your jobs from the last 15 years. Let's start with your most recent one: what was your job title, and what kind of work did you do?",
  'daily_routine': "Walk me through a typical day. What do you do from the time you wake up until you go to bed?",
  'affected_abilities': "How does your condition limit what you can do physically and mentally? For example, how far can you walk before you need to rest?"
};

function buildFollowUpQuestion(phase, formData, missingFields, extractedFields) {
  const savedKeys = Object.keys(extractedFields).filter(k => extractedFields[k] !== null && extractedFields[k] !== undefined);
  let ack = '';
  if (savedKeys.length > 0) ack = 'Thank you for that. ';

  const nextField = missingFields[0];
  const question = FOLLOW_UP_QUESTIONS[nextField];
  if (question) return ack + question;

  const readable = nextField ? nextField.replace(/_/g, ' ') : missingFields.join(', ').replace(/_/g, ' ');
  return `${ack}Could you tell me about your ${readable}?`;
}

// ── Fast keyword-based extraction for simple phases ──

function extractSGA(msg, session) {
  const lower = msg.toLowerCase();
  const result = {};

  // First, check if we have a pending earnings confirmation from the previous turn
  if (session && session.form_data && session.form_data.meta && session.form_data.meta.pending_earnings_value) {
    const pendingVal = session.form_data.meta.pending_earnings_value;
    const isConfirmation = /^(yes|yeah|yep|yup|correct|right|confirm|indeed|that'?s? ?right|per month|a month|monthly)/i.test(msg.trim()) ||
                           (lower.includes('yes') || lower.includes('month') || lower.includes('correct'));
    const isDenial = /^(no|nope|nah|wrong|hours)/i.test(msg.trim()) || lower.includes('hour') || lower.includes('no ');

    if (isConfirmation && !isDenial) {
      result.monthly_earnings = pendingVal;
      result._clear_pending_earnings = true;
      return result;
    } else {
      // User denied or gave other info, clear the pending state and proceed with normal extraction
      result._clear_pending_earnings = true;
    }
  }

  const notWorkingPatterns = [
    /^(no|nope|nah|not really|negative|no way)\b/,
    /\b(not|no|nope|nah|ain't|haven't been|haven't|don't|can't|cannot|unable)\b.*\b(work|employ|job)/,
    /\b(unemploy|disabled|off work|stopped work|quit|laid off|let go|fired|terminated)/,
    /\b(not? +(currently )?working)/,
    /\bno i'm not\b/,
    /\bnot at all\b/
  ];

  const workingPatterns = [
    /^(yes|yeah|yep|yup)\b/,
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
        if (/part[- ]?time/.test(lower)) result.work_type = 'part_time';
        else if (/full[- ]?time/.test(lower)) result.work_type = 'full_time';
        else if (/self[- ]?employ|freelanc|own business/.test(lower)) result.work_type = 'self_employed';
        else if (/gig|uber|lyft|doordash|instacart/.test(lower)) result.work_type = 'gig_work';
        break;
      }
    }
  }

  // Try to extract earnings
  const monthlyMatch = lower.match(/\$\s*([\d,]+)\s*(?:a|per|\/)?\s*(?:month|mo|monthly)\b/);
  const weeklyMatch = lower.match(/\$\s*([\d,]+)\s*(?:a|per|\/)?\s*(?:week|wk|weekly)\b/);
  const rawDollarMatch = lower.match(/\$\s*([\d,]+)/);
  const plainNumberMatch = lower.match(/\b([\d,]+)\b/);

  let extractedEarnings = null;
  let isSure = false;

  if (monthlyMatch) {
    extractedEarnings = parseInt(monthlyMatch[1].replace(/,/g, ''));
    isSure = true;
  } else if (weeklyMatch) {
    extractedEarnings = Math.round(parseInt(weeklyMatch[1].replace(/,/g, '')) * 4.33);
    isSure = true;
  } else if (rawDollarMatch) {
    extractedEarnings = parseInt(rawDollarMatch[1].replace(/,/g, ''));
  } else if (plainNumberMatch) {
    const val = parseInt(plainNumberMatch[1].replace(/,/g, ''));
    extractedEarnings = val;
  }

  if (extractedEarnings !== null) {
    // If the value is very low (< 100) and we are not sure (e.g. didn't specify "per month"),
    // ask for confirmation to avoid misinterpreting it.
    if (extractedEarnings < 100 && !isSure) {
      result._pending_earnings_value = extractedEarnings;
    } else {
      result.monthly_earnings = extractedEarnings;
    }
  }

  // Try to extract hours (supporting ranges like 5-8 averaging to 6.5, not rounded to 7)
  const hoursRangeMatch = lower.match(/(\d+)\s*(?:-|to)\s*(\d+)\s*(?:hours?|hrs?)/);
  if (hoursRangeMatch) {
    result.hours_per_week = (parseInt(hoursRangeMatch[1]) + parseInt(hoursRangeMatch[2])) / 2;
  } else {
    const hoursMatch = lower.match(/(\d+)\s*(?:hours?|hrs?)/);
    if (hoursMatch) {
      result.hours_per_week = parseInt(hoursMatch[1]);
    } else {
      const rangeMatch = lower.match(/(\d+)\s*(?:-|to)\s*(\d+)/);
      if (rangeMatch) {
        result.hours_per_week = (parseInt(rangeMatch[1]) + parseInt(rangeMatch[2])) / 2;
      } else {
        const numberMatch = lower.match(/\b(\d+)\b/);
        if (numberMatch) {
          const num = parseInt(numberMatch[1]);
          // Only map to hours if we didn't extract this number as an earnings confirmation or pending earnings
          if (num > 0 && num <= 100 && result._pending_earnings_value === undefined && result.monthly_earnings === undefined) {
            result.hours_per_week = num;
          }
        }
      }
    }
  }

  const reasonPatterns = [
    /because (?:of )?(?:my )?(.*?)(?:\.|$)/,
    /due to (?:my )?(.*?)(?:\.|$)/,
    /(?:can't|cannot|couldn't) work (?:because|due to) (.*?)(?:\.|$)/
  ];
  for (const pat of reasonPatterns) {
    const m = lower.match(pat);
    if (m && m[1]) { result.reason_stopped_working = m[1].trim(); break; }
  }

  return result;
}

function extractSeverity(msg) {
  const lower = msg.toLowerCase();
  const result = {};

  const permanentPatterns = [
    /\b(permanent|forever|indefinite|lifelong|life-?long|chronic|degenerative)\b/,
    /\b(rest of|end of) (my |their )?life\b/,
    /\b(never|won't|will not) (get better|heal|recover|go away|improve)\b/,
    /\b(always|for ?ever)\b/, /\b(until (i|I) die)\b/, /\bfor life\b/,
    /\b(terminal|incurable)\b/, /\bno cure\b/,
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

  if (result.condition_expected_to_last_12_months === undefined) {
    if (/\b(yes|yeah|yep|yup|definitely|absolutely|for sure)\b/.test(lower)) {
      result.condition_expected_to_last_12_months = true;
    }
  }

  if (result.condition_expected_to_last_12_months === undefined) {
    for (const pat of shortTermPatterns) {
      if (pat.test(lower)) { result.condition_expected_to_last_12_months = false; break; }
    }
  }

  if (result.condition_expected_to_last_12_months === undefined) {
    if (/^(no|nope|nah)\b/.test(lower.trim())) {
      result.condition_expected_to_last_12_months = false;
    }
  }

  const durationMatch = lower.match(/(\d+)\s*(year|yr|month|mo)/);
  if (durationMatch) {
    let months = parseInt(durationMatch[1]);
    if (/year|yr/.test(durationMatch[2])) months *= 12;
    result.condition_duration_months = months;
    result.condition_expected_to_last_12_months = months >= 12;
  }

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
    if (lower.includes(keyword)) activities.add(activity);
  }
  if (activities.size > 0) result.basic_work_activities_affected = [...activities];

  const conditionPatterns = [
    /my (.*?) is (completely |totally |fully )?(broken|damaged|gone|destroyed)/,
    /i (have|got|suffer from) (a )?(.*?)(?:\.|,|$)/,
    /(?:diagnosed with|dealing with) (.*?)(?:\.|,|$)/
  ];
  for (const pat of conditionPatterns) {
    const m = lower.match(pat);
    if (m) { result.severity_explanation = m[0].trim(); break; }
  }
  // Also try to extract any conditions mentioned during severity discussion
  const conditionKeywords = {
    // Limb loss — many ways people describe it
    'amputation': 'amputation', 'amputee': 'amputation', 'amputat': 'amputation',
    'blown off': 'limb loss', 'blew off': 'limb loss', 'blowed off': 'limb loss',
    'cut off': 'limb loss', 'lost my leg': 'limb loss', 'lost my arm': 'limb loss',
    'lost a leg': 'limb loss', 'lost an arm': 'limb loss', 'lost my hand': 'limb loss',
    'missing leg': 'limb loss', 'missing arm': 'limb loss', 'missing hand': 'limb loss',
    'no leg': 'limb loss', 'no arm': 'limb loss', 'prosthetic': 'limb loss', 'prosthes': 'limb loss',
    // Musculoskeletal
    'back pain': 'back pain', 'chronic pain': 'chronic pain', 'fibromyalgia': 'fibromyalgia',
    'arthritis': 'arthritis', 'herniated': 'herniated disc', 'slipped disc': 'herniated disc',
    'sciatica': 'sciatica', 'scoliosis': 'scoliosis', 'osteopor': 'osteoporosis',
    // Mental health
    'ptsd': 'PTSD', 'post-traumatic': 'PTSD', 'post traumatic': 'PTSD',
    'depression': 'depression', 'anxiety': 'anxiety disorder', 'bipolar': 'bipolar disorder',
    'schizophren': 'schizophrenia', 'panic attack': 'panic disorder',
    // Neurological
    'seizure': 'seizure disorder', 'epilep': 'epilepsy',
    'traumatic brain': 'traumatic brain injury', 'tbi': 'traumatic brain injury',
    'multiple sclerosis': 'multiple sclerosis',
    'parkinson': "Parkinson's disease", 'alzheimer': "Alzheimer's disease",
    // Organ / systemic
    'diabetes': 'diabetes', 'heart': 'heart condition', 'cardiac': 'heart condition',
    'cancer': 'cancer', 'copd': 'COPD', 'asthma': 'asthma', 'stroke': 'stroke',
    'lupus': 'lupus', 'crohn': "Crohn's disease", 'kidney': 'kidney disease',
    'liver': 'liver disease',
    // Sensory
    'blind': 'vision loss', 'deaf': 'hearing loss', 'hearing loss': 'hearing loss',
    // Spinal / paralysis
    'spinal': 'spinal cord injury', 'paralyz': 'paralysis', 'paraly': 'paralysis',
    'quadrip': 'quadriplegia', 'parapleg': 'paraplegia'
  };

  const mentionedConditions = new Set();
  for (const [keyword, condition] of Object.entries(conditionKeywords)) {
    if (lower.includes(keyword)) mentionedConditions.add(condition);
  }
  if (mentionedConditions.size > 0) {
    result._extracted_conditions = [...mentionedConditions];
  }

  return result;
}

module.exports = {
  PHASE_CONFIG,
  calculateProgress,
  getMissingFields,
  buildSynthesisLabel,
  buildFollowUpQuestion,
  extractSGA,
  extractSeverity,
  FOLLOW_UP_QUESTIONS
};
