import { useState } from 'react';
import { MobileLayout } from './components/MobileLayout';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { ResultsScreen } from './screens/ResultsScreen';

type ScreenState = 'welcome' | 'onboarding' | 'results';

function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenState>('welcome');

  return (
    <MobileLayout>
      {currentScreen === 'welcome' && (
        <WelcomeScreen onStart={() => setCurrentScreen('onboarding')} />
      )}
      {currentScreen === 'onboarding' && (
        <OnboardingScreen onComplete={() => setCurrentScreen('results')} />
      )}
      {currentScreen === 'results' && (
        <ResultsScreen />
      )}
    </MobileLayout>
  );
}

export default App;
