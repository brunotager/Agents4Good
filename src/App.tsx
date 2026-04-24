import { useState } from 'react';
import { MobileLayout } from './components/MobileLayout';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';

type ScreenState = 'welcome' | 'onboarding';

function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenState>('welcome');

  return (
    <MobileLayout>
      {currentScreen === 'welcome' && (
        <WelcomeScreen onStart={() => setCurrentScreen('onboarding')} />
      )}
      {currentScreen === 'onboarding' && (
        <OnboardingScreen />
      )}
    </MobileLayout>
  );
}

export default App;
