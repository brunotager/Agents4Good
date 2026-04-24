import { ChangeEvent, KeyboardEvent } from 'react';

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
          onChange={onChange}
          onKeyPress={onKeyPress}
          autoFocus
        />
        <button 
          className={`voice-btn ${isRecording ? 'recording' : ''}`} 
          onClick={onVoiceClick} 
          aria-label={isRecording ? "Stop Voice Input" : "Start Voice Input"}
        >
          <svg viewBox="0 0 24 24" className="icon-solid voice-icon">
            {isRecording ? (
              <path d="M6 6h12v12H6z" />
            ) : (
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            )}
          </svg>
        </button>
      </div>
    </div>
  );
}
