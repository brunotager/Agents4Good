import { StickyAction } from '../components/StickyAction';
import { RobotAvatar } from '../components/RobotAvatar';

interface WelcomeScreenProps {
  onStart: () => void;
}

export function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  return (
    <div className="welcome-screen">
      <header className="trust-badge">
        <svg className="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1ZM12 7C13.66 7 15 8.34 15 10V11H16C16.55 11 17 11.45 17 12V18C17 18.55 16.55 19 16 19H8C7.45 19 7 18.55 7 18V12C7 11.45 7.45 11 8 11H9V10C9 8.34 10.34 7 12 7ZM12 9C11.45 9 11 9.45 11 10V11H13V10C13 9.45 12.55 9 12 9Z" fill="#003366"/>
        </svg>
        Your information is secure
      </header>

      <main className="welcome-content">
        <div className="welcome-avatar-container">
            <RobotAvatar className="welcome-avatar" />
        </div>
        <h1 className="welcome-title">Apply for Social Security Disability</h1>
        <p className="welcome-description">
          Hi, I'm Anna, an AI assistant built to help with your application.<br/><br/>
          We will have a simple conversation. You can type or use your voice to answer. I will gather your details as we go and ask specific questions to get the exact information needed for your disability claim.<br/><br/>
          <strong>Are you ready?</strong>
        </p>
      </main>

      <footer className="welcome-footer">
        <StickyAction 
          disabled={false} 
          onClick={onStart} 
          label="I'm ready, let's go" 
        />
      </footer>
    </div>
  );
}
