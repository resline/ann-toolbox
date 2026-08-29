import type { TimeFormatStyle } from '../types';
import {
  formatDepartureAnnouncement,
  formatPolishTime,
  getDeclinedMinutes,
  getHourInWords,
  getMinuteInWords,
} from './polishTimeFormatter';

export const VOICE_PACK_ID = 'pl-PL-kore-gemini-3.1-v1';
export const VOICE_GRAMMAR_VERSION = 'pl-clock-fragments-v1';
export const VOICE_FRAGMENT_COUNT = 337;
export const VOICE_REGISTRY_SHA256 =
  'b88d01bcd3cdb82b559d1aec60e99cb59a4c38c37d73136544f697ddbe575504';

export type ProsodyRole =
  | 'initial-continuing'
  | 'medial-continuing'
  | 'neutral-terminal'
  | 'emphatic-terminal';

export type JoinClass = 'tight-word' | 'neutral-word' | 'colon' | 'sentence';

export interface VoiceFragmentDefinition {
  id: string;
  text: string;
  prosodyRole: ProsodyRole;
  promptId: string;
}

export interface PlannedFragment {
  id: string;
  joinAfter?: JoinClass;
}

export interface AnnouncementPlan {
  text: string;
  fragments: PlannedFragment[];
  usesGenericDepartureLabel?: boolean;
}

export interface TimePlanOptions {
  elapsedMinutes?: number;
  isSessionEnd?: boolean;
}

export type DepartureLabelId =
  | 'leave_home'
  | 'meeting'
  | 'transit'
  | 'medication'
  | 'cooking'
  | 'break'
  | 'generic';

const CARDINAL_UNITS = 'zero|jeden|dwa|trzy|cztery|pi\u0119\u0107|sze\u015b\u0107|siedem|osiem|dziewi\u0119\u0107|dziesi\u0119\u0107|jedena\u015bcie|dwana\u015bcie|trzyna\u015bcie|czterna\u015bcie|pi\u0119tna\u015bcie|szesna\u015bcie|siedemna\u015bcie|osiemna\u015bcie|dziewi\u0119tna\u015bcie'.split('|');

const CARDINAL_TENS = [
  'dwadzie\u015bcia',
  'trzydzie\u015bci',
  'czterdzie\u015bci',
  'pi\u0119\u0107dziesi\u0105t',
  'sze\u015b\u0107dziesi\u0105t',
  'siedemdziesi\u0105t',
  'osiemdziesi\u0105t',
  'dziewi\u0119\u0107dziesi\u0105t',
];

const CARDINAL_HUNDREDS = [
  'sto',
  'dwie\u015bcie',
  'trzysta',
  'czterysta',
  'pi\u0119\u0107set',
  'sze\u015b\u0107set',
  'siedemset',
  'osiemset',
  'dziewi\u0119\u0107set',
];

const SCALE_FORMS = [
  ['tysi\u0105c', 'tysi\u0105ce', 'tysi\u0119cy'],
  ['milion', 'miliony', 'milion\u00f3w'],
  ['miliard', 'miliardy', 'miliard\u00f3w'],
  ['bilion', 'biliony', 'bilion\u00f3w'],
  ['biliard', 'biliardy', 'biliard\u00f3w'],
] as const;

const DEPARTURE_LABELS: Record<DepartureLabelId, string> = {
  leave_home: 'Wyj\u015bcie z domu',
  meeting: 'Spotkanie',
  transit: 'Poci\u0105g lub autobus',
  medication: 'Leki',
  cooking: 'Gotowanie',
  break: 'Przerwa',
  generic: 'Wydarzenie',
};

const PRESET_TO_LABEL_ID = new Map<string, DepartureLabelId>(
  (Object.entries(DEPARTURE_LABELS) as Array<[DepartureLabelId, string]>)
    .filter(([id]) => id !== 'generic')
    .map(([id, text]) => [text.toLocaleLowerCase('pl-PL'), id])
);

function capitalize(value: string): string {
  return value.length === 0 ? value : value.charAt(0).toUpperCase() + value.slice(1);
}

function fragmentDefinition(
  id: string,
  text: string,
  prosodyRole: ProsodyRole
): VoiceFragmentDefinition {
  const promptId =
    prosodyRole === 'emphatic-terminal'
      ? 'clock-emphatic-final-v1'
      : prosodyRole === 'neutral-terminal'
        ? 'clock-neutral-final-v1'
        : prosodyRole === 'initial-continuing'
          ? 'clock-initial-cont-v1'
          : 'clock-medial-cont-v1';
  return { id, text, prosodyRole, promptId };
}

