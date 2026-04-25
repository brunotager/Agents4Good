interface ProgressTrackerProps {
  onMenuClick: () => void;
  complete: number;
  partial: number;
  unanswered: number;
}

export function ProgressTracker({ onMenuClick, complete, partial, unanswered }: ProgressTrackerProps) {
  return (
    <>
      {/* Trust Badge */}
      <header className="trust-badge" style={{ padding: '16px', alignItems: 'flex-start' }}>
        <svg className="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, marginTop: '2px' }}>
          <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1ZM12 7C13.66 7 15 8.34 15 10V11H16C16.55 11 17 11.45 17 12V18C17 18.55 16.55 19 16 19H8C7.45 19 7 18.55 7 18V12C7 11.45 7.45 11 8 11H9V10C9 8.34 10.34 7 12 7ZM12 9C11.45 9 11 9.45 11 10V11H13V10C13 9.45 12.55 9 12 9Z" fill="#003366"/>
        </svg>
        <span style={{ textAlign: 'left', fontSize: '13px', fontWeight: 'normal', lineHeight: '1.4', color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--primary-color)' }}>Your information is strictly private.</strong><br/>
          We use the same privacy and encryption standards as doctors and government agencies.
        </span>
      </header>

      {/* Progress Tracking */}
      <div className="progress-container">
        <div className="progress-header">
          <button className="menu-btn" onClick={onMenuClick} aria-label="Open Menu">
            <svg viewBox="0 0 24 24" className="icon-solid">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
            </svg>
          </button>
          <div className="progress-text">{complete}% Complete</div>
        </div>
        <div className="progress-bar-track">
          <div className="progress-segment complete" style={{ width: `${complete}%` }}></div>
          <div className="progress-segment partial" style={{ width: `${partial}%` }}></div>
          <div className="progress-segment unanswered" style={{ width: `${unanswered}%` }}></div>
        </div>
        <div className="progress-legend">
          <span className="legend-item"><span className="status-dot complete"></span>Complete</span>
          <span className="legend-item"><span className="status-dot partial"></span>Semi-answered</span>
          <span className="legend-item"><span className="status-dot unanswered"></span>Unanswered</span>
        </div>
      </div>
    </>
  );
}
