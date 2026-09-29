/** Batching flat shapes by ink, so repeated leaves and petals cost one DOM node per run of one colour. */

/**
 * Collects shapes by ink, merging each run of consecutive same-ink shapes into one path: paint order is kept
 * wherever inks alternate, and repeated leaves or petals of one tone become a single DOM node.
 */
export class InkRuns {
  private runs: { fill: string; d: string; cls?: string }[] = [];
  add(fill: string, d: string, cls?: string) {
    const last = this.runs.at(-1);
    if (last && last.fill === fill && last.cls === cls) last.d += d;
    else this.runs.push({ fill, d, cls });
  }
  get length() {
    return this.runs.length;
  }
  paths(key = 'r') {
    return this.runs.map((r, i) => <path key={`${key}${i}`} d={r.d} fill={r.cls ? undefined : r.fill} class={r.cls} />);
  }
}
