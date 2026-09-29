/**
 * Dev-only gallery: every drawing and every piece of the interface, for visual review.
 * Open /gallery.html in `npm run dev`. Filter with ?only=<section id or prefix> (fxui, pets…),
 * force a theme with ?theme=light|night (otherwise it follows the OS), and force a pet
 * expression with ?expr=happy. Not included in production builds.
 */
import { render } from 'preact';
import '@/styles/global.css';
import './gallery.css';
import { GALLERY_SECTIONS, type GallerySection } from './sections';

// Each module contributes src/dev/sections-<module>.tsx exporting `SECTIONS` (auto-discovered).
const moduleSections = import.meta.glob<{ SECTIONS: GallerySection[] }>('./sections-*.tsx', { eager: true });
const ALL_SECTIONS: GallerySection[] = [...GALLERY_SECTIONS, ...Object.values(moduleSections).flatMap((m) => m.SECTIONS)];

const params = new URLSearchParams(location.search);
const only = params.get('only');
const theme = params.get('theme');
// Like the app: an explicit theme wins, otherwise follow the OS (so a dark-mode shot is Lamplight).
document.documentElement.dataset.theme = theme === 'light' || theme === 'night' ? theme : matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'light';

function Gallery() {
  const sections = ALL_SECTIONS.filter((s) => !only || s.id === only || s.id.startsWith(`${only}-`));
  return (
    <main class="gal">
      <h1>
        catkin <span>gallery</span>
      </h1>
      {!only && (
        <nav class="gal-nav" aria-label="Sections">
          {ALL_SECTIONS.map((s) => (
            <a key={s.id} href={`?only=${s.id}`}>
              {s.id}
            </a>
          ))}
        </nav>
      )}
      {sections.map((s) => (
        <section key={s.id} id={s.id} class="gal-section">
          <h2>{s.title}</h2>
          {s.render(params)}
        </section>
      ))}
    </main>
  );
}

render(<Gallery />, document.getElementById('app')!);
