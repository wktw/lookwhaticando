import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { licenseNotices } from '../../../scripts/notices';

describe('WP-D4: notices travel with the code and fonts', () => {
  it('includes the complete licences, copyright notices and installed versions', () => {
    const notices = licenseNotices(process.cwd());
    for (const name of ['@fontsource/castoro', '@fontsource-variable/nunito', 'preact', '@preact/signals', '@preact/signals-core', 'workbox-window', 'workbox-core', 'workbox-precaching', 'workbox-routing', 'workbox-strategies', 'workbox-expiration', 'workbox-cacheable-response', 'idb']) {
      const package_ = JSON.parse(readFileSync(`node_modules/${name}/package.json`, 'utf8'));
      expect(notices).toContain(`${name}@${package_.version}`);
      expect(notices).toContain(readFileSync(`node_modules/${name}/LICENSE`, 'utf8').trim());
    }
    expect(notices.match(/SIL OPEN FONT LICENSE Version 1.1/g)).toHaveLength(2);
  });
});
