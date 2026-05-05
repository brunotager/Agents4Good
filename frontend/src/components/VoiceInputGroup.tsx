import { ChangeEvent, KeyboardEvent, useState, useEffect } from 'react';

interface VoiceInputGroupProps {
  value: string;
  placeholder: string;
  label: string;
  disabled?: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
}

export function VoiceInputGroup({
  value,
  placeholder,
  label,
  disabled,
  onChange,
  onKeyDown
}: VoiceInputGroupProps) {
  const [showTooltip, setShowTooltip] = useState(true);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const handleInteract = () => {
    if (showTooltip) setShowTooltip(false);
  };

  const handleMicClick = () => {
    if (showTooltip) {
      setShowTooltip(false);
      return;
    }
    setShowToast(true);
  };

  return (
    <div className="input-group">
      <label htmlFor="userInput" className="persistent-label">{label}</label>
      <div className="input-wrapper">
        <input
          type="text"
          id="userInput"
          className="user-input"
          placeholder={placeholder}
          autoComplete="off"
          value={value}
          disabled={disabled}
          onChange={(e) => { handleInteract(); onChange(e); }}
          onKeyDown={(e) => { handleInteract(); onKeyDown(e); }}
          autoFocus
        />
        
        {showTooltip && (
          <div className="mic-tooltip">
            <button 
              className="tooltip-close" 
              onClick={(e) => { e.stopPropagation(); setShowTooltip(false); }}
              aria-label="Close tooltip"
            >
              &times;
            </button>
            If it's easier to say your answer, just tap on this microphone. When you see the blue waves moving, I am listening. Tap the red square to stop.
            <div className="tooltip-arrow"></div>
          </div>
        )}

        {showToast && (
          <div className="voice-toast">
            🎙️ Voice input is coming soon — waiting on that YC check to ship it! 😉
          </div>
        )}

        <button 
          className="voice-btn" 
          onClick={handleMicClick} 
          aria-label="Start Voice Input"
        >
          <svg viewBox="0 0 24 24" className="icon-solid voice-icon">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
