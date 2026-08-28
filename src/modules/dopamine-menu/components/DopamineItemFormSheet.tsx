import React, { useEffect, useState } from 'react';
import {
  Button,
  Field,
  Input,
  RadioCards,
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  Stack,
  Textarea,
} from '../../../components/ui';
import { common, energia } from '../../../copy';
import { useDopamineMenuStore } from '../store';
import { energiaIds as ids } from '../testIds';
import { DopamineCategory, DopamineItem, EnergyLevel } from '../types';

interface DopamineItemFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `null` znaczy „nowa pozycja". */
  item: DopamineItem | null;
}

const ENERGY_OPTIONS: { value: EnergyLevel; label: string }[] = [
  { value: 'low', label: energia.energy.low.label },
  { value: 'medium', label: energia.energy.medium.label },
  { value: 'high', label: energia.energy.high.label },
];

const CATEGORY_OPTIONS: { value: DopamineCategory; label: string; description: string }[] = [
  { value: 'appetizer', label: energia.category.appetizer.title, description: energia.category.appetizer.hint },
  { value: 'entree', label: energia.category.entree.title, description: energia.category.entree.hint },
  { value: 'side', label: energia.category.side.title, description: energia.category.side.hint },
  { value: 'dessert', label: energia.category.dessert.title, description: energia.category.dessert.hint },
  { value: 'special', label: energia.category.special.title, description: energia.category.special.hint },
];

/**
 * Jeden formularz na dopisanie i na zmianę pozycji.
 *
 * Wcześniej były dwa okna: jedno całe po angielsku („Add New Activity",
 * „Save Activity", surowe `low`/`medium`/`high`), drugie po polsku.
 */
export const DopamineItemFormSheet: React.FC<DopamineItemFormSheetProps> = ({
  open,
  onOpenChange,
  item,
}) => {
  const addItem = useDopamineMenuStore((state) => state.addItem);
  const editItem = useDopamineMenuStore((state) => state.editItem);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [energyRequired, setEnergyRequired] = useState<EnergyLevel>('low');
  const [category, setCategory] = useState<DopamineCategory>('special');
  const [duration, setDuration] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle(item?.title ?? '');
    setDescription(item?.description ?? '');
    setEnergyRequired(item?.energyRequired ?? 'low');
    setCategory(item?.category ?? 'special');
    setDuration(item?.durationMinutes ? String(item.durationMinutes) : '');
  }, [open, item]);

  const editing = item !== null;
  const trimmed = title.trim();

  const submit = () => {
    if (!trimmed) return;
    const minutes = Number(duration);
    const durationMinutes = duration && Number.isFinite(minutes) && minutes > 0 ? minutes : undefined;

    if (item) {
      editItem(item.id, {
        title: trimmed,
        description: description.trim() || undefined,
        energyRequired,
        category,
        durationMinutes,
      });
    } else {
      addItem({
        id: crypto.randomUUID(),
        title: trimmed,
        description: description.trim() || undefined,
        energyRequired,
        category,
        durationMinutes,
        isCustom: true,
      });
    }

    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent size="md">
        <SheetHeader
          title={editing ? energia.form.editTitle : energia.form.addTitle}
          description={editing ? undefined : energia.form.addLead}
          closeLabel={common.action.close}
        />

        <SheetBody data-testid={ids.form}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <Stack gap="md">
              <Field label={energia.form.nameLabel}>
                {(props) => (
                  <Input
                    {...props}
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    data-testid={ids.formName}
                    placeholder={energia.form.namePlaceholder}
                    autoComplete="off"
                  />
                )}
              </Field>

              <Field label={energia.form.descriptionLabel} hint={energia.form.descriptionHint}>
                {(props) => (
                  <Textarea
                    {...props}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    data-testid={ids.formDescription}
                    rows={3}
                  />
                )}
              </Field>

              <RadioCards
                label={energia.form.energyLabel}
                value={energyRequired}
                onValueChange={setEnergyRequired}
                options={ENERGY_OPTIONS}
                columns={3}
              />

              {editing ? (
                <>
                  <RadioCards
                    label={energia.form.categoryLabel}
                    value={category}
                    onValueChange={setCategory}
                    options={CATEGORY_OPTIONS}
                  />

                  <Field label={energia.form.durationLabel} hint={energia.form.durationHint}>
                    {(props) => (
                      <Input
                        {...props}
                        type="number"
                        min={1}
                        inputMode="numeric"
                        value={duration}
                        onChange={(event) => setDuration(event.target.value)}
                        data-testid={ids.formDuration}
                      />
                    )}
                  </Field>
                </>
              ) : null}
            </Stack>
            {/* Enter w polu tekstowym wysyła formularz — przycisk jest w stopce. */}
            <button type="submit" className="sr-only" tabIndex={-1} aria-hidden />
          </form>
        </SheetBody>

        <SheetFooter>
          <Button
            variant="primary"
            tone="module"
            className="flex-1"
            disabled={!trimmed}
            data-testid={ids.formSubmit}
            onClick={submit}
          >
            {editing ? energia.form.submitEdit : energia.form.submitAdd}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
