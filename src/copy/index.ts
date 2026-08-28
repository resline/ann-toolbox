export { common } from './common';
export { app } from './app';
export { teraz } from './teraz';
export { modules } from './modules';
export { plCount, plWith, type PluralForms } from './plural';

import { common } from './common';
import { app } from './app';
import { teraz } from './teraz';
import { modules } from './modules';

/** Wszystkie teksty w jednym miejscu — na potrzeby testu warstwy copy. */
export const allCopy = { common, app, teraz, modules } as const;
