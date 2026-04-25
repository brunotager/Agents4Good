export type FlowState = 
  | 'PRE_FLIGHT_WORKING'
  | 'PRE_FLIGHT_DURATION'
  | 'PRE_FLIGHT_REJECT'
  | 'MFA_PHONE'
  | 'MFA_CODE'
  | 'MEDICAL_RELEASE'
  | 'WARMUP_BASELINE'
  | 'WARMUP_PAIN'
  | 'WARMUP_MAP'
  | 'APPLICATION_REVIEW'
  | 'APPLICATION_COMPLETE';

export const SECTION_ORDER = [
  'Eligibility Check',
  'Identity & Security',
  'Medical Release',
  'Phase 1: Baseline',
  'Phase 2: The Pain',
  'Phase 3: The Map',
  'Phase 4: Review & Submit'
];

export const VALID_PHASES: FlowState[] = [
  'PRE_FLIGHT_WORKING', 'PRE_FLIGHT_DURATION', 'PRE_FLIGHT_REJECT', 
  'MFA_PHONE', 'MFA_CODE', 'MEDICAL_RELEASE', 'WARMUP_BASELINE', 
  'WARMUP_PAIN', 'WARMUP_MAP', 'APPLICATION_REVIEW', 'APPLICATION_COMPLETE'
];

export function isFlowState(phase: any): phase is FlowState {
  return VALID_PHASES.includes(phase);
}

export function getActiveSection(state: FlowState): string {
  switch (state) {
    case 'PRE_FLIGHT_WORKING':
    case 'PRE_FLIGHT_DURATION':
    case 'PRE_FLIGHT_REJECT': return 'Eligibility Check';
    case 'MFA_PHONE':
    case 'MFA_CODE': return 'Identity & Security';
    case 'MEDICAL_RELEASE': return 'Medical Release';
    case 'WARMUP_BASELINE': return 'Phase 1: Baseline';
    case 'WARMUP_PAIN': return 'Phase 2: The Pain';
    case 'WARMUP_MAP': return 'Phase 3: The Map';
    case 'APPLICATION_REVIEW':
    case 'APPLICATION_COMPLETE': return 'Phase 4: Review & Submit';
    default: return 'Eligibility Check';
  }
}
