import React from 'react';
import { ThemeProvider } from './core/theme/ThemeContext';
import { RouterProvider } from './app/router';
import { SpeakingClockProvider } from './modules/speaking-clock/hooks/useSpeakingClock';
import { AppShell } from './app/AppShell';

export const App: React.FC = () => (
  <ThemeProvider>
    <RouterProvider>
      <SpeakingClockProvider><AppShell /></SpeakingClockProvider>
    </RouterProvider>
  </ThemeProvider>
);

export default App;
