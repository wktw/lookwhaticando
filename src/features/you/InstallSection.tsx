/**
 * You › On your Home Screen (DESIGN §11.1, VOICE §19): the install card for this browser, and the
 * handoff between a Safari tab and the installed app ("Move my plants into the app" copies the
 * save as CK1 text; the installed app offers "Paste my plants").
 */
import { useState } from 'preact/hooks';
import { INSTALL } from '@/catalog/lines';
import { InstallGuide } from '@/app/InstallGuide';
import { currentInstallPlatform } from '@/app/installPrompt';
import { exportPayload, state } from '@/state/store';
import { ListRow } from '@/ui/ListRow';
import { SectionHeader } from '@/ui/SectionHeader';
import { toast } from '@/ui/toast';
import { YOU } from './copy';
import { copyText } from './files';
import { ImportSheet } from './ImportSheet';
import { CopyByHand } from './DataSection';
import s from './You.module.css';

export function InstallSection() {
  const [pasting, setPasting] = useState(false);
  const [byHand, setByHand] = useState<string | null>(null);
  const installed = currentInstallPlatform() === 'installed';
  const hasPlants = state.value.habits.length > 0;
  const single = location.protocol === 'file:';

  const handoff = async () => {
    const payload = await exportPayload();
    if (await copyText(payload)) toast({ key: 'handoff', message: INSTALL.handoffCopied, tone: 'sage', duration: 8000 });
    else setByHand(payload);
  };

  return (
    <section class={s.group} aria-labelledby="you-install">
      <SectionHeader title={YOU.sections.install} id="you-install" />
      {!single && <InstallGuide />}
      {(installed || (hasPlants && !single)) && (
        <div class={s.card} style={{ marginTop: 'var(--s-3)' }}>
          {installed ? (
            <ListRow leading="import" leadingTone="sage" title={INSTALL.paste} onClick={() => setPasting(true)} />
          ) : (
            <ListRow leading="export" leadingTone="sage" title={INSTALL.handoff} chevron={false} onClick={() => void handoff()} />
          )}
        </div>
      )}
      {single && <p class={s.footer}>{INSTALL.singleFile[0]}</p>}
      <ImportSheet open={pasting} title={INSTALL.paste} pasteFirst onClose={() => setPasting(false)} />
      <CopyByHand text={byHand} onClose={() => setByHand(null)} />
    </section>
  );
}
