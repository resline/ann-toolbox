import React from 'react';
import { cn } from '../lib/cn';
import { app, common } from '../copy';
import { useTheme } from '../core/theme/ThemeContext';
import { THEME_LIST } from '../core/theme/theme';
import { useMotionPreference, type MotionPreference } from '../lib/motion';
import {
  Divider,
  RadioCards,
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  Text,
  Heading,
} from '../components/ui';
import type { ThemeId } from '../design/tokens';

const ThemeSwatch: React.FC<{ bg: string; card: string; accent: string }> = ({ bg, card, accent }) => (
  <span
    className="block w-10 h-10 rounded-control shadow-hairline overflow-hidden relative"
    style={{ backgroundColor: bg }}
    aria-hidden
  >
    <span className="absolute left-1.5 right-1.5 top-2 h-3 rounded-sm" style={{ backgroundColor: card }} />
    <span className="absolute left-1.5 bottom-2 w-4 h-2 rounded-sm" style={{ backgroundColor: accent }} />
  </span>
);

export interface SettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  version: string;
}

/**
 * Zastępuje przycisk cyklicznej zmiany motywu w nagłówku.
 *
 * Przełączanie trzech motywów w ciemno wymagało zapamiętania kolejności i
 * trafienia we właściwy klik — tutaj wszystkie trzy są widoczne naraz,
 * z podglądem.
 */
export const SettingsSheet: React.FC<SettingsSheetProps> = ({ open, onOpenChange, version }) => {
  const { theme, setTheme } = useTheme();
  const { preference, setPreference } = useMotionPreference();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent size="md">
        <SheetHeader title={app.settings.title} closeLabel={common.action.close} />
        <SheetBody className="flex flex-col gap-6 pb-8">
          <section className="flex flex-col gap-2">
            <Heading level={3}>{app.settings.appearance}</Heading>
            <Text size="sm" tone="faint">
              {app.settings.appearanceHint}
            </Text>
            <RadioCards<ThemeId>
              label={app.settings.appearance}
              value={theme}
              onValueChange={setTheme}
              options={THEME_LIST.map((t) => ({
                value: t.id,
                label: t.name,
                description: t.subtitle,
                preview: <ThemeSwatch bg={t.previewBg} card={t.previewCard} accent={t.accentColor} />,
              }))}
            />
          </section>

          <Divider />

          <section className="flex flex-col gap-2">
            <Heading level={3}>{app.settings.motion}</Heading>
            <Text size="sm" tone="faint">
              {app.settings.motionHint}
            </Text>
            <RadioCards<MotionPreference>
              label={app.settings.motion}
              value={preference}
              onValueChange={setPreference}
              options={[
                { value: 'auto', label: app.settings.motionAuto, description: app.settings.motionAutoHint },
                { value: 'reduced', label: app.settings.motionReduced, description: app.settings.motionReducedHint },
                { value: 'full', label: app.settings.motionFull, description: app.settings.motionFullHint },
              ]}
            />
          </section>

          <Divider />

          <section className="flex flex-col gap-1">
            <Heading level={3}>{app.settings.about}</Heading>
            <Text size="sm" tone="muted">
              {app.description}
            </Text>
            <dl className={cn('mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm')}>
              <dt className="text-ink-faint">{app.settings.offline}</dt>
              <dd className="text-ink-muted">tak</dd>
              <dt className="text-ink-faint">{app.settings.privacy}</dt>
              <dd className="text-ink-muted">tak</dd>
              <dt className="text-ink-faint">{app.settings.version}</dt>
              <dd className="text-ink-muted numeric">{version}</dd>
            </dl>
          </section>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
};
