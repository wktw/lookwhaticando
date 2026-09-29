/** Sweet Treats decor: tea party table. */
import { HEART, INK, OUTLINE, Shadow, Shine, type DecorRenderer } from './kit';

/** Scalloped hem across the front of the round table, following its curve. */
function hemPath(): string {
  const left = 16.5;
  const right = 83.5;
  const n = 8;
  const hemY = (x: number) => 70 + 4 * (1 - ((x - 50) / 34) ** 2);
  let d = `M16 57 L${left} ${hemY(left)}`;
  for (let i = 0; i < n; i++) {
    const x0 = left + ((right - left) * i) / n;
    const x1 = left + ((right - left) * (i + 1)) / n;
    const xm = (x0 + x1) / 2;
    d += ` Q${xm.toFixed(2)} ${(hemY(xm) + 5.5).toFixed(2)} ${x1.toFixed(2)} ${hemY(x1).toFixed(2)}`;
  }
  return `${d} L84 57 Z`;
}
const HEM = hemPath();

/** Tiny cups, tiny cakes, big conversations. */
export const teaParty: DecorRenderer = () => (
  <g>
    <Shadow rx={30} ry={3.4} />
    {/* pedestal */}
    <g {...INK}>
      <rect x={46.5} y={66} width={7} height={24} rx={2} fill="#D6C8F8" />
      <ellipse cx={50} cy={90.5} rx={12} ry={3.2} fill="#D6C8F8" />
    </g>
    {/* tablecloth */}
    <path d={HEM} fill="#FFFDFB" {...INK} />
    <g fill="#FFC4D3">
      {[24, 36, 50, 64, 76].map((x, i) => (
        <circle key={x} cx={x} cy={i % 2 ? 69.5 : 72} r={1.9} />
      ))}
    </g>
    <ellipse cx={50} cy={57.5} rx={34} ry={8.5} fill="#FFFDFB" {...INK} />
    {/* teapot */}
    <g {...INK}>
      <path d="M28 48 Q21.5 47 20 39.5 L23.2 38.6 Q24.8 44 28.6 44.6" fill="#D6C8F8" stroke-width={2} />
      <path d="M46 43.5 Q52.5 44 51.4 50 Q50.4 54.6 45 53" fill="none" stroke-width={2.2} />
      <ellipse cx={37} cy={48.5} rx={10.5} ry={8.6} fill="#D6C8F8" />
      <path d="M31 40.6 Q37 36 43 40.6 Z" fill="#C0AEF2" stroke-width={2} />
      <circle cx={37} cy={37} r={2} fill="#FFC4D3" stroke-width={1.8} />
    </g>
    <path d={HEART} transform="translate(37 50) scale(0.55)" fill="#F58CAA" />
    <Shine cx={32} cy={45} rx={1.6} ry={3.4} rotate={20} opacity={0.6} />
    {/* teacup on its saucer, steaming */}
    <g fill="none" stroke="#fff" stroke-width={1.6} stroke-linecap="round" opacity={0.9}>
      <path d="M57.5 46 q-2 -3 0 -5.5 q2 -2.5 0 -5" />
      <path d="M62 46.5 q-2 -3 0 -5.5" />
    </g>
    <g {...INK} stroke-width={2}>
      <ellipse cx={60} cy={56.2} rx={8} ry={2.2} fill="#FFFDFB" />
      <circle cx={66.8} cy={51.4} r={2.3} fill="none" />
      <path d="M53.8 48.2 L66.2 48.2 Q65.6 55.6 60 55.6 Q54.4 55.6 53.8 48.2 Z" fill="#FFC4D3" />
    </g>
    {/* cupcake */}
    <g {...INK} stroke-width={2}>
      <path d="M69 49 L79.5 49 L77.8 55.6 L70.7 55.6 Z" fill="#FFE593" />
      <path d="M68.2 49.6 Q67.6 44 74.2 43.4 Q80.8 44 80.2 49.6 Z" fill="#FFF3F6" />
      <circle cx={74.2} cy={41.8} r={2.1} fill="#FF7E93" stroke-width={1.6} />
    </g>
    <path d="M71.2 50.5 L71.8 54.4 M74.2 50.5 L74.2 54.4 M77.2 50.5 L76.6 54.4" stroke={OUTLINE} stroke-width={1} opacity={0.6} />
    <Shine cx={30} cy={54.5} rx={6} ry={1.6} rotate={-8} opacity={0.35} />
  </g>
);
