import { to0100, weightedScore } from '@/utils/mindScore';

describe('to0100', () => {
  it('normalizes null/undefined to null', () => {
    expect(to0100(null)).toBeNull();
    expect(to0100(undefined)).toBeNull();
  });

  it('scales 1-10 range to 0-100', () => {
    expect(to0100(5)).toBe(50);
    expect(to0100(9.5)).toBe(95);
  });

  it('clamps out-of-range values', () => {
    expect(to0100(120)).toBe(100);
    expect(to0100(-5)).toBe(0);
  });
});

describe('weightedScore', () => {
  it('returns null when no components provided', () => {
    expect(weightedScore(null, null, null)).toBeNull();
  });

  it('computes weighted score with mood and energy', () => {
    expect(weightedScore(80, 60, null)).toBeCloseTo((80 * 0.5 + 60 * 0.3) / 0.8, 1);
  });

  it('inverts anxiety component when not neutral', () => {
    expect(weightedScore(70, 50, 20)).toBeCloseTo((70 * 0.5 + 50 * 0.3 + (100 - 20) * 0.2) / 1, 1);
  });

  it('skips anxiety when neutral (50)', () => {
    expect(weightedScore(60, 60, 50)).toBeCloseTo((60 * 0.5 + 60 * 0.3) / 0.8, 1);
  });
});
