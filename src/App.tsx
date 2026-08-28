import React from 'react';
import { ThemeProvider } from './core/theme/ThemeContext';
import { RouterProvider } from './app/router';
import { AppShell } from './app/AppShell';

export const App: React.FC = () => (
  <ThemeProvider>
    <RouterProvider>
      <AppShell />
    </RouterProvider>
  </ThemeProvider>
);

export default App;
