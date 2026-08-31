/**
 * Jedno formatowanie odliczanego czasu dla całej aplikacji.
 *
 * Do tej pory ta sama funkcja żyła w dwóch kopiach: „Czas" umiał pokazać
 * godziny (`formatSecondsToDigital`), „Skupienie" tylko minuty (`formatTime`).
 * Dwie kopie to dwie okazje, żeby licznik w jednym module zaczął wyglądać
 * inaczej niż w drugim — a użytkowniczka czyta oba tak samo.
 */

/**
 * Sekundy → `MM:SS`, a po przekroczeniu godziny → `H:MM:SS`.
 *
 * Godziny pojawiają się wyłącznie wtedy, gdy są potrzebne: krótka sesja nie ma
 * czytać się jako „0:25:00", bo wiodące zero czyta się wolniej niż samo „25:00".
 */
export function formatDuration(totalSeconds: number): string {
  // Wartości ujemne zbijamy do zera, ułamki w dół — obie dotychczasowe
  // implementacje kończyły odliczanie na „00:00" i nigdy nie pokazywały minusa.
  // NaN i nieskończoność też lądują na zerze: lepiej pusty licznik niż „NaN:NaN".
  const safe = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0;

  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  const mmss = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return hours > 0 ? `${hours}:${mmss}` : mmss;
}
