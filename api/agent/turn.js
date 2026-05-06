// Vercel Serverless Function — POST /api/agent/turn

const cors = require('../_lib/cors');
const { getSession, updateSession } = require('../../backend/server/sessionStore');
const { extractFields, generateResponse } = require('../../backend/server/openRouterClient');
const { EXTRACTION_PROMPTS, getBlueBookRecommendationPrompt } = require('../../backend/server/agentPrompts');
const { matchBlueBook, evaluateSGA, evaluateGridRules, getAgeCategory, determineRFC } = require('../../backend/server/ruleEngine');
const {
  PHASE_CONFIG,
  calculateProgress,
  getMissingFields,
  buildSynthesisLabel,
  buildFollowUpQuestion,
  extractSGA,
  extractSeverity
} = require('../../backend/server/phaseLogic');

module.exports = cors(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

    if (phase === 'MFA_PHONE') {
      const phone = userMessage.replace(/[^\d+\-() ]/g, '').trim();
      await updateSession(token, {
        form_data: { section_a_general: { phone_number: phone || userMessage } },
        current_phase: 'MFA_CODE',
        sub_step: 0
      });
      const nextConfig = PHASE_CONFIG['MFA_CODE'];
      return res.json({
        agentMessage: nextConfig.initialQuestion,
        synthesisLabel: "Phone number saved.",
        nextPhase: 'MFA_CODE',
        progressUpdate: calculateProgress(session.form_data),
        inputHint: { label: '6-Digit Code', placeholder: 'e.g. 123456', disabled: false }
      });
    }

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

        // Check if conditions were already captured during severity
        const existingConditions = session.form_data.section_b_conditions?.conditions || [];
        let agentMessage;
        let inputHint;

        if (existingConditions.length > 0) {
          const conditionList = existingConditions.join(', ');
          agentMessage = `I already have ${conditionList} noted from what you told me earlier. I want to make sure your case is as strong as possible — are there any other conditions, physical or mental, that I should include? For example, some people also deal with chronic pain, depression, or anxiety.`;
          inputHint = { label: 'Additional Conditions', placeholder: 'e.g. PTSD, chronic pain, or "that\'s all"', disabled: false };
        } else {
          agentMessage = PHASE_CONFIG['STEP3_CONDITIONS'].initialQuestion;
          inputHint = { label: 'Your Conditions', placeholder: 'e.g. Back pain, depression', disabled: false };
        }

        return res.json({
          agentMessage,
          synthesisLabel: "Medical Release SSA-827 signed securely.",
          nextPhase: 'STEP3_CONDITIONS',
          progressUpdate: calculateProgress(session.form_data),
          inputHint
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
    if (phase === 'STEP1_SGA') {
      extractedFields = extractSGA(userMessage);
    } else if (phase === 'STEP2_SEVERITY') {
      extractedFields = extractSeverity(userMessage);
    } else if (phase === 'STEP3_CONDITIONS') {
      // If conditions already exist and user says "that's all", skip extraction
      const existing = session.form_data.section_b_conditions?.conditions || [];
      const noMore = /^(no|nope|nah|that'?s? ?(all|it|everything)|nothing else|none|just that|only that)\b/i.test(userMessage.trim());
      if (existing.length > 0 && noMore) {
        extractedFields = {}; // Don't overwrite — existing conditions are sufficient
        synthesisLabel = 'Got it — moving forward with your conditions on file.';
      } else {
        const extractionPrompt = EXTRACTION_PROMPTS[phase];
        if (extractionPrompt) {
          try {
            const raw = await extractFields(extractionPrompt, userMessage);
            for (const [key, val] of Object.entries(raw)) {
              if (val !== null && val !== undefined) {
                extractedFields[key] = val;
              }
            }
            // Merge with existing conditions
            if (extractedFields.conditions && existing.length > 0) {
              extractedFields.conditions = [...new Set([...existing, ...extractedFields.conditions])];
            }
          } catch (err) {
            console.error('Extraction failed, using empty:', err.message);
            extractedFields = {};
          }
        }
      }
    } else {
      const extractionPrompt = EXTRACTION_PROMPTS[phase];
      if (extractionPrompt) {
        try {
          const raw = await extractFields(extractionPrompt, userMessage);
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

      // If severity extraction found conditions mentioned, save them forward
      if (phase === 'STEP2_SEVERITY' && extractedFields._extracted_conditions) {
        const existing = session.form_data.section_b_conditions?.conditions || [];
        const merged = [...new Set([...existing, ...extractedFields._extracted_conditions])];
        await updateSession(token, { form_data: { section_b_conditions: { conditions: merged } } });
        delete extractedFields._extracted_conditions;
      }
    }

    // Refresh session after update
    const updatedSession = await getSession(token);
    const formData = updatedSession.form_data;

    // Step 3: Generate synthesis label LOCALLY
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

        nextPhase = 'STEP4_DEMOGRAPHICS';
        await updateSession(token, { current_phase: 'STEP4_DEMOGRAPHICS', sub_step: 0 });

        const demoConfig = PHASE_CONFIG['STEP4_DEMOGRAPHICS'];
        agentMessage += `\n\nNow let me collect some background information. ${demoConfig.initialQuestion}`;
        inputHint = { label: 'Your Age', placeholder: 'e.g. 58', disabled: false };
      }
      else if (phase === 'STEP5_VOCATIONAL') {
        const voc = formData.section_vocational || {};
        const abilities = formData.section_d_abilities || {};
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
      else {
        nextPhase = config.nextPhase;
        const nextConfig = PHASE_CONFIG[nextPhase];
        await updateSession(token, { current_phase: nextPhase, sub_step: 0 });

        if (nextConfig?.initialQuestion) {
          agentMessage = nextConfig.initialQuestion;
        }

        if (nextPhase === 'MFA_PHONE') {
          inputHint = { label: 'Phone Number', placeholder: 'e.g. 555-0198', disabled: false };
        } else if (nextPhase === 'MFA_CODE') {
          inputHint = { label: '6-Digit Code', placeholder: 'e.g. 123456', disabled: false };
        } else if (nextPhase === 'MEDICAL_RELEASE') {
          inputHint = { label: 'Awaiting Signature', placeholder: '', disabled: true };
        }
      }
    } else if (!agentMessage) {
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
