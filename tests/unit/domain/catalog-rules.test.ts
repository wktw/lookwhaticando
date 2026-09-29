import { describe, expect, it } from 'vitest';
import { TEMPLATES } from '@/catalog';
import { validateRuleContent, normalizeRuleContent } from '@/domain/schedule';

describe('catalog templates are valid rules', () => {
  it.each(TEMPLATES.map((t) => [t.id, t] as const))('%s', (_id, t) => {
    const content = normalizeRuleContent({ schedule: t.schedule, target: t.target, step: t.step ?? 1, ...(t.tiny ? { tiny: t.tiny } : {}) });
    expect(validateRuleContent(content)).toEqual([]);
  });
});
