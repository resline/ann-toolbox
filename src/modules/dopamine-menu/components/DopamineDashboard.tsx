import React, { useMemo, useState } from 'react';
import { Plus, Sparkles } from '../../../lib/icons';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  Section,
  Stack,
} from '../../../components/ui';
import { common, energia } from '../../../copy';
import { useDopamineMenuStore } from '../store';
import { energiaIds as ids } from '../testIds';
import { DopamineCategory, DopamineItem, EnergyLevel } from '../types';
import { DopamineBankWidget } from './DopamineBankWidget';
import { DopamineCard } from './DopamineCard';
import { DopamineDetailSheet } from './DopamineDetailSheet';
import { DopamineItemFormSheet } from './DopamineItemFormSheet';
import { DopamineRouletteSheet } from './DopamineRouletteSheet';
import { DopamineSosSheet } from './DopamineSosSheet';

/** Kolejność karty dań: od najtańszego wejścia do najdroższego. */
const CATEGORIES: DopamineCategory[] = ['appetizer', 'entree', 'side', 'dessert', 'special'];

const FILTERS: (EnergyLevel | 'all')[] = ['all', 'low', 'medium', 'high'];

function filterLabel(level: EnergyLevel | 'all'): string {
  return level === 'all' ? energia.filter.all : energia.energy[level].label;
}

/** Ulubione idą na górę swojej kategorii — reszta zachowuje kolejność menu. */
function byFavorite(a: DopamineItem, b: DopamineItem): number {
  return Number(!!b.isFavorite) - Number(!!a.isFavorite);
}

export const DopamineDashboard: React.FC = () => {
  const items = useDopamineMenuStore((state) => state.items);
  const energyFilter = useDopamineMenuStore((state) => state.energyFilter);
  const setEnergyFilter = useDopamineMenuStore((state) => state.setEnergyFilter);
  const completeItem = useDopamineMenuStore((state) => state.completeItem);
  const toggleFavorite = useDopamineMenuStore((state) => state.toggleFavorite);
  const deleteItem = useDopamineMenuStore((state) => state.deleteItem);

  const [sosOpen, setSosOpen] = useState(false);
  const [rouletteOpen, setRouletteOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formItem, setFormItem] = useState<DopamineItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [removing, setRemoving] = useState<DopamineItem | null>(null);

  const filtered = useMemo(
    () =>
      energyFilter === 'all'
        ? items
        : items.filter((item) => item.energyRequired === energyFilter),
    [items, energyFilter]
  );

  const sections = useMemo(
    () =>
      CATEGORIES.map((category) => ({
        category,
        entries: filtered.filter((item) => item.category === category).sort(byFavorite),
      })).filter((section) => section.entries.length > 0),
    [filtered]
  );

  // Szczegóły czytamy ze store'u po identyfikatorze, żeby licznik wykonań
  // w arkuszu odświeżał się razem z „Gotowe".
  const detailItem = detailId ? items.find((item) => item.id === detailId) ?? null : null;

  const openDetail = (item: DopamineItem) => {
    setDetailId(item.id);
    setDetailOpen(true);
  };

  const openForm = (item: DopamineItem | null) => {
    setFormItem(item);
    setFormOpen(true);
  };

  return (
    <div className="py-6 flex flex-col gap-section" data-testid={ids.root}>
      <DopamineBankWidget />

      {/* Dwa równe rzędy zamiast zawijania: przy trzech przyciskach o różnej
          długości `flex-wrap` układał je w poszarpaną drabinkę. */}
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="primary"
            tone="module"
            data-testid={ids.actionRoulette}
            onClick={() => setRouletteOpen(true)}
          >
            <Sparkles className="w-4 h-4" aria-hidden />
            {energia.action.roll}
          </Button>
          <Button
            variant="secondary"
            tone="attention"
            data-testid={ids.actionSos}
            onClick={() => setSosOpen(true)}
          >
            {energia.action.sos}
          </Button>
        </div>
        <Button
          variant="quiet"
          tone="neutral"
          data-testid={ids.actionAdd}
          onClick={() => openForm(null)}
        >
          <Plus className="w-4 h-4" aria-hidden />
          {energia.action.addItem}
        </Button>
      </div>

      <div
        role="group"
        aria-label={energia.filter.label}
        data-testid={ids.filters}
        className="grid grid-cols-4 gap-1.5"
      >
        {FILTERS.map((level) => (
          <Button
            key={level}
            variant={energyFilter === level ? 'primary' : 'quiet'}
            tone="module"
            aria-pressed={energyFilter === level}
            data-testid={ids.filter(level)}
            onClick={() => setEnergyFilter(level)}
          >
            {filterLabel(level)}
          </Button>
        ))}
      </div>

      {items.length === 0 ? (
        <div data-testid={ids.menuEmpty}>
          <EmptyState
            title={energia.empty.menuTitle}
            description={energia.empty.menuBody}
            className="py-6"
            action={
              <Button variant="secondary" tone="module" onClick={() => openForm(null)}>
                {energia.action.addItem}
              </Button>
            }
          />
        </div>
      ) : sections.length === 0 ? (
        <div data-testid={ids.filterEmpty}>
          <EmptyState
            title={energia.filter.emptyTitle}
            description={energia.filter.emptyBody}
            className="py-6"
            action={
              <Button
                variant="secondary"
                tone="module"
                data-testid={ids.filterReset}
                onClick={() => setEnergyFilter('all')}
              >
                {common.action.showAll}
              </Button>
            }
          />
        </div>
      ) : (
        <Stack gap="lg">
          {sections.map(({ category, entries }) => (
            <Section
              key={category}
              title={energia.category[category].title}
              description={energia.category[category].hint}
              data-testid={ids.section(category)}
            >
              <div className="flex flex-col gap-3">
                {entries.map((item) => (
                  <DopamineCard
                    key={item.id}
                    item={item}
                    onOpen={openDetail}
                    onDone={(target) => completeItem(target.id)}
                    onToggleFavorite={(target) => toggleFavorite(target.id)}
                    onEdit={openForm}
                    onRemove={setRemoving}
                  />
                ))}
              </div>
            </Section>
          ))}
        </Stack>
      )}

      <DopamineDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        item={detailItem}
        onDone={(item) => {
          completeItem(item.id);
          setDetailOpen(false);
        }}
      />

      {/*
        Koło pokazuje szczegóły wylosowanej pozycji u siebie i samo dopisuje
        iskierkę. Zamykanie koła i otwieranie arkusza szczegółów w jednym ticku
        znaczyło `pushState()` i `back()` obok siebie — cofnięcie zdejmowało wpis
        świeżo otwartego arkusza i zamykało go, zanim ktokolwiek go zobaczył.
      */}
      <DopamineRouletteSheet
        open={rouletteOpen}
        onOpenChange={setRouletteOpen}
        items={filtered}
        onResetFilter={() => setEnergyFilter('all')}
        onDone={(item) => {
          completeItem(item.id);
          setRouletteOpen(false);
        }}
      />

      <DopamineSosSheet open={sosOpen} onOpenChange={setSosOpen} />

      <DopamineItemFormSheet open={formOpen} onOpenChange={setFormOpen} item={formItem} />

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
        title={energia.remove.title}
        description={removing ? energia.remove.body(removing.title) : undefined}
        confirmLabel={energia.remove.confirm}
        cancelLabel={common.action.cancel}
        onConfirm={() => {
          if (removing) deleteItem(removing.id);
          setRemoving(null);
        }}
      />
    </div>
  );
};
