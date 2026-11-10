import {describe, expect, it} from 'vitest';
import {applyBasisPoints, formatINR, rupeesToPaise} from './money';

describe('money', () => {
  it('keeps money in integer paise', () => {
    expect(rupeesToPaise(667)).toBe(66_700);
    expect(applyBasisPoints(40_020_000, 1_300)).toBe(5_202_600);
  });

  it('formats Indian grouping', () => {
    expect(formatINR(54_897_500, 'en')).toContain('5,48,975');
  });
});
