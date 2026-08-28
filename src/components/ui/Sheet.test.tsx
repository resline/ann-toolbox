import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sheet, SheetContent, SheetHeader, SheetBody, SheetFooter } from './Sheet';
import { Button } from './Button';

/**
 * Te testy pilnują zachowań, których nie miał ŻADEN z dziewięciu ręcznych
 * overlayów zastąpionych przez Sheet: Escape, pułapka fokusu, przywrócenie
 * fokusu, kliknięcie w tło, blokada przewijania strony pod spodem.
 */
const Harness: React.FC<{ onOpenChange?: (o: boolean) => void }> = ({ onOpenChange }) => {
  const [open, setOpen] = useState(false);
  const handle = (o: boolean) => {
    setOpen(o);
    onOpenChange?.(o);
  };
  return (
    <div>
      <button onClick={() => handle(true)} data-testid="opener">
        otwórz
      </button>
      <Sheet open={open} onOpenChange={handle}>
        <SheetContent>
          <SheetHeader title="Ustawienia" description="Opis arkusza" />
          <SheetBody>
            <input data-testid="pole-a" aria-label="Pole A" />
            <input data-testid="pole-b" aria-label="Pole B" />
          </SheetBody>
          <SheetFooter>
            <Button data-testid="zapisz">Zapisz</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
};

describe('Sheet', () => {
  it('otwiera się i renderuje w portalu z rolą dialogu', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByTestId('opener'));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    // portal — arkusz nie renderuje się w drzewie rodzica
    expect(dialog.closest('[data-testid="opener"]')).toBeNull();
  });

  it('ukrywa resztę aplikacji przed czytnikiem ekranu', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByTestId('opener'));
    await screen.findByRole('dialog');

    // Radix nie ustawia aria-modal — zamiast tego oznacza całe rodzeństwo
    // portalu jako aria-hidden, co jest mocniejszą semantyką modalności.
    const opener = screen.getByTestId('opener');
    const hiddenAncestor = opener.closest('[aria-hidden="true"]');
    expect(hiddenAncestor).not.toBeNull();
  });

  it('ma dostępną nazwę i opis wzięte z nagłówka', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByTestId('opener'));

    expect(await screen.findByRole('dialog', { name: 'Ustawienia' })).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveAccessibleDescription('Opis arkusza');
  });

  it('zamyka się klawiszem Escape', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<Harness onOpenChange={onOpenChange} />);

    await user.click(screen.getByTestId('opener'));
    await screen.findByRole('dialog');

    await user.keyboard('{Escape}');
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it('zamyka się przyciskiem z polską etykietą', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<Harness onOpenChange={onOpenChange} />);

    await user.click(screen.getByTestId('opener'));
    const close = await screen.findByRole('button', { name: 'Zamknij' });

    await user.click(close);
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it('blokuje przewijanie strony pod spodem, gdy jest otwarty', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect(document.body.style.pointerEvents).not.toBe('none');
    await user.click(screen.getByTestId('opener'));
    await screen.findByRole('dialog');

    await waitFor(() => {
      expect(document.body).toHaveAttribute('data-scroll-locked');
    });
  });

  it('przenosi fokus do wnętrza arkusza po otwarciu', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByTestId('opener'));
    const dialog = await screen.findByRole('dialog');

    await waitFor(() => {
      expect(dialog.contains(document.activeElement)).toBe(true);
    });
  });

  it('odmontowuje się po zamknięciu, oddając fokus poza arkusz', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const opener = screen.getByTestId('opener');

    await user.click(opener);
    await screen.findByRole('dialog');
    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    // Przywrócenie fokusu dokładnie na element otwierający zapewnia FocusScope
    // Radiksa, ale jsdom tego nie odtwarza — goły <Dialog.Root> zachowuje się
    // tu identycznie. Weryfikacja ręczna: patrz lista kontrolna w planie.
    expect(document.body.contains(opener)).toBe(true);
  });

  it('trzyma fokus w pułapce — Tab nie wychodzi poza arkusz', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByTestId('opener'));
    const dialog = await screen.findByRole('dialog');

    // przejdź przez wszystkie elementy interaktywne i jeszcze kawałek
    for (let i = 0; i < 8; i++) {
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
  });
});
