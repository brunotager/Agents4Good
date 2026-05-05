// ──────────────────────────────────────────────────────────────
// SSA-3373-BK Function Report Schema + 5-Step Evaluation Fields
// ──────────────────────────────────────────────────────────────

export const ssa3373Schema = {
  type: "object",
  properties: {

    // ── META ──────────────────────────────────────────────────
    meta: {
      type: "object",
      properties: {
        form_id: { type: "string", const: "SSA-3373-BK" },
        version: { type: "string", const: "02-2024" },
        created_at: { type: "string" }
      }
    },

    // ──────────────────────────────────────────────────────────
    // STEP 1: SUBSTANTIAL GAINFUL ACTIVITY (SGA)
    // ──────────────────────────────────────────────────────────
    section_sga: {
      type: "object",
      properties: {
        currently_working: { type: "boolean" },
        work_type: {
          type: "string",
          enum: ["full_time", "part_time", "self_employed", "gig_work", "none"]
        },
        hours_per_week: { type: "number" },
        monthly_earnings: { type: "number" },
        employer_name: { type: "string" },
        last_date_worked: { type: "string" },     // ISO date
        reason_stopped_working: { type: "string" },
        is_blind: { type: "boolean" },
        // Computed by rule engine — not user-supplied
        sga_threshold: { type: "number" },         // current year threshold
        sga_pass: { type: "boolean" }               // earnings < threshold
      }
    },

    // ──────────────────────────────────────────────────────────
    // STEP 2: SEVERITY & DURATION
    // ──────────────────────────────────────────────────────────
    section_severity: {
      type: "object",
      properties: {
        condition_duration_months: {
          type: ["number", "string"],              // number or "indefinite"
        },
        condition_expected_to_last_12_months: { type: "boolean" },
        condition_expected_to_result_in_death: { type: "boolean" },
        basic_work_activities_affected: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "walking", "standing", "sitting", "lifting", "carrying",
              "pushing", "pulling", "reaching", "handling",
              "seeing", "hearing", "speaking",
              "understanding", "remembering", "concentrating",
              "interacting_with_others", "adapting_to_changes"
            ]
          }
        },
        severity_explanation: { type: "string" },
        // Computed by rule engine
        severity_pass: { type: "boolean" }
      }
    },

    // ──────────────────────────────────────────────────────────
    // SECTION A: GENERAL INFORMATION (original SSA-3373-BK)
    // ──────────────────────────────────────────────────────────
    section_a_general: {
      type: "object",
      properties: {
        claimant_name: { type: "string" },
        ssn_last4: { type: "string" },
        phone_number: { type: "string" },

        contact_type: {
          type: "string",
          enum: ["your_number", "message_number", "none"]
        },

        residence_type: {
          type: "string",
          enum: [
            "house",
            "apartment",
            "boarding_house",
            "nursing_home",
            "shelter",
            "group_home",
            "other"
          ]
        },

        residence_other: { type: "string" },

        living_with: {
          type: "string",
          enum: [
            "alone",
            "family",
            "friends",
            "other"
          ]
        },

        living_with_other: { type: "string" }
      }
    },

    // ──────────────────────────────────────────────────────────
    // SECTION B: CONDITIONS (original SSA-3373-BK)
    // ──────────────────────────────────────────────────────────
    section_b_conditions: {
      type: "object",
      properties: {
        conditions: {
          type: "array",
          items: { type: "string" }
        },

        work_limitations: {
          type: "string"
        }
      }
    },

    // ──────────────────────────────────────────────────────────
    // STEP 3: BLUE BOOK LISTING MATCH
    // ──────────────────────────────────────────────────────────
    section_blue_book: {
      type: "object",
      properties: {
        matched_listing_id: { type: "string" },       // e.g. "1.04"
        matched_listing_name: { type: "string" },      // e.g. "Disorders of the Spine"
        body_system: { type: "string" },               // e.g. "Musculoskeletal"
        match_confidence: {
          type: "string",
          enum: ["high", "moderate", "low", "none"]
        },
        evidence_checklist: {
          type: "array",
          items: {
            type: "object",
            properties: {
              item: { type: "string" },
              has_evidence: { type: "boolean" },
              user_notes: { type: "string" }
            }
          }
        },
        meets_listing: {
          type: "string",
          enum: ["yes", "no", "partial", "unknown"]
        },
        recommendation: { type: "string" }             // Human-friendly recommendation
      }
    },

    // ──────────────────────────────────────────────────────────
    // SECTION C: DAILY ACTIVITIES (original SSA-3373-BK)
    // ──────────────────────────────────────────────────────────
    section_c_daily_activities: {
      type: "object",
      properties: {
        daily_routine: { type: "string" },

        care_for_others: { type: "boolean" },
        care_for_others_details: { type: "string" },

        care_for_pets: { type: "boolean" },
        care_for_pets_details: { type: "string" },

        receives_help_caring: { type: "boolean" },
        receives_help_caring_details: { type: "string" },

        can_no_longer_do: { type: "string" },

        sleep_affected: { type: "boolean" },
        sleep_details: { type: "string" },

        personal_care_no_problem: { type: "boolean" },

        dress_limitations: { type: "string" },
        bathe_limitations: { type: "string" },
        hair_limitations: { type: "string" },
        shave_limitations: { type: "string" },
        feed_self_limitations: { type: "string" },
        toilet_limitations: { type: "string" },
        personal_care_other: { type: "string" },

        grooming_reminders_needed: { type: "boolean" },
        grooming_reminders_details: { type: "string" },

        medicine_help_needed: { type: "boolean" },
        medicine_help_details: { type: "string" },

        prepares_meals: { type: "boolean" },
        meal_types: { type: "string" },
        meal_frequency: { type: "string" },
        meal_duration: { type: "string" },
        meal_changes: { type: "string" },
        no_meal_reason: { type: "string" },

        chores_can_do: { type: "string" },
        chores_frequency_duration: { type: "string" },
        chores_help_needed: { type: "boolean" },
        chores_help_details: { type: "string" },
        no_chores_reason: { type: "string" },

        goes_outside_frequency: { type: "string" },
        no_outside_reason: { type: "string" },

        transportation_methods: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "walk",
              "drive",
              "ride_car",
              "bicycle",
              "public_transport",
              "other"
            ]
          }
        },

        transportation_other: { type: "string" },

        goes_out_alone: { type: "boolean" },
        cannot_go_out_alone_reason: { type: "string" },

        drives: { type: "boolean" },
        no_drive_reason: { type: "string" },

        shopping_methods: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "stores",
              "phone",
              "mail",
              "computer"
            ]
          }
        },

        shops_for: { type: "string" },
        shopping_frequency_duration: { type: "string" },

        pay_bills: { type: "boolean" },
        savings_account: { type: "boolean" },
        count_change: { type: "boolean" },
        use_checkbook: { type: "boolean" },
        money_limitations_explained: { type: "string" },

        money_changed_since_condition: { type: "boolean" },
        money_changed_details: { type: "string" },

        hobbies_interests: { type: "string" },
        hobbies_frequency_quality: { type: "string" },
        hobbies_changes: { type: "string" },

        social_methods: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "in_person",
              "phone",
              "email",
              "texting",
              "mail",
              "video_chat",
              "other"
            ]
          }
        },

        social_other: { type: "string" },

        activities_with_others: { type: "string" },
        social_frequency: { type: "string" },

        regular_places: { type: "string" },

        reminders_to_go_places: { type: "boolean" },
        participation_level: { type: "string" },

        needs_companion: { type: "boolean" },
        companion_reason: { type: "string" },

        gets_along_problems: { type: "boolean" },
        gets_along_details: { type: "string" }
      }
    },

    // ──────────────────────────────────────────────────────────
    // SECTION D: ABILITIES (SSA-3373-BK Q20-21 — previously missing)
    // ──────────────────────────────────────────────────────────
    section_d_abilities: {
      type: "object",
      properties: {
        affected_abilities: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "lifting", "squatting", "bending", "standing", "reaching",
              "walking", "sitting", "kneeling", "talking", "hearing",
              "stair_climbing", "seeing", "memory", "completing_tasks",
              "concentration", "understanding", "following_instructions",
              "using_hands", "getting_along_with_others"
            ]
          }
        },
        ability_explanations: {
          type: "object",
          // Key = ability name, value = explanation string
          // e.g. { "lifting": "Can only lift about 5 pounds" }
          additionalProperties: { type: "string" }
        },
        dominant_hand: {
          type: "string",
          enum: ["right", "left"]
        },
        walk_distance_before_rest: { type: "string" },
        rest_duration_before_resume: { type: "string" },
        attention_span: { type: "string" },
        finishes_what_started: { type: "boolean" },
        follows_written_instructions: { type: "string" },
        follows_spoken_instructions: { type: "string" },
        authority_relationship: { type: "string" },
        fired_for_interpersonal: { type: "boolean" },
        fired_details: { type: "string" },
        fired_employer_name: { type: "string" },
        handles_routine_changes: { type: "string" },
        unusual_behaviors_or_fears: { type: "boolean" },
        unusual_behaviors_details: { type: "string" },
        assistive_devices: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "crutches", "walker", "wheelchair", "cane",
              "brace_splint", "artificial_limb",
              "hearing_aid", "glasses_contacts", "other"
            ]
          }
        },
        assistive_devices_other: { type: "string" },
        devices_prescribed: { type: "boolean" }
      }
    },

    // ──────────────────────────────────────────────────────────
    // STEP 4: WORK HISTORY (for Past Relevant Work assessment)
    // ──────────────────────────────────────────────────────────
    section_work_history: {
      type: "object",
      properties: {
        jobs_last_15_years: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              employer: { type: "string" },
              start_date: { type: "string" },
              end_date: { type: "string" },
              hours_per_week: { type: "number" },
              physical_demands: {
                type: "string",
                enum: ["sedentary", "light", "medium", "heavy", "very_heavy"]
              },
              description: { type: "string" }
            }
          }
        },
        last_date_worked: { type: "string" },
        reason_stopped: { type: "string" },
        // Computed by rule engine
        highest_physical_demand: {
          type: "string",
          enum: ["sedentary", "light", "medium", "heavy", "very_heavy"]
        },
        can_return_to_past_work: { type: "boolean" }
      }
    },

    // ──────────────────────────────────────────────────────────
    // STEP 5: VOCATIONAL PROFILE (for Grid Rules assessment)
    // ──────────────────────────────────────────────────────────
    section_vocational: {
      type: "object",
      properties: {
        age: { type: "number" },
        date_of_birth: { type: "string" },
        age_category: {
          type: "string",
          enum: ["younger_18_44", "younger_45_49", "approaching_advanced_50_54", "advanced_55_59", "close_to_retirement_60_plus"]
        },
        education_level: {
          type: "string",
          enum: ["none", "some_high_school", "hs_diploma_ged", "some_college", "college_degree", "advanced_degree"]
        },
        literacy: { type: "boolean" },
        english_proficiency: {
          type: "string",
          enum: ["fluent", "limited", "none"]
        },
        transferable_skills: {
          type: "array",
          items: { type: "string" }
        },
        // Computed by rule engine
        grid_rule_result: {
          type: "string",
          enum: ["approve", "deny", "consider"]
        },
        grid_rule_explanation: { type: "string" }
      }
    },

    // ──────────────────────────────────────────────────────────
    // MEDICATIONS & SIDE EFFECTS (SSA-3373-BK Q22)
    // ──────────────────────────────────────────────────────────
    section_medications: {
      type: "object",
      properties: {
        takes_medications: { type: "boolean" },
        has_side_effects: { type: "boolean" },
        medications_with_side_effects: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              side_effects: { type: "string" }
            }
          }
        }
      }
    },

    // ──────────────────────────────────────────────────────────
    // REMARKS (original SSA-3373-BK Section E)
    // ──────────────────────────────────────────────────────────
    remarks: {
      type: "string"
    },

    // ──────────────────────────────────────────────────────────
    // COMPLETED BY (original SSA-3373-BK)
    // ──────────────────────────────────────────────────────────
    completed_by: {
      type: "object",
      properties: {
        name: { type: "string" },
        relationship: { type: "string" },
        address: { type: "string" },
        phone: { type: "string" }
      }
    },

    // ──────────────────────────────────────────────────────────
    // ELIGIBILITY ASSESSMENT (computed by rule engine)
    // ──────────────────────────────────────────────────────────
    eligibility_assessment: {
      type: "object",
      properties: {
        step1_sga: {
          type: "string",
          enum: ["pass", "fail", "needs_info"]
        },
        step2_severity: {
          type: "string",
          enum: ["pass", "fail", "needs_info"]
        },
        step3_listing: {
          type: "string",
          enum: ["meets", "equals", "does_not_meet", "needs_info"]
        },
        step4_past_work: {
          type: "string",
          enum: ["cannot_perform", "can_perform", "needs_info"]
        },
        step5_other_work: {
          type: "string",
          enum: ["cannot_adjust", "can_adjust", "needs_info"]
        },
        overall_likelihood: { type: "number" },  // 0-100
        strength_factors: {
          type: "array",
          items: { type: "string" }
        },
        risk_factors: {
          type: "array",
          items: { type: "string" }
        },
        missing_evidence: {
          type: "array",
          items: { type: "string" }
        },
        recommendation_summary: { type: "string" }
      }
    }
  }
};