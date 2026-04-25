import { ChangeEvent, KeyboardEvent, useState } from 'react';

interface VoiceInputGroupProps {
  value: string;
  placeholder: string;
  label: string;
  isRecording: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onKeyPress: (e: KeyboardEvent<HTMLInputElement>) => void;
  onVoiceClick: () => void;
}

export function VoiceInputGroup({
  value,
  placeholder,
  label,
  isRecording,
  onChange,
  onKeyPress,
  onVoiceClick
}: VoiceInputGroupProps) {
  const [showTooltip, setShowTooltip] = useState(true);

  const handleInteract = () => {
    if (showTooltip) setShowTooltip(false);
  };

  return (
    <div className="input-group">
      <label htmlFor="userInput" className="persistent-label">{label}</label>
      <div className="input-wrapper">
        <input
          type="text"
          id="userInput"
          className={`user-input ${isRecording ? 'is-recording-input' : ''}`}
          placeholder={placeholder}
          autoComplete="off"
          value={value}
          onChange={(e) => { handleInteract(); onChange(e); }}
          onKeyPress={(e) => { handleInteract(); onKeyPress(e); }}
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

        {isRecording && (
          <div className="listening-indicator">
            <div className="audio-wave">
              <div className="bar"></div>
              <div className="bar"></div>
              <div className="bar"></div>
              <div className="bar"></div>
            </div>
          </div>
        )}

        <button 
          className={`voice-btn ${isRecording ? 'recording' : ''}`} 
          onClick={() => { handleInteract(); onVoiceClick(); }} 
          aria-label={isRecording ? "Stop Voice Input" : "Start Voice Input"}
        >
          {isRecording ? (
            <svg viewBox="0 0 24 24" className="icon-solid voice-icon">
              <path d="M6 6h12v12H6z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="icon-solid voice-icon">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
