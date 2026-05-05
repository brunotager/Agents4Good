import { useState } from 'react';
import { MobileLayout } from './components/MobileLayout';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { ResultsScreen } from './screens/ResultsScreen';

type ScreenState = 'welcome' | 'onboarding' | 'results';

function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenState>('welcome');
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  const handleOnboardingComplete = (token: string) => {
    setSessionToken(token);
    setCurrentScreen('results');
  };

  return (
    <MobileLayout>
      {currentScreen === 'welcome' && (
        <WelcomeScreen onStart={() => setCurrentScreen('onboarding')} />
      )}
      {currentScreen === 'onboarding' && (
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      )}
      {currentScreen === 'results' && (
        <ResultsScreen sessionToken={sessionToken} />
      )}
    </MobileLayout>
  );
}

export default App;
