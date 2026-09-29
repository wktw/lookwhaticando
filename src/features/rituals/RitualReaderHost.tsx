import { useEffect, useState } from 'preact/hooks';
import { RitualReader } from './RitualReader';
import { ritualRequest } from './open';

/** Only the first mounted host draws the reader, so the shell and a screen can both mount one. */
let owner: symbol | null = null;

/**
 * The ritual reader's host (default export, loaded lazily): renders the note or page asked for by
 * `openRitual` / `openSeason` (./open.ts).
 */
export default function RitualReaderHost() {
  const [me] = useState(() => Symbol('ritual-reader'));
  const [, setTick] = useState(0);
  useEffect(() => {
    if (owner === null) {
      owner = me;
      setTick((t) => t + 1);
    }
    return () => {
      if (owner === me) owner = null;
    };
  }, []);
  const request = ritualRequest.value;
  if (owner !== me) return null;
  return <RitualReader request={request} />;
}
