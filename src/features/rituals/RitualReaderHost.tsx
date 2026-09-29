import { signal } from '@preact/signals';
import { useEffect, useState } from 'preact/hooks';
import { RitualReader } from './RitualReader';
import { ritualRequest } from './open';

/** The mounted host that draws the reader: only one does, so the shell and a screen can both mount one. */
const owner = signal<symbol | null>(null);

/**
 * The ritual reader's host (default export, loaded lazily): renders the note or page asked for by
 * `openRitual` / `openSeason` (./open.ts). When the drawing host unmounts, another mounted host
 * takes over.
 */
export default function RitualReaderHost() {
  const [me] = useState(() => Symbol('ritual-reader'));
  const current = owner.value;
  useEffect(() => {
    if (current === null) owner.value = me;
  }, [current]);
  useEffect(
    () => () => {
      if (owner.peek() === me) owner.value = null;
    },
    [],
  );
  const request = ritualRequest.value;
  if (current !== me) return null;
  return <RitualReader request={request} />;
}
