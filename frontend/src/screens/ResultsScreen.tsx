import { useState, useEffect } from 'react';
import { getEligibility, EligibilityResult } from '../lib/api';

interface ResultsScreenProps {
  sessionToken: string | null;
}

const STEP_LABELS: Record<string, string> = {
  step1_sga: 'Substantial Gainful Activity',
  step2_severity: 'Severity & Duration',
  step3_listing: 'Blue Book Listing Match',
  step4_past_work: 'Past Relevant Work',
  step5_other_work: 'Adjustment to Other Work'
};

const STATUS_COLORS: Record<string, string> = {
  pass: '#34C759',
  fail: '#FF3B30',
  meets: '#34C759',
  equals: '#66BB6A',
  does_not_meet: '#FFA726',
  cannot_perform: '#34C759',
  can_perform: '#FF3B30',
  cannot_adjust: '#34C759',
  can_adjust: '#FF3B30',
  needs_info: '#FFCC00',
  consider: '#FFA726',
  approve: '#34C759',
  deny: '#FF3B30'
};

const STATUS_LABELS: Record<string, string> = {
  pass: 'Pass',
  fail: 'Fail',
  meets: 'Meets Listing',
  equals: 'May Match',
  does_not_meet: 'No Match',
  cannot_perform: 'Cannot Return',
  can_perform: 'Could Return',
  cannot_adjust: 'Favorable',
  can_adjust: 'Unfavorable',
  needs_info: 'Needs Info',
  consider: 'Case-by-Case',
  approve: 'Favorable',
  deny: 'Unfavorable',
  unknown: 'Pending'
};

export function ResultsScreen({ sessionToken }: ResultsScreenProps) {
  const [stage, setStage] = useState(0);
  const [result, setResult] = useState<EligibilityResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionToken) {
      setStage(1);
      return;
    }
    const fetchResults = async () => {
      try {
        const data = await getEligibility(sessionToken);
        setResult(data);
        setTimeout(() => setStage(1), 2500);
      } catch (err) {
        setError('Failed to load results. Please try again.');
        setStage(1);
      }
    };
    fetchResults();
  }, [sessionToken]);

  const assessment = result?.assessment;
  const likelihood = assessment?.overall_likelihood ?? 50;

  // Gauge: strokeDasharray for a semicircle with r=40 is ~125.6
  const gaugeOffset = 125.6 - (125.6 * (likelihood / 100));

  return (
    <div className="welcome-wrapper" style={{ justifyContent: 'flex-start', alignItems: 'center', minHeight: '100dvh', display: 'flex', overflowY: 'auto' }}>
      <div className="main-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', textAlign: 'center', width: '100%', maxWidth: '400px', padding: '24px 16px' }}>
        
        {stage === 0 && (
          <div className="processing-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', marginTop: '40vh' }}>
            <div className="spinner" style={{ width: '48px', height: '48px', border: '4px solid var(--border-color)', borderTopColor: 'var(--primary-color)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Analyzing Your Profile...</h2>
            <div style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
              Running your information through the SSA's 5-step evaluation...
            </div>
          </div>
        )}
        
        {stage === 1 && assessment && (
          <div className="results-state" style={{ animation: 'fadeInDown 0.8s ease-out', width: '100%' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Approval Likelihood</h2>
            
            {/* Gauge */}
            <div style={{ position: 'relative', width: '240px', height: '120px', margin: '0 auto' }}>
              <svg viewBox="0 0 100 50" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#E0E0E0" strokeWidth="12" strokeLinecap="round" />
                <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="url(#gaugeGradient)" strokeWidth="12" strokeLinecap="round"
                  strokeDasharray="125.6" strokeDashoffset={gaugeOffset}
                  style={{ transition: 'stroke-dashoffset 1.5s ease-out' }} />
                <defs>
                  <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#FF3B30" />
                    <stop offset="50%" stopColor="#FFA726" />
                    <stop offset="100%" stopColor="#34C759" />
                  </linearGradient>
                </defs>
              </svg>
              <div style={{ position: 'absolute', bottom: '-20px', left: 0, width: '100%', textAlign: 'center', fontSize: '28px', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                {likelihood}%
              </div>
            </div>

            <p style={{ color: 'var(--text-secondary)', marginTop: '48px', marginBottom: '24px', fontSize: '15px', lineHeight: '1.6', textAlign: 'left' }}>
              {assessment.recommendation_summary}
            </p>

            {/* 5-Step Breakdown */}
            <div style={{ textAlign: 'left', width: '100%', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>5-Step Evaluation</h3>
              {Object.entries(STEP_LABELS).map(([key, label]) => {
                const status = (assessment as any)[key] || 'needs_info';
                return (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '15px' }}>{label}</span>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: STATUS_COLORS[status] || '#999', padding: '4px 10px', borderRadius: '12px', backgroundColor: `${STATUS_COLORS[status] || '#999'}15` }}>
                      {STATUS_LABELS[status] || status}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Strengths */}
            {assessment.strength_factors.length > 0 && (
              <div style={{ textAlign: 'left', width: '100%', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#34C759', marginBottom: '8px' }}>✅ Strengths</h3>
                {assessment.strength_factors.map((f, i) => (
                  <p key={i} style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '6px' }}>• {f}</p>
                ))}
              </div>
            )}

            {/* Risks */}
            {assessment.risk_factors.length > 0 && (
              <div style={{ textAlign: 'left', width: '100%', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#FF3B30', marginBottom: '8px' }}>⚠️ Risks</h3>
                {assessment.risk_factors.map((f, i) => (
                  <p key={i} style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '6px' }}>• {f}</p>
                ))}
              </div>
            )}

            {/* Missing Evidence */}
            {assessment.missing_evidence.length > 0 && (
              <div style={{ textAlign: 'left', width: '100%', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#FFA726', marginBottom: '8px' }}>📋 Still Needed</h3>
                {assessment.missing_evidence.map((e, i) => (
                  <p key={i} style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '6px' }}>• {e}</p>
                ))}
              </div>
            )}

            <button className="primary-action" onClick={() => setStage(2)}>See What Happens Next</button>
          </div>
        )}

        {stage === 1 && error && (
          <div style={{ marginTop: '40vh', color: 'var(--text-secondary)' }}>
            <p>{error}</p>
          </div>
        )}
        
        {stage === 2 && (
          <div style={{ animation: 'fadeInDown 0.8s ease-out', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '30vh' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '64px', height: '64px', marginBottom: '24px' }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '16px' }}>You're Ready</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '16px', lineHeight: '1.5' }}>
              This is your AI-powered eligibility assessment. In a full deployment, your completed application would be securely submitted to the Social Security Administration from here.
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5', marginTop: '16px', fontStyle: 'italic' }}>
              Built by Agents4Good — making government services accessible through AI.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
