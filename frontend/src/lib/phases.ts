export type FlowState = 
  | 'STEP1_SGA'
  | 'STEP2_SEVERITY'
  | 'ELIGIBILITY_REJECT'
  | 'MFA_PHONE'
  | 'MFA_CODE'
  | 'MEDICAL_RELEASE'
  | 'STEP3_CONDITIONS'
  | 'STEP3_BLUE_BOOK'
  | 'STEP4_DEMOGRAPHICS'
  | 'STEP4_WORK_HISTORY'
  | 'STEP4_DAILY_ACTIVITIES'
  | 'STEP4_ABILITIES'
  | 'STEP5_VOCATIONAL'
  | 'STEP5_GRID_RESULT'
  | 'APPLICATION_REVIEW'
  | 'APPLICATION_COMPLETE';

export const SECTION_ORDER = [
  'Eligibility: SGA',
  'Eligibility: Severity',
  'Identity & Security',
  'Medical Release',
  'Conditions & Blue Book',
  'Demographics & Work History',
  'Daily Activities',
  'Abilities (Section D)',
  'Vocational Assessment',
  'Review & Submit'
];

export const VALID_PHASES: FlowState[] = [
  'STEP1_SGA', 'STEP2_SEVERITY', 'ELIGIBILITY_REJECT',
  'MFA_PHONE', 'MFA_CODE', 'MEDICAL_RELEASE',
  'STEP3_CONDITIONS', 'STEP3_BLUE_BOOK',
  'STEP4_DEMOGRAPHICS', 'STEP4_WORK_HISTORY', 'STEP4_DAILY_ACTIVITIES', 'STEP4_ABILITIES',
  'STEP5_VOCATIONAL', 'STEP5_GRID_RESULT',
  'APPLICATION_REVIEW', 'APPLICATION_COMPLETE'
];

export function isFlowState(phase: any): phase is FlowState {
  return VALID_PHASES.includes(phase);
}

export function getActiveSection(state: FlowState): string {
  switch (state) {
    case 'STEP1_SGA': return 'Eligibility: SGA';
    case 'STEP2_SEVERITY':
    case 'ELIGIBILITY_REJECT': return 'Eligibility: Severity';
    case 'MFA_PHONE':
    case 'MFA_CODE': return 'Identity & Security';
    case 'MEDICAL_RELEASE': return 'Medical Release';
    case 'STEP3_CONDITIONS':
    case 'STEP3_BLUE_BOOK': return 'Conditions & Blue Book';
    case 'STEP4_DEMOGRAPHICS':
    case 'STEP4_WORK_HISTORY': return 'Demographics & Work History';
    case 'STEP4_DAILY_ACTIVITIES': return 'Daily Activities';
    case 'STEP4_ABILITIES': return 'Abilities (Section D)';
    case 'STEP5_VOCATIONAL':
    case 'STEP5_GRID_RESULT': return 'Vocational Assessment';
    case 'APPLICATION_REVIEW':
    case 'APPLICATION_COMPLETE': return 'Review & Submit';
    default: return 'Eligibility: SGA';
  }
}