function addRange(
  target: VoiceFragmentDefinition[],
  prefix: string,
  from: number,
  to: number,
  getText: (value: number) => string,
  role: ProsodyRole
): void {
  for (let value = from; value <= to; value += 1) {
    target.push(fragmentDefinition(prefix + '.' + value, getText(value), role));
  }
}

function buildFragmentDefinitions(): VoiceFragmentDefinition[] {
  const definitions: VoiceFragmentDefinition[] = [];

  definitions.push(fragmentDefinition('fixed.jestGodzina.cont', 'Jest godzina', 'initial-continuing'));
  addRange(definitions, 'hour.precise.cont', 0, 23, getHourInWords, 'medial-continuing');
  addRange(definitions, 'hour.short.cont', 0, 23, (h) => capitalize(getHourInWords(h)), 'initial-continuing');
  addRange(definitions, 'hour.short.final', 0, 23, (h) => capitalize(getHourInWords(h)), 'neutral-terminal');
  definitions.push(fragmentDefinition('fixed.jest.cont', 'Jest', 'initial-continuing'));
  addRange(definitions, 'hour.current.cont', 0, 23, getHourInWords, 'medial-continuing');
  addRange(definitions, 'minute.digital.final', 0, 59, getMinuteInWords, 'neutral-terminal');

  addRange(
    definitions,
    'natural.after.cont',
    1,
    29,
    (m) =>
      m === 1
        ? 'Jedna minuta po'
        : m === 2
          ? 'Dwie po'
          : m === 22
            ? 'Dwadzieścia dwie po'
          : capitalize(cardinalText(m)) + ' po',
    'initial-continuing'
  );
  addRange(
    definitions,
    'natural.before.cont',
    1,
    29,
    (m) =>
      m === 1
        ? 'Za jedn\u0105 minut\u0119'
        : m === 2
          ? 'Za dwie'
          : m === 22
            ? 'Za dwadzieścia dwie'
          : 'Za ' + cardinalText(m),
    'initial-continuing'
  );
  definitions.push(fragmentDefinition('natural.wpolDo.cont', 'Wp\u00f3\u0142 do', 'initial-continuing'));
  addRange(
    definitions,
    'hour.genitive.afterPo.final',
    1,
    12,
    (h) => getHourInWords(h, 'genitive'),
    'neutral-terminal'
  );
  addRange(
    definitions,
    'hour.genitive.afterDo.final',
    1,
    12,
    (h) => getHourInWords(h, 'genitive'),
    'neutral-terminal'
  );
  addRange(
    definitions,
    'hour.nominative.afterBefore.final',
    1,
    12,
    getHourInWords,
    'neutral-terminal'
  );
  definitions.push(fragmentDefinition('natural.midnight.final', 'P\u00f3\u0142noc', 'neutral-terminal'));
  definitions.push(fragmentDefinition('natural.noon.final', 'Dwunasta w po\u0142udnie', 'neutral-terminal'));

  addRange(definitions, 'number.unit', 0, 19, (n) => CARDINAL_UNITS[n], 'medial-continuing');
  definitions.push(
    fragmentDefinition('number.minute.feminine.1', 'jedna', 'medial-continuing')
  );
  definitions.push(
    fragmentDefinition('number.minute.feminine.2', 'dwie', 'medial-continuing')
  );
  for (let index = 0; index < CARDINAL_TENS.length; index += 1) {
    const value = (index + 2) * 10;
    definitions.push(fragmentDefinition('number.tens.' + value, CARDINAL_TENS[index], 'medial-continuing'));
  }
  for (let index = 0; index < CARDINAL_HUNDREDS.length; index += 1) {
    const value = (index + 1) * 100;
    definitions.push(fragmentDefinition('number.hundreds.' + value, CARDINAL_HUNDREDS[index], 'medial-continuing'));
  }
  const scaleNames = ['thousand', 'million', 'billion', 'trillion', 'quadrillion'];
  const formNames = ['one', 'few', 'many'];
  SCALE_FORMS.forEach((forms, scaleIndex) => {
    forms.forEach((text, formIndex) => {
      definitions.push(
        fragmentDefinition(
          'number.scale.' + scaleNames[scaleIndex] + '.' + formNames[formIndex],
          text,
          'medial-continuing'
        )
      );
    });
  });

  definitions.push(fragmentDefinition('elapsed.minela.cont', 'Min\u0119\u0142a', 'initial-continuing'));
  definitions.push(fragmentDefinition('elapsed.minely.cont', 'Min\u0119\u0142y', 'initial-continuing'));
  definitions.push(fragmentDefinition('elapsed.minelo.cont', 'Min\u0119\u0142o', 'initial-continuing'));
  definitions.push(fragmentDefinition('elapsed.minuta.final', 'minuta', 'neutral-terminal'));
  definitions.push(fragmentDefinition('elapsed.minuty.final', 'minuty', 'neutral-terminal'));
  definitions.push(fragmentDefinition('elapsed.minut.final', 'minut', 'neutral-terminal'));
  definitions.push(
    fragmentDefinition('elapsed.sessionEnd.final', 'Czas sesji min\u0105\u0142', 'emphatic-terminal')
  );

  const departureFixed: Array<[string, string]> = [
    ['departure.czasNa.cont', 'Czas na'],
    ['departure.za.cont', 'Za'],
    ['departure.zaMinute.cont', 'Za minut\u0119'],
    ['departure.zaHalfMinute.cont', 'Za p\u00f3\u0142 minuty'],
    ['departure.lessThanMinute.cont', 'Mniej ni\u017c minuta do'],
    ['departure.minuty.cont', 'minuty'],
    ['departure.minut.cont', 'minut'],
  ];
  departureFixed.forEach(([id, text]) => {
    const role: ProsodyRole =
      id === 'departure.minuty.cont' || id === 'departure.minut.cont'
        ? 'medial-continuing'
        : 'initial-continuing';
    definitions.push(fragmentDefinition(id, text, role));
  });
  (Object.entries(DEPARTURE_LABELS) as Array<[DepartureLabelId, string]>).forEach(
    ([id, text]) => {
      definitions.push(
        fragmentDefinition('departure.label.' + id + '.countdown', text, 'neutral-terminal')
      );
      definitions.push(
        fragmentDefinition('departure.label.' + id + '.done', text, 'emphatic-terminal')
      );
    }
  );

  return definitions;
}

