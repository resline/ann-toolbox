import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { MicroTasksModule } from './components/MicroTasksModule';
import { useMicroTasksStore } from './store';

describe('MicroTasksModule', () => {
  beforeEach(() => {
    useMicroTasksStore.setState({
      tasks: [],
      userTemplates: [],
      taskHistory: [],
      activeTaskId: null,
      currentStepId: null
    });
    // Hydrate userTemplates
    useMicroTasksStore.getState().saveCustomTemplate({
        id: 't-test',
        title: 'Test Template',
        steps: [{ id: 's-1', title: 'Step 1', status: 'pending' }],
        category: 'home',
        isCustomTemplate: true
    });
  });

  it('renders TemplatesHubModal and filters categories', async () => {
    render(<MicroTasksModule />);
    
    const templatesHubBtn = screen.getByRole('button', { name: /Katalog Szablonów/i });
    fireEvent.click(templatesHubBtn);
    
    expect(screen.getByRole('heading', { name: 'Katalog Szablonów' })).toBeInTheDocument();
    
    const modal = screen.getByRole('dialog', { name: 'Katalog Szablonów' });
    expect(modal).toHaveTextContent('Test Template');
    
    // Filter by Praca (work)
    fireEvent.click(screen.getByRole('button', { name: 'Praca 💼' }));
    
    expect(modal).not.toHaveTextContent('Test Template');
  });

  it('adds an in-flight step in focus view', async () => {
    render(<MicroTasksModule />);
    
    fireEvent.click(screen.getByRole('button', { name: /Własne Mikro-Zadanie/i }));
    fireEvent.change(screen.getByPlaceholderText('np. Posprzątać kuchnię'), { target: { value: 'Task 1' } });
    fireEvent.change(screen.getByPlaceholderText('Następny prosty krok...'), { target: { value: 'Step A' } });
    fireEvent.click(screen.getByRole('button', { name: /Rozpocznij Zadanie/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Step A')).toBeInTheDocument();
    });

    const addInFlightBtn = screen.getByRole('button', { name: /\+ Dodaj kolejny krok w locie/i });
    fireEvent.click(addInFlightBtn);
    
    const input = screen.getByPlaceholderText('Wpisz nowy krok...');
    fireEvent.change(input, { target: { value: 'In-flight Step B' } });
    
    const submitBtn = screen.getByRole('button', { name: 'Dodaj' });
    fireEvent.click(submitBtn);
    
    fireEvent.click(screen.getByRole('button', { name: /Zrobione/i }));
    
    await waitFor(() => {
      expect(screen.getByText('In-flight Step B')).toBeInTheDocument();
    });
  });

  it('generates magic steps based on resistance slider', async () => {
    render(<MicroTasksModule />);
    
    fireEvent.click(screen.getByRole('button', { name: /Własne Mikro-Zadanie/i }));
    
    const titleInput = screen.getByPlaceholderText('np. Posprzątać kuchnię');
    fireEvent.change(titleInput, { target: { value: 'Test Magic' } });

    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '5' } });
    
    expect(screen.getByText(/Totalny paraliż\. Mikroskopijne kroki/i)).toBeInTheDocument();
    
    const magicBtn = screen.getByRole('button', { name: /Magicznie rozbij zadanie/i });
    fireEvent.click(magicBtn);
    
    const stepInputs = screen.getAllByPlaceholderText('Następny prosty krok...');
    expect((stepInputs[0] as HTMLInputElement).value).toBe('Wstań i stań przed zadaniem');
  });

  it('renders task history and shows completed tasks', async () => {
    useMicroTasksStore.getState().recordTaskCompletion({
      id: 'h-1',
      title: 'Historical Task',
      steps: [{ id: 's-h1', title: 'Step H1', status: 'completed' }],
      category: 'home'
    });

    render(<MicroTasksModule />);
    
    const historyBtn = screen.getByRole('button', { name: /Historia Sukcesów/i });
    fireEvent.click(historyBtn);
    
    expect(screen.getByRole('heading', { name: /Historia Sukcesów/i })).toBeInTheDocument();
    
    const modal = screen.getByRole('dialog', { name: /Historia Sukcesów/i });
    expect(modal).toHaveTextContent('Historical Task');
    
    const countSpan = screen.getByTestId('task-count');
    expect(countSpan.textContent).toBe('1');
  });

  it('marks step as completed and moving to next step', async () => {
    render(<MicroTasksModule />);
    fireEvent.click(screen.getByRole('button', { name: /Własne Mikro-Zadanie/i }));
    fireEvent.change(screen.getByPlaceholderText('np. Posprzątać kuchnię'), { target: { value: 'Task 2' } });
    fireEvent.change(screen.getByPlaceholderText('Następny prosty krok...'), { target: { value: 'Step 1' } });
    fireEvent.click(screen.getByRole('button', { name: /Dodaj kolejny krok/i }));
    fireEvent.change(screen.getAllByPlaceholderText('Następny prosty krok...')[1], { target: { value: 'Step 2' } });
    fireEvent.click(screen.getByRole('button', { name: /Rozpocznij Zadanie/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Step 1')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByRole('button', { name: /Zrobione/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Step 2')).toBeInTheDocument();
    });
  });
});
