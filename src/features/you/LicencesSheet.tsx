import { useEffect, useState } from 'preact/hooks';
import { ABOUT_COPY, ERRORS } from '@/catalog/lines';
import { Sheet } from '@/ui/Sheet';
import { Button } from '@/ui/Button';
import s from './You.module.css';

/** The portable HTML carries inert notice text; the PWA reads its precached text file. */
export function LicencesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [text, setText] = useState('');
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!open || text) return;
    setFailed(false);
    const embedded = document.querySelector<HTMLTemplateElement>('#third-party-notices')?.content.textContent;
    if (embedded) { setText(embedded); return; }
    const controller = new AbortController();
    let live = true;
    fetch(new URL('./licenses.txt', document.baseURI).href, { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error('Notices unavailable'); return response.text(); })
      .then((value) => { if (!value.trim()) throw new Error('Empty notices'); if (live) setText(value); })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; controller.abort(); };
  }, [open, attempt, text]);
  return (
    <Sheet open={open} onClose={onClose} title={ABOUT_COPY.licences.title} size="lg">
      {text ? <pre class={s.licences} role="document" tabIndex={0} aria-label={ABOUT_COPY.licences.title}>{text}</pre> : failed ? <>
        <p role="status">{ABOUT_COPY.licences.error}</p>
        <Button onClick={() => setAttempt((n) => n + 1)}>{ERRORS.sheetRetry}</Button>
      </> : <p role="status">{ERRORS.sheetSlow}</p>}
    </Sheet>
  );
}
