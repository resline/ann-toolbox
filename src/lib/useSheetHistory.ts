import { useEffect, useRef } from 'react';

/**
 * Wpina otwarty arkusz w historię przeglądarki.
 *
 * Bez tego przycisk Wstecz na Androidzie zamyka całą aplikację zamiast
 * zamknąć arkusz — w PWA to jest różnica między „działa" a „znowu mnie
 * wywaliło".
 *
 * Otwarcie dokłada wpis do historii, zamknięcie go zdejmuje, a `popstate`
 * (czyli Wstecz) zamyka arkusz zamiast nawigować.
 */
export function useSheetHistory(open: boolean, onClose: () => void): void {
  const pushed = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (typeof window === 'undefined' || !window.history) return;

    if (open && !pushed.current) {
      pushed.current = true;
      window.history.pushState({ __sheet: true }, '');
      return;
    }

    // Zamknięcie programowe (Escape, przycisk) — zdejmij własny wpis.
    // Gdy zamknięcie przyszło z popstate, flaga jest już wyczyszczona,
    // więc nie cofamy się dwa razy.
    if (!open && pushed.current) {
      pushed.current = false;
      window.history.back();
    }
  }, [open]);

  useEffect(() => {
    if (!open || typeof window === 'undefined') return;

    const handlePopState = () => {
      pushed.current = false;
      onCloseRef.current();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [open]);
}
