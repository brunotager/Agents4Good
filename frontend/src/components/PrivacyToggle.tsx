import { useState } from 'react';

export function PrivacyToggle() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="privacy-toggle">
      <button 
        className="privacy-header" 
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span>🔒 Privacy Act Statement</span>
        <svg 
          viewBox="0 0 24 24" 
          width="20" 
          height="20" 
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
        >
          <path d="M7 10l5 5 5-5z" fill="currentColor"/>
        </svg>
      </button>
      {isOpen && (
        <div className="privacy-content">
          <p><strong>Why we ask:</strong> To securely verify your identity and work history.</p>
          <p style={{ marginTop: '8px' }}><strong>Who sees this:</strong> Only the Social Security Administration (SSA) and our secure agent.</p>
        </div>
      )}
    </div>
  );
}
