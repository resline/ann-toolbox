import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders application title correctly', () => {
    render(<App />);
    expect(screen.getByText('Narzędziownik Ani')).toBeInTheDocument();
    expect(screen.getByText(/Zintegrowany pakiet narzędzi/i)).toBeInTheDocument();
  });
});
