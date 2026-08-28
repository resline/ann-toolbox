import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MicroTasksModule } from './components/MicroTasksModule';

describe('MicroTasksModule', () => {
  it('renders task decomposer modal and templates', async () => {
    render(<MicroTasksModule />);
    
    // Check initial state
    expect(screen.getByText('Mikro-Zadania')).toBeInTheDocument();
    
    // Open decomposer
    const newBtn = screen.getByRole('button', { name: /Własne Mikro-Zadanie/i });
    fireEvent.click(newBtn);
    
    // Check if modal opens
    expect(screen.getByText('Nowe Mikro-Zadanie')).toBeInTheDocument();
    
    // Enter task details
    const titleInput = screen.getByPlaceholderText('np. Posprzątać kuchnię');
    fireEvent.change(titleInput, { target: { value: 'My Custom Task' } });
    
    const stepInput = screen.getByPlaceholderText('Następny prosty krok...');
    fireEvent.change(stepInput, { target: { value: 'First step' } });
    
    // Add another step
    const addStepBtn = screen.getByRole('button', { name: /Dodaj kolejny krok/i });
    fireEvent.click(addStepBtn);
    
    const stepInputs = screen.getAllByPlaceholderText('Następny prosty krok...');
    fireEvent.change(stepInputs[1], { target: { value: 'Second step' } });
    
    // Save
    const startBtn = screen.getByRole('button', { name: /Rozpocznij Zadanie/i });
    fireEvent.click(startBtn);
    
    // Wait for modal to close and focus mode to open
    await waitFor(() => {
      expect(screen.queryByText('Nowe Mikro-Zadanie')).not.toBeInTheDocument();
    });
    
    // Check if SingleStepFocusView is rendered
    expect(screen.getByText('My Custom Task')).toBeInTheDocument();
    expect(screen.getByText('First step')).toBeInTheDocument();
  });

  it('renders active single-step view ("Tylko jeden krok na ekranie")', async () => {
    render(<MicroTasksModule />);
    
    // Create a task
    fireEvent.click(screen.getByRole('button', { name: /Własne Mikro-Zadanie/i }));
    fireEvent.change(screen.getByPlaceholderText('np. Posprzątać kuchnię'), { target: { value: 'Task 1' } });
    fireEvent.change(screen.getByPlaceholderText('Następny prosty krok...'), { target: { value: 'Step A' } });
    fireEvent.click(screen.getByRole('button', { name: /Rozpocznij Zadanie/i }));
    
    // Check if only one step is focused
    await waitFor(() => {
      expect(screen.getByText('Step A')).toBeInTheDocument();
    });
    // Check if focus mode exit button exists (View List -> Pełna lista)
    expect(screen.getByText('Pełna lista')).toBeInTheDocument();
  });

  it('marks step as completed and moving to next step', async () => {
    render(<MicroTasksModule />);
    
    // Create a task with 2 steps
    fireEvent.click(screen.getByRole('button', { name: /Własne Mikro-Zadanie/i }));
    fireEvent.change(screen.getByPlaceholderText('np. Posprzątać kuchnię'), { target: { value: 'Task 2' } });
    fireEvent.change(screen.getByPlaceholderText('Następny prosty krok...'), { target: { value: 'Step 1' } });
    fireEvent.click(screen.getByRole('button', { name: /Dodaj kolejny krok/i }));
    fireEvent.change(screen.getAllByPlaceholderText('Następny prosty krok...')[1], { target: { value: 'Step 2' } });
    fireEvent.click(screen.getByRole('button', { name: /Rozpocznij Zadanie/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Step 1')).toBeInTheDocument();
    });
    
    // Complete first step
    const completeBtn = screen.getByRole('button', { name: /Zrobione/i });
    fireEvent.click(completeBtn);
    
    // Check if next step is shown
    await waitFor(() => {
      expect(screen.getByText('Step 2')).toBeInTheDocument();
    });
  });

  it('renders celebration overlay when all steps are completed', async () => {
    render(<MicroTasksModule />);
    
    // Create a task with 1 step
    fireEvent.click(screen.getByRole('button', { name: /Własne Mikro-Zadanie/i }));
    fireEvent.change(screen.getByPlaceholderText('np. Posprzątać kuchnię'), { target: { value: 'Task 3' } });
    fireEvent.change(screen.getByPlaceholderText('Następny prosty krok...'), { target: { value: 'Only Step' } });
    fireEvent.click(screen.getByRole('button', { name: /Rozpocznij Zadanie/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Only Step')).toBeInTheDocument();
    });
    
    // Complete first (and only) step
    fireEvent.click(screen.getByRole('button', { name: /Zrobione/i }));
    
    // Check for celebration overlay
    await waitFor(() => {
      expect(screen.getByText('Gratulacje!')).toBeInTheDocument();
      expect(screen.getByText(/Wspaniale, Aniu!/i)).toBeInTheDocument();
    });
  });
});
