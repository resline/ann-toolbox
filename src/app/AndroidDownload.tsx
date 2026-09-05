import { Capacitor } from '@capacitor/core';
import { Download } from '../lib/icons';
import { Button, Text } from '../components/ui';
import { app } from '../copy';

export function AndroidDownload({ compact = false }: { compact?: boolean }) {
  if (Capacitor.isNativePlatform()) return null;

  const link = (
    <Button asChild variant="secondary" className="w-full">
      <a href="/downloads/przystan.apk" download="przystan.apk">
        <Download className="w-5 h-5 shrink-0" aria-hidden />
        {app.androidDownload.action}
      </a>
    </Button>
  );

  if (compact) return link;

  return (
    <section className="flex flex-col gap-3 rounded-card bg-surface p-4 shadow-hairline" aria-label={app.androidDownload.title}>
      <h2 className="text-lg font-medium">{app.androidDownload.title}</h2>
      <Text size="sm" tone="muted">{app.androidDownload.body}</Text>
      {link}
      <Text size="xs" tone="faint">{app.androidDownload.hint}</Text>
    </section>
  );
}
