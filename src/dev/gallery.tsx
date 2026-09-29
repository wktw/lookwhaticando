/**
 * Dev-only art gallery: renders every collectible and art system for visual review.
 * Open /gallery.html in `npm run dev`. Sections can be filtered with ?only=pets|wearables|…
 * and the expression can be forced with ?expr=happy. Not included in production builds.
 */
import { render } from 'preact';
import '@/styles/global.css';
import './gallery.css';
import { GALLERY_SECTIONS } from './sections';

const params = new URLSearchParams(location.search);
const only = params.get('only');
const theme = params.get('theme');
if (theme) document.documentElement.dataset.theme = theme;

function Gallery() {
  const sections = GALLERY_SECTIONS.filter((s) => !only || s.id === only);
  return (
    <main class="gal">
      <h1>Mochi Meadow · Art Gallery</h1>
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
