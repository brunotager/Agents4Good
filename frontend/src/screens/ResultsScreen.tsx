import { useState, useEffect } from 'react';

export function ResultsScreen() {
  const [stage, setStage] = useState(0); // 0: processing, 1: results, 2: thank you

  useEffect(() => {
    const t = setTimeout(() => setStage(1), 3500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="welcome-wrapper" style={{ justifyContent: 'center', alignItems: 'center', minHeight: '100dvh', display: 'flex' }}>
      <div className="main-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px', textAlign: 'center', width: '100%', maxWidth: '400px' }}>
        
        {stage === 0 && (
          <div className="processing-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <div className="spinner" style={{ width: '48px', height: '48px', border: '4px solid var(--border-color)', borderTopColor: 'var(--primary-color)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Analyzing Profile...</h2>
            <div className="processing-text-cycle" style={{ color: 'var(--text-secondary)', height: '24px', overflow: 'hidden', position: 'relative' }}>
              <span style={{ position: 'absolute', width: '100%', left: 0, animation: 'slideUpText 3.5s ease-in-out' }}>Cross-referencing SSA Blue Book...</span>
            </div>
          </div>
        )}
        
        {stage === 1 && (
          <div className="results-state" style={{ animation: 'fadeInDown 0.8s ease-out', width: '100%' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '32px' }}>Approval Likelihood</h2>
            
            <div className="gauge-container" style={{ position: 'relative', width: '240px', height: '120px', margin: '0 auto' }}>
              <svg viewBox="0 0 100 50" className="gauge-svg" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#E0E0E0" strokeWidth="12" strokeLinecap="round" />
                <path className="gauge-fill" d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="url(#gaugeGradient)" strokeWidth="12" strokeLinecap="round" strokeDasharray="125.6" strokeDashoffset="125.6" />
                <defs>
                  <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#FFA726" />
                    <stop offset="100%" stopColor="#66BB6A" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="gauge-needle"></div>
              <div className="gauge-center-text" style={{ position: 'absolute', bottom: '-20px', left: '0', width: '100%', textAlign: 'center', fontSize: '28px', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                50%
              </div>
            </div>

            <p style={{ color: 'var(--text-secondary)', marginTop: '48px', marginBottom: '32px', fontSize: '15px', lineHeight: '1.5' }}>
              Based on your responses, your claim has a moderate likelihood of approval. We have gathered all necessary information.
            </p>
            <button className="primary-action" onClick={() => setStage(2)}>Submit to SSA</button>
          </div>
        )}
        
        {stage === 2 && (
          <div className="thank-you-state" style={{ animation: 'fadeInDown 0.8s ease-out', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '64px', height: '64px', marginBottom: '24px' }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '16px' }}>Thank You</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '16px', lineHeight: '1.5' }}>
              Your application has been securely submitted to the Social Security Administration.
              We will be in touch with your next steps shortly.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
