import { useState, ChangeEvent, KeyboardEvent } from 'react';
import { SideDrawer } from '../components/SideDrawer';
import { ProgressTracker } from '../components/ProgressTracker';
import { ChatArea, Message } from '../components/ChatArea';
import { VoiceInputGroup } from '../components/VoiceInputGroup';
import { StickyAction } from '../components/StickyAction';
import { PrivacyToggle } from '../components/PrivacyToggle';
import { SignaturePad } from '../components/SignaturePad';

type FlowState = 
  | 'PRE_FLIGHT_WORKING'
  | 'PRE_FLIGHT_DURATION'
  | 'PRE_FLIGHT_REJECT'
  | 'MFA_PHONE'
  | 'MFA_CODE'
  | 'MEDICAL_RELEASE'
  | 'WARMUP_BASELINE'
  | 'WARMUP_PAIN'
  | 'WARMUP_MAP'
  | 'WARMUP_VOICE';

export function OnboardingScreen() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [progress, setProgress] = useState({ complete: 0, partial: 0, unanswered: 100 });
  const [flowState, setFlowState] = useState<FlowState>('PRE_FLIGHT_WORKING');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'agent',
      text: (
        <>
          <strong>Introduction:</strong> Hi, I’m Anna. I’m here to help you navigate the Social Security Disability application.<br/><br/>
          Before we start, let’s see if you qualify so we don't waste your time.<br/><br/>
          <strong>Question:</strong> Are you currently working?
        </>
      ),
    }
  ]);
  
  const [inputValue, setInputValue] = useState('');
  const [inputLabel, setInputLabel] = useState('Yes / No');
  const [inputPlaceholder, setInputPlaceholder] = useState('e.g. No');
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Handlers
  const toggleDrawer = () => setIsDrawerOpen(!isDrawerOpen);
  
  const sectionOrder = [
    'Eligibility Check',
    'Identity & Security',
    'Medical Release',
    'Phase 1: Baseline',
    'Phase 2: The Pain',
    'Phase 3: The Map',
    'Phase 4: Voice Setup'
  ];

  const getActiveSection = (state: FlowState) => {
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
      case 'WARMUP_VOICE': return 'Phase 4: Voice Setup';
    }
  };

  const currentSection = getActiveSection(flowState);
  const currentIndex = sectionOrder.indexOf(currentSection);

  const categories = sectionOrder.map((label, index) => {
    let status: 'complete' | 'partial' | 'unanswered' | 'active' = 'unanswered';
    if (index < currentIndex) status = 'complete';
    if (index === currentIndex) status = 'active';
    return { id: label, label, status };
  });

  const handleNavigate = (id: string) => {
    let targetState: FlowState = 'PRE_FLIGHT_WORKING';
    switch(id) {
      case 'Eligibility Check': targetState = 'PRE_FLIGHT_WORKING'; break;
      case 'Identity & Security': targetState = 'MFA_PHONE'; break;
      case 'Medical Release': targetState = 'MEDICAL_RELEASE'; break;
      case 'Phase 1: Baseline': targetState = 'WARMUP_BASELINE'; break;
      case 'Phase 2: The Pain': targetState = 'WARMUP_PAIN'; break;
      case 'Phase 3: The Map': targetState = 'WARMUP_MAP'; break;
      case 'Phase 4: Voice Setup': targetState = 'WARMUP_VOICE'; break;
    }
    
    setFlowState(targetState);
    addAgentMessage(
      <>
        <strong>Navigating:</strong> Let's review the {id} section.<br/><br/>
        What would you like to update? (Your previous answers have been saved).
      </>
    );
    setInputLabel(`Update ${id}`);
    setInputPlaceholder('Type update here...');
    setInputValue('');
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (flowState !== 'MEDICAL_RELEASE' && flowState !== 'PRE_FLIGHT_REJECT') {
        setInputValue(e.target.value);
    }
  };

  const handleVoiceClick = () => {
    if (flowState === 'MEDICAL_RELEASE' || flowState === 'PRE_FLIGHT_REJECT') return;
    if (isRecording) {
      setIsRecording(false);
      setInputPlaceholder('Listening stopped');
    } else {
      setIsRecording(true);
      setInputPlaceholder('Listening...');
      setInputValue('');
      if (navigator.vibrate) navigator.vibrate(50);
      setTimeout(() => {
        setIsRecording(false);
        setInputPlaceholder('');
        setInputValue('No'); // Default to No for testing flow
      }, 3000);
    }
  };

  const addAgentMessage = (text: React.ReactNode, delay = 1500) => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'agent', text }]);
    }, delay);
  };

  const handleSignature = (signature: string) => {
    const newUserMsg: Message = { id: Date.now().toString(), sender: 'user', text: `Signed: ${signature}` };
    setMessages(prev => [...prev, newUserMsg]);
    if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
    
    // Transition to Phase 1 Baseline
    setFlowState('WARMUP_BASELINE');
    setProgress({ complete: 25, partial: 0, unanswered: 75 });
    setInputLabel('Your Age');
    setInputPlaceholder('e.g. 62');
    setInputValue('');
    addAgentMessage(
      <>
        <strong>Action Taken:</strong> Medical Release SSA-827 signed securely.<br/><br/>
        <strong>Phase 1: Baseline</strong><br/><br/>
        <strong>Question:</strong> How old are you?
      </>
    );
  };

  const handleSubmit = () => {
    const val = inputValue.trim();
    if (!val && flowState !== 'MEDICAL_RELEASE' && flowState !== 'PRE_FLIGHT_REJECT') return;

    if (val) {
      const newUserMsg: Message = { id: Date.now().toString(), sender: 'user', text: val };
      setMessages(prev => [...prev, newUserMsg]);
      setInputValue('');
      if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
    }

    // STATE MACHINE LOGIC
    switch (flowState) {
      case 'PRE_FLIGHT_WORKING':
        if (val.toLowerCase().includes('yes')) {
          setFlowState('PRE_FLIGHT_REJECT');
          addAgentMessage(
            <>
              <strong>Notice:</strong> Because you are currently working, you likely exceed the Substantial Gainful Activity limits for SSDI.<br/><br/>
              I recommend checking alternative resources before proceeding.
            </>
          );
          setInputLabel('Application Paused');
          setInputPlaceholder('');
        } else {
          setFlowState('PRE_FLIGHT_DURATION');
          addAgentMessage(
            <>
              <strong>Synthesis:</strong> Noted. You are not currently working.<br/><br/>
              <strong>Question:</strong> Is your medical condition expected to last at least 12 months?
            </>
          );
          setInputLabel('Yes / No');
          setInputPlaceholder('e.g. Yes');
        }
        break;

      case 'PRE_FLIGHT_DURATION':
        if (val.toLowerCase().includes('no')) {
          setFlowState('PRE_FLIGHT_REJECT');
          addAgentMessage(
            <>
              <strong>Notice:</strong> SSDI requires conditions to last at least 12 months. Let's redirect you to alternative resources.
            </>
          );
          setInputLabel('Application Paused');
          setInputPlaceholder('');
        } else {
          setFlowState('MFA_PHONE');
          setProgress({ complete: 10, partial: 0, unanswered: 90 });
          addAgentMessage(
            <>
              <strong>Synthesis:</strong> You passed the baseline eligibility checks!<br/><br/>
              <strong>Security Handshake:</strong> To keep your data safe, what is your mobile phone number?
            </>
          );
          setInputLabel('Mobile Phone Number');
          setInputPlaceholder('e.g. 555-0198');
        }
        break;

      case 'MFA_PHONE':
        setFlowState('MFA_CODE');
        addAgentMessage(
          <>
            <strong>Action Taken:</strong> Sent a 6-digit code to your phone.<br/>
            <PrivacyToggle /><br/>
            <strong>Question:</strong> Please enter the 6-digit code.
          </>
        );
        setInputLabel('6-Digit Security Code');
        setInputPlaceholder('e.g. 123456');
        break;

      case 'MFA_CODE':
        setFlowState('MEDICAL_RELEASE');
        setProgress({ complete: 20, partial: 0, unanswered: 80 });
        addAgentMessage(
          <>
            <strong>Action Taken:</strong> Identity securely verified.<br/><br/>
            <strong>Medical Release:</strong> To build your case, I'll need to look at your medical records. Do I have your permission to help you gather these?<br/>
            <SignaturePad onSign={handleSignature} />
          </>
        );
        setInputLabel('Awaiting Signature');
        setInputPlaceholder('');
        break;

      case 'WARMUP_BASELINE':
        setFlowState('WARMUP_PAIN');
        setProgress({ complete: 35, partial: 15, unanswered: 50 });
        addAgentMessage(
          <>
            <strong>Synthesis:</strong> Got it, age verified.<br/><br/>
            <strong>Phase 2: The Pain</strong><br/><br/>
            <strong>Question:</strong> What is the primary medical condition preventing you from working?
          </>
        );
        setInputLabel('Primary Condition');
        setInputPlaceholder('e.g. Severe back pain');
        break;

      case 'WARMUP_PAIN':
        setFlowState('WARMUP_MAP');
        setProgress({ complete: 50, partial: 25, unanswered: 25 });
        addAgentMessage(
          <>
            <strong>Synthesis:</strong> I’ve noted your condition.<br/><br/>
            <strong>Phase 3: The Map</strong><br/><br/>
            <strong>Question:</strong> Who is the main doctor treating your condition?
          </>
        );
        setInputLabel('Doctor Name');
        setInputPlaceholder('e.g. Dr. Smith');
        break;

      case 'WARMUP_MAP':
        setFlowState('WARMUP_VOICE');
        setProgress({ complete: 75, partial: 15, unanswered: 10 });
        addAgentMessage(
          <>
            <strong>Synthesis:</strong> Dr. Smith has been added to your file. I will fetch their address later. <br/><span style={{color: 'var(--status-partial)', fontWeight: 'bold'}}>(Semi-Answered State)</span><br/><br/>
            <strong>Phase 4: Voice Setup</strong><br/><br/>
            <strong>Question:</strong> You can use your voice for the rest of this. Tap the microphone icon and say "Hello".
          </>
        );
        setInputLabel('Test Microphone');
        setInputPlaceholder('Tap mic to test');
        break;

      case 'WARMUP_VOICE':
        setProgress({ complete: 100, partial: 0, unanswered: 0 });
        addAgentMessage(
          <>
            <strong>Synthesis:</strong> Perfect! Your voice is set up.<br/><br/>
            <strong>Next Steps:</strong> We are ready to begin the formal application.
          </>
        );
        setInputLabel('Application Ready');
        setInputPlaceholder('');
        break;
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim().length > 0) {
      handleSubmit();
    }
  };

  const isInputDisabled = flowState === 'MEDICAL_RELEASE' || flowState === 'PRE_FLIGHT_REJECT';
  const isNextDisabled = isInputDisabled || inputValue.trim().length === 0;

  return (
    <>
      <SideDrawer 
        isOpen={isDrawerOpen} 
        onClose={toggleDrawer}
        categories={categories}
        onNavigate={handleNavigate}
      />
      <ProgressTracker 
        onMenuClick={toggleDrawer}
        complete={progress.complete}
        partial={progress.partial}
        unanswered={progress.unanswered}
      />
      <ChatArea messages={messages} isAnalyzing={isAnalyzing} />
      <footer className="input-area">
        <VoiceInputGroup 
          value={inputValue}
          placeholder={inputPlaceholder}
          label={inputLabel}
          isRecording={isRecording}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          onVoiceClick={handleVoiceClick}
        />
        {!isInputDisabled && (
          <StickyAction 
            disabled={isNextDisabled}
            onClick={handleSubmit}
            label="Next"
          />
        )}
      </footer>
    </>
  );
}
