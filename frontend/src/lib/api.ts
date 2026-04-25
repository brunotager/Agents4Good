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

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const USE_MOCK = import.meta.env.VITE_USE_MOCK_API === 'true';

async function fetchWithTimeoutAndRetry(url: string, options: RequestInit, retries = 1): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 30000); // 30s timeout
  
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

// ---------------------------------------------------------
// MOCK IMPLEMENTATION
// ---------------------------------------------------------
const mockDelay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function getMockSessionStart(): Promise<ApiResponse> {
  await mockDelay(1000);
  return {
    sessionToken: 'mock-session-123',
    agentMessage: "Hi, I’m Anna. I’m here to help you navigate the Social Security Disability application.\n\nBefore we start, let’s see if you qualify so we don't waste your time.\n\nAre you currently working?",
    synthesisLabel: "Getting Started",
    nextPhase: 'PRE_FLIGHT_WORKING',
    progressUpdate: { complete: 0, partial: 0 },
    inputHint: { label: 'Yes / No', placeholder: 'e.g. No', disabled: false }
  };
}

async function getMockTurnResponse(userMessage: string, currentPhase: FlowState): Promise<ApiResponse> {
  await mockDelay(1500);
  const lowerMsg = userMessage.toLowerCase();

  switch (currentPhase) {
    case 'PRE_FLIGHT_WORKING':
      if (lowerMsg.includes('yes')) {
        return {
          agentMessage: "Because you are currently working, you likely exceed the Substantial Gainful Activity limits for SSDI.\n\nI recommend checking alternative resources before proceeding.",
          synthesisLabel: "Eligibility Failed",
          nextPhase: 'PRE_FLIGHT_REJECT',
          progressUpdate: { complete: 0, partial: 0 },
          inputHint: { label: 'Application Paused', placeholder: '', disabled: true }
        };
      }
      return {
        agentMessage: "Is your medical condition expected to last at least 12 months?",
        synthesisLabel: "Noted. You are not currently working.",
        nextPhase: 'PRE_FLIGHT_DURATION',
        progressUpdate: { complete: 5, partial: 0 },
        inputHint: { label: 'Yes / No', placeholder: 'e.g. Yes', disabled: false }
      };

    case 'PRE_FLIGHT_DURATION':
      if (lowerMsg.includes('no')) {
        return {
          agentMessage: "SSDI requires conditions to last at least 12 months. Let's redirect you to alternative resources.",
          synthesisLabel: "Eligibility Failed",
          nextPhase: 'PRE_FLIGHT_REJECT',
          progressUpdate: { complete: 0, partial: 0 },
          inputHint: { label: 'Application Paused', placeholder: '', disabled: true }
        };
      }
      return {
        agentMessage: "To keep your data safe, what is your mobile phone number?",
        synthesisLabel: "You passed the baseline eligibility checks!",
        nextPhase: 'MFA_PHONE',
        progressUpdate: { complete: 10, partial: 0 },
        inputHint: { label: 'Mobile Phone Number', placeholder: 'e.g. 555-0198', disabled: false }
      };

    case 'MFA_PHONE':
      return {
        agentMessage: "Sent a 6-digit code to your phone. Please enter the 6-digit code.",
        synthesisLabel: "Phone number saved.",
        nextPhase: 'MFA_CODE',
        progressUpdate: { complete: 15, partial: 0 },
        inputHint: { label: '6-Digit Security Code', placeholder: 'e.g. 123456', disabled: false }
      };

    case 'MFA_CODE':
      return {
        agentMessage: "To build your case, I'll need to look at your medical records. Do I have your permission to help you gather these?",
        synthesisLabel: "Identity securely verified.",
        nextPhase: 'MEDICAL_RELEASE',
        progressUpdate: { complete: 20, partial: 0 },
        inputHint: { label: 'Awaiting Signature', placeholder: '', disabled: true }
      };

    case 'MEDICAL_RELEASE':
      if (userMessage.startsWith('__SIGNED__')) {
        return {
          agentMessage: "How old are you?",
          synthesisLabel: "Medical Release SSA-827 signed securely.",
          nextPhase: 'WARMUP_BASELINE',
          progressUpdate: { complete: 25, partial: 0 },
          inputHint: { label: 'Your Age', placeholder: 'e.g. 62', disabled: false }
        };
      }
      throw new Error('Signature expected');

    case 'WARMUP_BASELINE':
      return {
        agentMessage: "What is the primary medical condition preventing you from working?",
        synthesisLabel: "Got it, age verified.",
        nextPhase: 'WARMUP_PAIN',
        progressUpdate: { complete: 35, partial: 15 },
        inputHint: { label: 'Primary Condition', placeholder: 'e.g. Severe back pain', disabled: false }
      };

    case 'WARMUP_PAIN':
      return {
        agentMessage: "Who is the main doctor treating your condition?",
        synthesisLabel: "I’ve noted your condition.",
        nextPhase: 'WARMUP_MAP',
        progressUpdate: { complete: 50, partial: 25 },
        inputHint: { label: 'Doctor Name', placeholder: 'e.g. Dr. Smith', disabled: false }
      };

    case 'WARMUP_MAP':
      return {
        agentMessage: "We've collected all the necessary initial information. Are you ready to submit your application for final processing?",
        synthesisLabel: "Dr. Smith has been added to your file.",
        nextPhase: 'APPLICATION_REVIEW',
        progressUpdate: { complete: 75, partial: 15 },
        inputHint: { label: 'Submit Application', placeholder: 'e.g. Yes', disabled: false }
      };

    case 'APPLICATION_REVIEW':
      return {
        agentMessage: "Your application has been successfully submitted! A representative will review it and contact you shortly.",
        synthesisLabel: "Application Complete",
        nextPhase: 'APPLICATION_COMPLETE',
        progressUpdate: { complete: 100, partial: 0 },
        inputHint: { label: 'Application Submitted', placeholder: '', disabled: true }
      };

    case 'APPLICATION_COMPLETE':
      return {
        agentMessage: "You have already completed the application.",
        synthesisLabel: "Application Complete",
        nextPhase: 'APPLICATION_COMPLETE',
        progressUpdate: { complete: 100, partial: 0 },
        inputHint: { label: 'Application Submitted', placeholder: '', disabled: true }
      };

    default:
      return getMockSessionStart();
  }
}

// ---------------------------------------------------------
// PUBLIC API EXPORTS
// ---------------------------------------------------------

export async function startSession(): Promise<ApiResponse> {
  if (USE_MOCK) return getMockSessionStart();

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
  if (USE_MOCK) return getMockTurnResponse(userMessage, currentPhase);

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