export const VOICE_FRAGMENT_DEFINITIONS = Object.freeze(buildFragmentDefinitions());
export const VOICE_FRAGMENT_REGISTRY = new Map(
  VOICE_FRAGMENT_DEFINITIONS.map((definition) => [definition.id, definition] as const)
);

if (VOICE_FRAGMENT_DEFINITIONS.length !== VOICE_FRAGMENT_COUNT) {
  throw new Error(
    'Voice fragment registry has ' +
      VOICE_FRAGMENT_DEFINITIONS.length +
      ' entries; expected ' +
      VOICE_FRAGMENT_COUNT +
      '.'
  );
}

function cardinalText(value: number): string {
  if (value < 20) return CARDINAL_UNITS[value];
  if (value < 100) {
    const tens = Math.floor(value / 10);
    const units = value % 10;
    return CARDINAL_TENS[tens - 2] + (units > 0 ? ' ' + CARDINAL_UNITS[units] : '');
  }
  const hundreds = Math.floor(value / 100);
  const remainder = value % 100;
  return CARDINAL_HUNDREDS[hundreds - 1] + (remainder > 0 ? ' ' + cardinalText(remainder) : '');
}

function scaleForm(value: number): 'one' | 'few' | 'many' {
  if (value === 1) return 'one';
  const mod10 = value % 10;
  const mod100 = value % 100;
  return mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)
    ? 'few'
    : 'many';
}

function planThreeDigitGroup(value: number): PlannedFragment[] {
  const result: PlannedFragment[] = [];
  const hundreds = Math.floor(value / 100);
  const remainder = value % 100;
  if (hundreds > 0) result.push({ id: 'number.hundreds.' + hundreds * 100, joinAfter: 'tight-word' });
  if (remainder > 0) {
    if (remainder < 20) {
      result.push({ id: 'number.unit.' + remainder, joinAfter: 'tight-word' });
    } else {
      const tens = Math.floor(remainder / 10) * 10;
      const units = remainder % 10;
      result.push({ id: 'number.tens.' + tens, joinAfter: units > 0 ? 'tight-word' : undefined });
      if (units > 0) result.push({ id: 'number.unit.' + units, joinAfter: 'tight-word' });
    }
  }
  return result;
}

