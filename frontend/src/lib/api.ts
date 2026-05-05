import { FlowState, isFlowState } from './phases';

export interface ProgressUpdate {
  complete: number;
  partial: number;
}

export interface InputHint {
  label: string;
  placeholder: string;
  disabled: boolean;
}

export interface ApiResponse {
  sessionToken?: string;
  agentMessage: string;
  synthesisLabel?: string;
  nextPhase: FlowState;
  progressUpdate: ProgressUpdate;
  inputHint: InputHint;
}

export interface EligibilityResult {
  assessment: {
    step1_sga: string;
    step2_severity: string;
    step3_listing: string;
    step4_past_work: string;
    step5_other_work: string;
    overall_likelihood: number;
    strength_factors: string[];
    risk_factors: string[];
    missing_evidence: string[];
    recommendation_summary: string;
  };
  form_data: Record<string, any>;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

async function fetchWithTimeoutAndRetry(url: string, options: RequestInit, retries = 1): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 30000);
  
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    
    if (!response.ok && response.status >= 500 && retries > 0) {
      console.warn(`Retrying API call to ${url}...`);
      return fetchWithTimeoutAndRetry(url, options, retries - 1);
    }
    
    return response;
  } catch (err: any) {
    clearTimeout(id);
    if (retries > 0) {
      console.warn(`Retrying API call to ${url} due to error...`);
      return fetchWithTimeoutAndRetry(url, options, retries - 1);
    }
    throw err;
  }
}

export async function startSession(): Promise<ApiResponse> {
  const response = await fetchWithTimeoutAndRetry(`${API_BASE}/api/session/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    throw new Error('Failed to start session');
  }

  const data = await response.json();
  if (!isFlowState(data.nextPhase)) {
    throw new Error(`Invalid phase returned from backend: ${data.nextPhase}`);
  }

  return data as ApiResponse;
}

export async function sendTurn(
  sessionToken: string, 
  userMessage: string, 
  currentPhase: FlowState
): Promise<ApiResponse> {
  const response = await fetchWithTimeoutAndRetry(`${API_BASE}/api/agent/turn`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionToken}`
    },
    body: JSON.stringify({ userMessage, currentPhase })
  });

  if (!response.ok) {
    throw new Error('Failed to send turn');
  }

  const data = await response.json();
  if (!isFlowState(data.nextPhase)) {
    throw new Error(`Invalid phase returned from backend: ${data.nextPhase}`);
  }

  return data as ApiResponse;
}

export async function getEligibility(sessionToken: string): Promise<EligibilityResult> {
  const response = await fetchWithTimeoutAndRetry(`${API_BASE}/api/session/${sessionToken}/eligibility`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Failed to get eligibility');
  }

  return await response.json();
}
