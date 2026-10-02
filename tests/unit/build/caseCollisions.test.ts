/** WP-01: a checkout must resolve the same modules on Linux and Windows/macOS. */
import { beforeAll, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFileSync } from 'node:fs';
import { posix } from 'node:path';
import ts from 'typescript';
import { ROOT } from './staticGraph';

const moduleFile = /\.(?:[cm]?[jt]s|[jt]sx)$/;
const explicitExtension = /\.(?:[cm]?[jt]sx?|json|css|svg|png|jpe?g|webp|woff2?)$/;
const extensions = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'];
const indexes = new WeakMap<readonly string[], { exact: Set<string>; folded: Map<string, string> }>();

function collisions(files: readonly string[]): string[][] {
  const stems = new Map<string, string[]>();
  for (const file of files.filter((f) => moduleFile.test(f))) {
    const stem = posix.join(posix.dirname(file), posix.parse(file).name).toLowerCase();
    stems.set(stem, [...(stems.get(stem) ?? []), file]);
  }
  return [...stems.values()].filter((group) => group.length > 1);
}

function imports(file: string, text: string): string[] {
  const result: string[] = [];
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const add = (node: ts.Node | undefined) => { if (node && ts.isStringLiteralLike(node)) result.push(node.text); };
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) add(node.moduleSpecifier);
    else if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) add(node.arguments[0]);
    else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) add(node.argument.literal);
    else if (ts.isExternalModuleReference(node)) add(node.expression);
    ts.forEachChild(node, visit);
  };
  visit(source);
  return result;
}

function resolved(files: readonly string[], from: string, specifier: string, insensitive: boolean): string | null {
  let index = indexes.get(files);
  if (!index) { index = { exact: new Set(files), folded: new Map(files.map((file) => [file.toLowerCase(), file])) }; indexes.set(files, index); }
  const spec = specifier.split(/[?#]/)[0]!;
  const base = spec.startsWith('@/') ? `src/${spec.slice(2)}` : spec.startsWith('.') ? posix.join(posix.dirname(from), spec) : null;
  if (base === null || explicitExtension.test(base)) return null;
  const candidates = [...extensions.map((extension) => `${base}${extension}`), ...extensions.map((extension) => `${base}/index${extension}`)];
  for (const candidate of candidates) {
    const found = insensitive ? index.folded.get(candidate.toLowerCase()) : index.exact.has(candidate) ? candidate : undefined;
    if (found) return found;
  }
  return null;
}

let tracked: string[];
beforeAll(async () => {
  const { stdout } = await promisify(execFile)('git', ['ls-files', '-z'], { cwd: ROOT, maxBuffer: 8 * 1024 * 1024 });
  tracked = stdout.split('\0').filter(Boolean);
});

describe('case-independent module resolution', () => {
  it('has no tracked source or test modules sharing a lower-cased stem', () => {
    expect(collisions(tracked)).toEqual([]);
  });

  it('resolves every local extensionless import to the same file on sensitive and insensitive filesystems', () => {
    const differences: string[] = [];
    for (const file of tracked.filter((f) => moduleFile.test(f))) {
      for (const spec of imports(file, readFileSync(`${ROOT}/${file}`, 'utf8'))) {
        if (!(spec.startsWith('.') || spec.startsWith('@/')) || explicitExtension.test(spec.split(/[?#]/)[0]!)) continue;
        const sensitive = resolved(tracked, file, spec, false);
        const insensitive = resolved(tracked, file, spec, true);
        if (!sensitive || sensitive !== insensitive) differences.push(`${file}: ${spec} → ${sensitive ?? 'missing'} / ${insensitive ?? 'missing'}`);
      }
    }
    expect(differences).toEqual([]);
  }, 20_000);

  it('detects extension precedence, folder casing and test-module collisions', () => {
    const files = ['src/Check.tsx', 'src/check.ts', 'src/Thing.test.tsx', 'src/thing.test.ts', 'src/Folder/index.ts'];
    expect(collisions(files)).toHaveLength(2);
    expect(resolved(files, 'src/main.ts', './Check', false)).toBe('src/Check.tsx');
    expect(resolved(files, 'src/main.ts', './Check', true)).toBe('src/check.ts');
    expect(resolved(files, 'src/main.ts', './folder', false)).toBeNull();
    expect(resolved(files, 'src/main.ts', './folder', true)).toBe('src/Folder/index.ts');
    expect(imports('src/main.ts', "import type { T } from './Check'; export { T } from './Folder'; const later = import('./check'); type U = import('./Thing.test').U;")).toEqual(['./Check', './Folder', './check', './Thing.test']);
    expect(imports('src/main.ts', "const helper = require('./check'); import Folder = require('./Folder');")).toEqual(['./check', './Folder']);
  });
});