export function planInteger(value: number): PlannedFragment[] {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError('The spoken number must be a non-negative safe integer.');
  }
  if (value === 0) return [{ id: 'number.unit.0' }];

  const groups: number[] = [];
  let remaining = value;
  while (remaining > 0) {
    groups.push(remaining % 1000);
    remaining = Math.floor(remaining / 1000);
  }

  const scaleNames = ['thousand', 'million', 'billion', 'trillion', 'quadrillion'];
  const result: PlannedFragment[] = [];
  for (let index = groups.length - 1; index >= 0; index -= 1) {
    const group = groups[index];
    if (group === 0) continue;
    if (index === 0 || group !== 1) result.push(...planThreeDigitGroup(group));
    if (index > 0) {
      result.push({
        id: 'number.scale.' + scaleNames[index - 1] + '.' + scaleForm(group),
        joinAfter: 'tight-word',
      });
    }
  }
  if (result.length > 0) result[result.length - 1].joinAfter = undefined;
  return result;
}

function planMinuteCount(
  value: number,
  feminineForm: 'none' | 'one' | 'two'
): PlannedFragment[] {
  const result = planInteger(value);
  const last = result[result.length - 1];
  if (!last) return result;

  if (feminineForm === 'one' && value === 1 && last.id === 'number.unit.1') {
    last.id = 'number.minute.feminine.1';
  } else if (feminineForm === 'two' && last.id === 'number.unit.2') {
    last.id = 'number.minute.feminine.2';
  }
  return result;
}

function currentTimeFragments(date: Date): PlannedFragment[] {
  if (date.getHours() === 0 && date.getMinutes() === 0) {
    return [
      { id: 'fixed.jest.cont', joinAfter: 'neutral-word' },
      { id: 'minute.digital.final.0' },
    ];
  }
  return [
    { id: 'fixed.jest.cont', joinAfter: 'neutral-word' },
    { id: 'hour.current.cont.' + date.getHours(), joinAfter: 'neutral-word' },
    { id: 'minute.digital.final.' + date.getMinutes() },
  ];
}

function planPrecise(date: Date): PlannedFragment[] {
  if (date.getHours() === 0 && date.getMinutes() === 0) {
    return [
      { id: 'fixed.jestGodzina.cont', joinAfter: 'neutral-word' },
      { id: 'minute.digital.final.0' },
    ];
  }
  return [
    { id: 'fixed.jestGodzina.cont', joinAfter: 'neutral-word' },
    { id: 'hour.precise.cont.' + date.getHours(), joinAfter: 'neutral-word' },
    { id: 'minute.digital.final.' + date.getMinutes() },
  ];
}

function planShort(date: Date): PlannedFragment[] {
  const hour = date.getHours();
  const minute = date.getMinutes();
  return minute === 0
    ? [{ id: 'hour.short.final.' + hour }]
    : [
        { id: 'hour.short.cont.' + hour, joinAfter: 'neutral-word' },
        { id: 'minute.digital.final.' + minute },
      ];
}

function planNatural(date: Date): PlannedFragment[] {
  const hour = date.getHours();
  const minute = date.getMinutes();
  if (minute === 0) {
    if (hour === 0) return [{ id: 'natural.midnight.final' }];
    if (hour === 12) return [{ id: 'natural.noon.final' }];
    const h12 = hour % 12 === 0 ? 12 : hour % 12;
    return [{ id: 'hour.short.final.' + h12 }];
  }
  const currentH12 = hour % 12 === 0 ? 12 : hour % 12;
  const nextH12 = (hour % 12) + 1;
  if (minute < 30) {
    return [
      { id: 'natural.after.cont.' + minute, joinAfter: 'neutral-word' },
      { id: 'hour.genitive.afterPo.final.' + currentH12 },
    ];
  }
  if (minute === 30) {
    return [
      { id: 'natural.wpolDo.cont', joinAfter: 'neutral-word' },
      { id: 'hour.genitive.afterDo.final.' + nextH12 },
    ];
  }
  return [
    { id: 'natural.before.cont.' + (60 - minute), joinAfter: 'neutral-word' },
    { id: 'hour.nominative.afterBefore.final.' + nextH12 },
  ];
}

