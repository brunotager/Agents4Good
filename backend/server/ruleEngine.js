// ──────────────────────────────────────────────────────────────
// Rule Engine — Deterministic SSA evaluation logic
// No LLM calls. Pure data lookups + threshold comparisons.
// ──────────────────────────────────────────────────────────────

const sgaData = require('./data/sga_thresholds.json');
const blueBookData = require('./data/blue_book_listings.json');
const gridData = require('./data/grid_rules.json');

// ── STEP 1: SGA ──────────────────────────────────────────────

function evaluateSGA(monthlyEarnings, isBlind = false, year = 2026) {
  const yearStr = String(year);
  const thresholds = sgaData.thresholds[yearStr] || sgaData.thresholds['2026'];
  const threshold = isBlind ? thresholds.blind : thresholds.non_blind;

  return {
    sga_threshold: threshold,
    sga_pass: monthlyEarnings < threshold,
    explanation: monthlyEarnings < threshold
      ? `Your monthly earnings of $${monthlyEarnings} are below the SGA limit of $${threshold}. You pass this step.`
      : `Your monthly earnings of $${monthlyEarnings} exceed the SGA limit of $${threshold}. This may affect your eligibility.`
  };
}

// ── STEP 2: SEVERITY ─────────────────────────────────────────

function evaluateSeverity(activitiesAffected = [], durationMonths, expectedToLast12) {
  const hasSevereCondition = activitiesAffected.length >= 1;
  const meetsDuration = expectedToLast12 === true ||
    durationMonths === 'indefinite' ||
    (typeof durationMonths === 'number' && durationMonths >= 12);

  return {
    severity_pass: hasSevereCondition && meetsDuration,
    explanation: !meetsDuration
      ? 'Your condition must be expected to last at least 12 months to qualify.'
      : !hasSevereCondition
        ? 'Your condition must significantly limit at least one basic work activity.'
        : `Your condition affects ${activitiesAffected.length} basic work activit${activitiesAffected.length === 1 ? 'y' : 'ies'} and meets the duration requirement.`
  };
}

// ── STEP 3: BLUE BOOK MATCHING ───────────────────────────────

