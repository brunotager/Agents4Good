import { useState, ChangeEvent, KeyboardEvent, useEffect } from 'react';
import { SideDrawer } from '../components/SideDrawer';
import { ProgressTracker } from '../components/ProgressTracker';
import { ChatArea, Message } from '../components/ChatArea';
import { VoiceInputGroup } from '../components/VoiceInputGroup';
import { StickyAction } from '../components/StickyAction';
import { SignaturePad } from '../components/SignaturePad';
import { FlowState, SECTION_ORDER, getActiveSection } from '../lib/phases';
import { startSession, sendTurn } from '../lib/api';

interface OnboardingScreenProps {
  onComplete?: (sessionToken: string) => void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [flowState, setFlowState] = useState<FlowState>('STEP1_SGA');
  const [progress, setProgress] = useState({ complete: 0, partial: 0, unanswered: 100 });
  
  const [messages, setMessages] = useState<Message[]>([]);
  
  const [inputValue, setInputValue] = useState('');
  const [inputLabel, setInputLabel] = useState('Connecting...');
  const [inputPlaceholder, setInputPlaceholder] = useState('');
  const [isInputDisabled, setIsInputDisabled] = useState(true);
  
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [loadingCategory, setLoadingCategory] = useState<'long' | 'completeness' | 'next'>('next');
  const [errorState, setErrorState] = useState<string | null>(null);

  // Initialize Session
  useEffect(() => {
    const boot = async () => {
      try {
        const data = await startSession();
        if (data.sessionToken) setSessionToken(data.sessionToken);
        
        setFlowState(data.nextPhase);
        setProgress({ ...data.progressUpdate, unanswered: 100 - data.progressUpdate.complete - data.progressUpdate.partial });
        setInputLabel(data.inputHint.label);
        setInputPlaceholder(data.inputHint.placeholder);
        setIsInputDisabled(data.inputHint.disabled);
        
        const initialMsg: Message = {
          id: Date.now().toString(),
          sender: 'agent',
          text: (
            <>
              {data.synthesisLabel && <div className="synthesis-crumb">{data.synthesisLabel}</div>}
              {data.agentMessage}
            </>
          )
        };
        setMessages([initialMsg]);
        setIsAnalyzing(false);
      } catch (err) {
        setErrorState('Failed to connect to the server.');
        setIsAnalyzing(false);
      }
    };
    boot();
  }, []);

  // Handlers
  const toggleDrawer = () => setIsDrawerOpen(!isDrawerOpen);
  
  const currentSection = getActiveSection(flowState);
  const currentIndex = SECTION_ORDER.indexOf(currentSection);

  const categories = SECTION_ORDER.map((label, index) => {
    let status: 'complete' | 'partial' | 'unanswered' | 'active' = 'unanswered';
    if (index < currentIndex) status = 'complete';
    if (index === currentIndex) status = 'active';
    return { id: label, label, status };
  });

  const handleNavigate = (_id: string) => {
    toggleDrawer();
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!isInputDisabled) {
        setInputValue(e.target.value);
    }
  };

  const handleVoiceClick = () => {
    if (isInputDisabled) return;
    if (isRecording) {
      setIsRecording(false);
    } else {
      setIsRecording(true);
      setInputValue('');
      if (navigator.vibrate) navigator.vibrate(50);
    }
  };

  const submitTurn = async (textToSubmit: string) => {
    if (!sessionToken) return;
    
    const newUserMsg: Message = { id: Date.now().toString(), sender: 'user', text: textToSubmit.startsWith('__SIGNED__') ? 'Signed: [Electronic Signature]' : textToSubmit };
    
    if (!errorState) {
        setMessages(prev => [...prev, newUserMsg]);
    }
    
    let nextCategory: 'long' | 'completeness' | 'next' = 'next';
    if (textToSubmit.length > 50) {
      nextCategory = 'long';
    } else if (progress.partial > 0) {
      nextCategory = 'completeness';
    }
    
    setLoadingCategory(nextCategory);
    setInputValue('');
    setIsAnalyzing(true);
    setErrorState(null);

    try {
      const data = await sendTurn(sessionToken, textToSubmit, flowState);
      
      if (data.nextPhase === 'APPLICATION_COMPLETE' && onComplete) {
        onComplete(sessionToken);
        return;
      }
      
      setFlowState(data.nextPhase);
      setProgress({ ...data.progressUpdate, unanswered: 100 - data.progressUpdate.complete - data.progressUpdate.partial });
      setInputLabel(data.inputHint.label);
      setInputPlaceholder(data.inputHint.placeholder);
      setIsInputDisabled(data.inputHint.disabled);
      
      const agentMsg: Message = {
        id: Date.now().toString(),
        sender: 'agent',
        text: (
          <>
            {data.synthesisLabel && <div className="synthesis-crumb">{data.synthesisLabel}</div>}
            {data.agentMessage}
          </>
        )
      };
      setMessages(prev => [...prev, agentMsg]);
    } catch (err) {
      setErrorState('Connection lost. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = () => {
    const val = inputValue.trim();
    if (!val || isInputDisabled) return;
    submitTurn(val);
  };

  const handleSignature = (signature: string) => {
    if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
    submitTurn(`__SIGNED__:${signature}`);
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim().length > 0) {
      handleSubmit();
    }
  };

  const isNextDisabled = isInputDisabled || inputValue.trim().length === 0;

  return (
    <>
      <SideDrawer 
        isOpen={isDrawerOpen} 
        onClose={toggleDrawer}
        categories={categories}
        onNavigate={handleNavigate}
      />
      <div className="main-content">
        <ProgressTracker 
          onMenuClick={toggleDrawer}
          complete={progress.complete}
          partial={progress.partial}
          unanswered={progress.unanswered}
        />
        
        <div className="chat-container">
          <ChatArea messages={messages} isAnalyzing={isAnalyzing} loadingCategory={loadingCategory} />
          
          {errorState && (
            <div className="error-retry" onClick={() => submitTurn(messages[messages.length-1].text as string)}>
              ⚠️ {errorState} <span style={{textDecoration: 'underline', cursor: 'pointer', fontWeight: 'bold'}}>Tap to Retry</span>
            </div>
          )}

          {flowState === 'MEDICAL_RELEASE' && !isAnalyzing && (
            <div style={{ padding: '0 24px', marginBottom: '16px' }}>
              <SignaturePad onSign={handleSignature} />
            </div>
          )}
        </div>

        <footer className="input-area">
          <div className="input-area-inner">
            <VoiceInputGroup 
              value={inputValue}
              placeholder={isRecording ? 'Listening...' : inputPlaceholder}
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
          </div>
        </footer>
      </div>
    </>
  );
}
