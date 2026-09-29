/**
 * Writes data.ts from the rigs:  npx vite-node src/art/pets/crescents/write.ts
 */
import { writeFileSync } from 'node:fs';
import { buildData } from './generate';

const { source, count, bytes } = buildData();
writeFileSync(new URL('./data.ts', import.meta.url), source);
console.log(`${count} crescents, ${(bytes / 1024).toFixed(1)} KB of path data`);
