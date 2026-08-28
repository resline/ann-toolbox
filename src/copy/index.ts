export { common } from './common';
export { app } from './app';
export { teraz } from './teraz';
export { modules } from './modules';
export { czas } from './czas';
export { skupienie } from './skupienie';
export { energia } from './energia';
export { start } from './start';
export { plCount, plWith, type PluralForms } from './plural';

import { common } from './common';
import { app } from './app';
import { teraz } from './teraz';
import { modules } from './modules';
import { czas } from './czas';
import { skupienie } from './skupienie';
import { energia } from './energia';
import { start } from './start';

/** Wszystkie teksty w jednym miejscu — na potrzeby testu warstwy copy. */
export const allCopy = { common, app, teraz, modules, czas, skupienie, energia, start } as const;
