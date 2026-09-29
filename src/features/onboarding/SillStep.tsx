/** Step 1 (DESIGN §9.6): the empty sill, the one line, and her name (optional). */
import type { ComponentChildren } from 'preact';
import { ONBOARDING } from '@/catalog/lines';
import { Button } from '@/ui/Button';
import { TextField } from '@/ui/TextField';
import { ONBOARDING_COPY } from '@/features/you/copy';
import s from './Onboarding.module.css';

export function SillStep({ name, onName, onNext, other }: { name: string; onName: (v: string) => void; onNext: () => void; other?: ComponentChildren }) {
  return (
    <form
      class={s.step}
      onSubmit={(e) => {
        e.preventDefault();
        onNext();
      }}
    >
      <h1 class={s.title}>{ONBOARDING.sill}</h1>
      <TextField label={ONBOARDING.nameLabel} hint={ONBOARDING.nameHelper} value={name} onValue={onName} maxLength={40} autoComplete="given-name" enterKeyHint="next" />
      <div class={s.foot}>
        <Button type="submit" size="lg" block>
          {ONBOARDING_COPY.next}
        </Button>
        {other}
      </div>
    </form>
  );
}