function planElapsed(date: Date, options: TimePlanOptions): PlannedFragment[] {
  if (options.isSessionEnd) {
    return [
      { id: 'elapsed.sessionEnd.final', joinAfter: 'sentence' },
      ...currentTimeFragments(date),
    ];
  }
  const elapsedMinutes = Math.max(0, Math.floor(options.elapsedMinutes ?? 0));
  const declined = getDeclinedMinutes(elapsedMinutes);
  const verbId =
    declined.verb === 'Min\u0119\u0142a'
      ? 'elapsed.minela.cont'
      : declined.verb === 'Min\u0119\u0142y'
        ? 'elapsed.minely.cont'
        : 'elapsed.minelo.cont';
  const nounId =
    declined.noun === 'minuta'
      ? 'elapsed.minuta.final'
      : declined.noun === 'minuty'
        ? 'elapsed.minuty.final'
        : 'elapsed.minut.final';
  const feminineForm =
    declined.noun === 'minuta' ? 'one' : declined.noun === 'minuty' ? 'two' : 'none';
  const number = planMinuteCount(elapsedMinutes, feminineForm).map((item) => ({
    ...item,
    joinAfter: 'tight-word' as const,
  }));
  return [
    { id: verbId, joinAfter: 'tight-word' },
    ...number,
    { id: nounId, joinAfter: 'sentence' },
    ...currentTimeFragments(date),
  ];
}

export function planTimeAnnouncement(
  date: Date,
  style: TimeFormatStyle,
  options: TimePlanOptions = {}
): AnnouncementPlan {
  const fragments =
    style === 'natural'
      ? planNatural(date)
      : style === 'short'
        ? planShort(date)
        : style === 'elapsed'
          ? planElapsed(date, options)
          : planPrecise(date);

  return {
    text: formatPolishTime(date, style, options),
    fragments,
  };
}

export function resolveDepartureLabelId(label: string): DepartureLabelId {
  const normalized = label.trim().toLocaleLowerCase('pl-PL');
  return PRESET_TO_LABEL_ID.get(normalized) ?? 'generic';
}

function departureLabelFragment(
  labelId: DepartureLabelId,
  role: 'countdown' | 'done'
): PlannedFragment {
  return { id: 'departure.label.' + labelId + '.' + role };
}

function departureMinuteNounId(minutes: number): string {
  const mod10 = minutes % 10;
  const mod100 = minutes % 100;
  return mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)
    ? 'departure.minuty.cont'
    : 'departure.minut.cont';
}

export function planDepartureAnnouncement(
  remainingSeconds: number,
  label: string,
  targetTime?: Date,
  isDone?: boolean
): AnnouncementPlan {
  const safeRemaining = Math.max(0, Math.floor(remainingSeconds));
  const labelId = resolveDepartureLabelId(label);
  const usesGenericDepartureLabel = labelId === 'generic';
  let fragments: PlannedFragment[];

  if (isDone || safeRemaining <= 0) {
    fragments = [
      { id: 'departure.czasNa.cont', joinAfter: 'colon' },
      { ...departureLabelFragment(labelId, 'done'), joinAfter: targetTime ? 'sentence' : undefined },
    ];
    if (targetTime) fragments.push(...currentTimeFragments(targetTime));
  } else if (safeRemaining < 60) {
    fragments = [
      {
        id:
          safeRemaining <= 30
            ? 'departure.zaHalfMinute.cont'
            : 'departure.lessThanMinute.cont',
        joinAfter: 'colon',
      },
      departureLabelFragment(labelId, 'countdown'),
    ];
  } else {
    const minutes = Math.round(safeRemaining / 60);
    if (minutes === 1) {
      fragments = [
        { id: 'departure.zaMinute.cont', joinAfter: 'colon' },
        departureLabelFragment(labelId, 'countdown'),
      ];
    } else {
      const minuteNounId = departureMinuteNounId(minutes);
      const number = planMinuteCount(
        minutes,
        minuteNounId === 'departure.minuty.cont' ? 'two' : 'none'
      ).map((item) => ({ ...item, joinAfter: 'tight-word' as const }));
      fragments = [
        { id: 'departure.za.cont', joinAfter: 'tight-word' },
        ...number,
        { id: minuteNounId, joinAfter: 'colon' },
        departureLabelFragment(labelId, 'countdown'),
      ];
    }
    if (targetTime && safeRemaining >= 900) {
      fragments[fragments.length - 1].joinAfter = 'sentence';
      const currentTime = new Date(targetTime.getTime() - safeRemaining * 1000);
      fragments.push(...currentTimeFragments(currentTime));
    }
  }

  return {
    text: formatDepartureAnnouncement(safeRemaining, label, targetTime, isDone),
    fragments,
    usesGenericDepartureLabel,
  };
}

export function assertPlanIsResolvable(plan: AnnouncementPlan): void {
  for (const fragment of plan.fragments) {
    if (!VOICE_FRAGMENT_REGISTRY.has(fragment.id)) {
      throw new Error('Unknown voice fragment: ' + fragment.id);
    }
  }
}
