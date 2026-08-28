/**
 * Typy dla pojedynczych ikon lucide.
 *
 * Paczka lucide-react 0.475 mapuje w `exports` ścieżkę `./icons/*` na
 * `./dist/icons/*.d.ts`, ale tego katalogu w wysyłce nie ma — deklaracje
 * istnieją wyłącznie dla barrela. Bez tej deklaracji każdy głęboki import
 * jest `any`, a przy `strict` to błąd kompilacji.
 */
declare module 'lucide-react/icons/*' {
  import type { LucideIcon } from 'lucide-react';
  const icon: LucideIcon;
  export default icon;
}