function matchBlueBook(conditions = []) {
  if (!conditions.length) {
    return {
      matched_listing_id: null,
      matched_listing_name: null,
      body_system: null,
      match_confidence: 'none',
      evidence_checklist: [],
      meets_listing: 'needs_info',
      recommendation: 'We need to know your medical conditions to check against the SSA Blue Book listings.'
    };
  }

  const conditionsLower = conditions.map(c => c.toLowerCase());
  let bestMatch = null;
  let bestScore = 0;

  for (const listing of blueBookData.listings) {
    let score = 0;
    for (const keyword of listing.keywords) {
      for (const condition of conditionsLower) {
        if (condition.includes(keyword) || keyword.includes(condition)) {
          score += 2;
        } else {
          // Partial word match
          const words = keyword.split(' ');
          for (const word of words) {
            if (word.length > 3 && condition.includes(word)) {
              score += 1;
            }
          }
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = listing;
    }
  }

  if (!bestMatch || bestScore === 0) {
    return {
      matched_listing_id: null,
      matched_listing_name: null,
      body_system: null,
      match_confidence: 'none',
      evidence_checklist: [],
      meets_listing: 'unknown',
      recommendation: 'Your stated condition did not closely match any of the most common Blue Book listings. This does not mean you are ineligible — the SSA evaluates conditions not in the Blue Book based on their functional impact.'
    };
  }

  const confidence = bestScore >= 4 ? 'high' : bestScore >= 2 ? 'moderate' : 'low';

  return {
    matched_listing_id: bestMatch.id,
    matched_listing_name: bestMatch.name,
    body_system: bestMatch.body_system,
    match_confidence: confidence,
    evidence_checklist: bestMatch.required_evidence.map(item => ({
      item,
      has_evidence: false,
      user_notes: ''
    })),
    meets_listing: 'unknown',
    recommendation: `Your condition may match Blue Book Listing ${bestMatch.id}: ${bestMatch.name} (${bestMatch.body_system}). To strengthen your case, you should gather the following evidence:\n${bestMatch.required_evidence.map((e, i) => `${i + 1}. ${e}`).join('\n')}`
  };
}

// ── STEP 4: RESIDUAL FUNCTIONAL CAPACITY ─────────────────────

function determineRFC(abilities = {}) {
  const affected = abilities.affected_abilities || [];
  const explanations = abilities.ability_explanations || {};

  // Determine RFC level based on physical limitations
  const physicalAbilities = ['lifting', 'standing', 'walking', 'sitting', 'reaching', 'bending', 'kneeling', 'stair_climbing', 'squatting'];
  const mentalAbilities = ['memory', 'concentration', 'understanding', 'following_instructions', 'completing_tasks', 'using_hands', 'getting_along_with_others'];

  const physicalCount = affected.filter(a => physicalAbilities.includes(a)).length;
  const mentalCount = affected.filter(a => mentalAbilities.includes(a)).length;

  // Estimate RFC level from number and severity of limitations
  let rfcLevel;
  if (physicalCount >= 6) {
    rfcLevel = 'sedentary';
  } else if (physicalCount >= 4) {
    rfcLevel = 'light';
  } else if (physicalCount >= 2) {
    rfcLevel = 'medium';
  } else if (physicalCount >= 1) {
    rfcLevel = 'heavy';
  } else {
    rfcLevel = 'very_heavy'; // no physical limitations
  }

  // Check for specific severe limitations that override
  const liftingExplanation = (explanations.lifting || '').toLowerCase();
  if (liftingExplanation.includes('5 pound') || liftingExplanation.includes('5 lb') || liftingExplanation.includes('nothing')) {
    rfcLevel = 'sedentary';
  } else if (liftingExplanation.includes('10 pound') || liftingExplanation.includes('10 lb')) {
    rfcLevel = 'sedentary';
  } else if (liftingExplanation.includes('20 pound') || liftingExplanation.includes('20 lb')) {
    rfcLevel = 'light';
  }

  return {
    rfc_level: rfcLevel,
    physical_limitations: physicalCount,
    mental_limitations: mentalCount,
    total_limitations: affected.length
  };
}

// ── STEP 4b: PAST RELEVANT WORK ─────────────────────────────

function evaluatePastWork(workHistory = {}, rfcLevel) {
  const jobs = workHistory.jobs_last_15_years || [];

  if (jobs.length === 0) {
    return {
      can_return_to_past_work: false,
      highest_physical_demand: null,
      explanation: 'No past work history in the last 15 years.'
    };
  }

  const demandOrder = ['sedentary', 'light', 'medium', 'heavy', 'very_heavy'];
  const rfcIndex = demandOrder.indexOf(rfcLevel);

  // Find jobs the claimant could still do
  const possibleJobs = jobs.filter(job => {
    const jobIndex = demandOrder.indexOf(job.physical_demands || 'medium');
    return jobIndex <= rfcIndex;
  });

  const highestDemand = jobs.reduce((max, job) => {
    const jobIndex = demandOrder.indexOf(job.physical_demands || 'medium');
    const maxIndex = demandOrder.indexOf(max);
    return jobIndex > maxIndex ? (job.physical_demands || 'medium') : max;
  }, 'sedentary');

  return {
    can_return_to_past_work: possibleJobs.length > 0,
    highest_physical_demand: highestDemand,
    explanation: possibleJobs.length > 0
      ? `Based on your current abilities, you may still be able to perform ${possibleJobs.length} of your past job${possibleJobs.length > 1 ? 's' : ''}.`
      : `Your current physical limitations prevent you from returning to any of your past jobs. This is favorable for your claim.`
  };
}

// ── STEP 5: GRID RULES ──────────────────────────────────────

function getAgeCategory(age) {
  if (age >= 60) return 'close_to_retirement_60_plus';
  if (age >= 55) return 'advanced_55_59';
  if (age >= 50) return 'approaching_advanced_50_54';
  if (age >= 45) return 'younger_45_49';
  return 'younger_18_44';
}

function evaluateGridRules(age, educationLevel, rfcLevel, transferableSkills = []) {
  const ageCategory = getAgeCategory(age);
  const hasTransferable = transferableSkills.length > 0;

  // Medium/heavy/very_heavy RFC = many jobs exist = generally deny
  if (['medium', 'heavy', 'very_heavy'].includes(rfcLevel)) {
    return {
      grid_rule_result: 'deny',
      grid_rule_explanation: `With a ${rfcLevel} work capacity, there are many jobs in the national economy you could perform. The SSA's Grid Rules generally do not favor claimants at this RFC level.`,
      rule_id: null
    };
  }

  // Find matching grid rule
  const match = gridData.rules.find(rule =>
    rule.age === ageCategory &&
    rule.education === educationLevel &&
    rule.rfc === rfcLevel &&
    rule.transferable_skills === hasTransferable
  );

  if (match) {
    let explanation;
    if (match.decision === 'approve') {
      explanation = `At age ${age} with ${educationLevel.replace(/_/g, ' ')} education and a ${rfcLevel} work capacity, the SSA's Medical-Vocational Guidelines work in your favor. Grid Rule ${match.rule_id} directs a finding of "disabled."`;
    } else if (match.decision === 'deny') {
      explanation = `At age ${age} with ${educationLevel.replace(/_/g, ' ')} education and a ${rfcLevel} work capacity, the SSA's Grid Rules suggest there are jobs you could perform. Grid Rule ${match.rule_id}.`;
    } else {
      explanation = `At age ${age} with ${educationLevel.replace(/_/g, ' ')} education and a ${rfcLevel} work capacity, the SSA will evaluate your case individually. The Grid Rules do not direct a specific outcome (Rule ${match.rule_id}).`;
    }

    return {
      grid_rule_result: match.decision,
      grid_rule_explanation: explanation,
      rule_id: match.rule_id
    };
  }

  // No exact match — default to consider
  return {
    grid_rule_result: 'consider',
    grid_rule_explanation: `At age ${age} with ${educationLevel.replace(/_/g, ' ')} education and a ${rfcLevel} work capacity, your case will be evaluated individually. The Grid Rules do not have an exact match for your profile.`,
    rule_id: null
  };
}

// ── COMPOSITE ELIGIBILITY ASSESSMENT ─────────────────────────

function computeEligibility(formData) {
  const assessment = {
    step1_sga: 'needs_info',
    step2_severity: 'needs_info',
    step3_listing: 'needs_info',
    step4_past_work: 'needs_info',
    step5_other_work: 'needs_info',
    overall_likelihood: 0,
    strength_factors: [],
    risk_factors: [],
    missing_evidence: [],
    recommendation_summary: ''
  };

  let score = 50; // Base score

  // ── Step 1: SGA ──
  const sga = formData.section_sga || {};
  if (sga.currently_working === false || sga.monthly_earnings !== undefined) {
    if (sga.currently_working === false) {
      assessment.step1_sga = 'pass';
      score += 5;
      assessment.strength_factors.push('Not currently working — passes SGA check.');
    } else if (sga.monthly_earnings !== undefined) {
      const sgaResult = evaluateSGA(sga.monthly_earnings, sga.is_blind);
      assessment.step1_sga = sgaResult.sga_pass ? 'pass' : 'fail';
      if (sgaResult.sga_pass) {
        score += 5;
        assessment.strength_factors.push(`Earnings ($${sga.monthly_earnings}/mo) below SGA threshold.`);
      } else {
        score -= 30;
        assessment.risk_factors.push(`Earnings ($${sga.monthly_earnings}/mo) exceed SGA threshold — major risk.`);
      }
    }
  } else {
    assessment.missing_evidence.push('Employment status and earnings');
  }

  // ── Step 2: Severity ──
  const severity = formData.section_severity || {};
  if (severity.condition_expected_to_last_12_months !== undefined) {
    const sevResult = evaluateSeverity(
      severity.basic_work_activities_affected,
      severity.condition_duration_months,
      severity.condition_expected_to_last_12_months
    );
    assessment.step2_severity = sevResult.severity_pass ? 'pass' : 'fail';
    if (sevResult.severity_pass) {
      score += 10;
      const count = (severity.basic_work_activities_affected || []).length;
      assessment.strength_factors.push(`Condition affects ${count} basic work activit${count === 1 ? 'y' : 'ies'} and meets duration requirement.`);
    } else {
      score -= 20;
      assessment.risk_factors.push('Condition may not meet severity or duration requirements.');
    }
  } else {
    assessment.missing_evidence.push('Condition severity and duration details');
  }

  // ── Step 3: Blue Book ──
  const conditions = (formData.section_b_conditions || {}).conditions || [];
  if (conditions.length > 0) {
    const blueBook = matchBlueBook(conditions);
    if (blueBook.match_confidence === 'high') {
      assessment.step3_listing = 'meets';
      score += 20;
      assessment.strength_factors.push(`Condition closely matches Blue Book Listing ${blueBook.matched_listing_id}: ${blueBook.matched_listing_name}.`);
    } else if (blueBook.match_confidence === 'moderate') {
      assessment.step3_listing = 'equals';
      score += 10;
      assessment.strength_factors.push(`Condition may match Blue Book Listing ${blueBook.matched_listing_id}: ${blueBook.matched_listing_name}.`);
    } else {
      assessment.step3_listing = 'does_not_meet';
      assessment.risk_factors.push('Condition does not closely match a Blue Book listing — case proceeds to Steps 4-5.');
    }
    // Store evidence checklist
    formData.section_blue_book = blueBook;
  } else {
    assessment.missing_evidence.push('Medical conditions list');
  }

  // ── Step 4: RFC + Past Work ──
  const abilities = formData.section_d_abilities || {};
  const workHistory = formData.section_work_history || {};

  if (abilities.affected_abilities && abilities.affected_abilities.length > 0) {
    const rfc = determineRFC(abilities);

    if (workHistory.jobs_last_15_years) {
      const pastWork = evaluatePastWork(workHistory, rfc.rfc_level);
      assessment.step4_past_work = pastWork.can_return_to_past_work ? 'can_perform' : 'cannot_perform';

      if (!pastWork.can_return_to_past_work) {
        score += 10;
        assessment.strength_factors.push('Unable to return to any past relevant work.');
      } else {
        score -= 10;
        assessment.risk_factors.push('May be able to return to past work based on current abilities.');
      }
    } else {
      assessment.missing_evidence.push('Work history (last 15 years)');
    }

    // ── Step 5: Grid Rules ──
    const vocational = formData.section_vocational || {};
    if (vocational.age && vocational.education_level) {
      const gridResult = evaluateGridRules(
        vocational.age,
        vocational.education_level,
        rfc.rfc_level,
        vocational.transferable_skills
      );
      assessment.step5_other_work = gridResult.grid_rule_result === 'approve' ? 'cannot_adjust' :
        gridResult.grid_rule_result === 'deny' ? 'can_adjust' : 'needs_info';

      if (gridResult.grid_rule_result === 'approve') {
        score += 15;
        assessment.strength_factors.push(gridResult.grid_rule_explanation);
      } else if (gridResult.grid_rule_result === 'deny') {
        score -= 15;
        assessment.risk_factors.push(gridResult.grid_rule_explanation);
      } else {
        assessment.risk_factors.push(gridResult.grid_rule_explanation);
      }

      formData.section_vocational.grid_rule_result = gridResult.grid_rule_result;
      formData.section_vocational.grid_rule_explanation = gridResult.grid_rule_explanation;
    } else {
      assessment.missing_evidence.push('Age and education level for Grid Rules assessment');
    }
  } else {
    assessment.missing_evidence.push('Physical and mental abilities assessment (Section D)');
  }

  // ── Clamp score ──
  score = Math.max(5, Math.min(95, score));
  assessment.overall_likelihood = score;

  // ── Summary ──
  if (score >= 70) {
    assessment.recommendation_summary = 'Based on your profile, your claim has a strong likelihood of approval. Continue gathering supporting medical evidence.';
  } else if (score >= 45) {
    assessment.recommendation_summary = 'Your claim has a moderate likelihood of approval. Strengthening your medical evidence and documentation would improve your chances.';
  } else {
    assessment.recommendation_summary = 'Your claim may face challenges. Consider consulting with a disability attorney or advocate to review your case.';
  }

  return assessment;
}

module.exports = {
  evaluateSGA,
  evaluateSeverity,
  matchBlueBook,
  determineRFC,
  evaluatePastWork,
  getAgeCategory,
  evaluateGridRules,
  computeEligibility
};
