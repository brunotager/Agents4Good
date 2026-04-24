export const ssa3373Schema = {
  type: "object",
  properties: {
    meta: {
      type: "object",
      properties: {
        form_id: { type: "string", const: "SSA-3373-BK" },
        version: { type: "string", const: "02-2024" },
        created_at: { type: "string" }
      }
    },

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

    remarks: {
      type: "string"
    },

    completed_by: {
      type: "object",
      properties: {
        name: { type: "string" },
        relationship: { type: "string" },
        address: { type: "string" },
        phone: { type: "string" }
      }
    }
  }
};