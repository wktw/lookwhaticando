import { useId } from 'preact/hooks';

/** A tiny capsule machine for the raised Capsules tab: glass dome of pastel gumballs on a cream base. */
export function GumballArt({ size = 40, class: cls }: { size?: number; class?: string }) {
  const clip = `gb${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const balls: [number, number, string][] = [
    [14.2, 19.5, '#FFC4D3'],
    [20.4, 21, '#FFE593'],
    [26, 19, '#BBDCF6'],
    [17, 14.2, '#C3DFB4'],
    [23.4, 14, '#D6C8F8'],
    [20, 8.6, '#FF9FB8'],
  ];
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} class={cls} aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={clip}>
          <circle cx="20" cy="15" r="10.6" />
        </clipPath>
      </defs>
      {/* knob */}
      <rect x="17.2" y="1.6" width="5.6" height="3.4" rx="1.4" fill="#F58CAA" stroke="#5A3E45" stroke-width="1.6" />
      {/* dome */}
      <circle cx="20" cy="15" r="10.6" fill="#FFFDFB" />
      <g class="gumballs" clip-path={`url(#${clip})`} stroke="#5A3E45" stroke-width="1.1">
        {balls.map(([x, y, c], i) => (
          <circle key={i} cx={x} cy={y} r="3.3" fill={c} />
        ))}
      </g>
      <circle cx="20" cy="15" r="10.6" fill="none" stroke="#5A3E45" stroke-width="1.8" />
      <path d="M13.2 11.2 Q14.6 8.2 17.6 7.2" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" opacity="0.95" />
      {/* base */}
      <path d="M11 24.6 H29 L31 36.4 Q31.2 37.6 30 37.6 H10 Q8.8 37.6 9 36.4 Z" fill="#FFF3E8" stroke="#5A3E45" stroke-width="1.8" stroke-linejoin="round" />
      <rect x="15.6" y="28.2" width="8.8" height="5.6" rx="1.6" fill="#F58CAA" stroke="#5A3E45" stroke-width="1.4" />
      <circle cx="20" cy="31" r="1.2" fill="#FFE593" />
    </svg>
  );
}
