import { isStrongPassword, isValidEmail } from '@/utils/validators';

describe('isValidEmail', () => {
  it('returns true for valid addresses', () => {
    const validSamples = [
      'user@example.com',
      'user.name+tag@sub.domain.org',
      "o'reilly@books.ie",
      'UPPER.CASE@DOMAIN.CO',
      ' spaced@trimmed.com ',
    ];

    validSamples.forEach((sample) => {
      expect(isValidEmail(sample)).toBe(true);
    });
  });

  it('returns false for invalid addresses', () => {
    const invalidSamples = [
      '',
      'no-at-symbol',
      'missing-domain@',
      '@missing-local-part.com',
      'double@@example.com',
      'emoji🙂@example.com',
      'user@domain',
      'user@domain..com',
      'user domain@example.com',
    ];

    invalidSamples.forEach((sample) => {
      expect(isValidEmail(sample)).toBe(false);
    });
  });
});

describe('isStrongPassword', () => {
  it.each([
    ['standard strong password', 'MoodMeter1!'],
    ['strong password with surrounding spaces trimmed', '  MoodMeter1!  '],
    ['alternate strong password example', 'StrongPass9@'],
  ])('returns true for %s', (_scenario, password) => {
    expect(isStrongPassword(password)).toBe(true);
  });

  it.each([
    ['too short and missing complexity', 'foobar'],
    ['missing special character', 'Password1'],
    ['missing digit', 'ONLYLOWERS!'],
    ['missing uppercase letter', 'onlylower1!'],
    ['too short even with symbols', 'short1!'],
  ])('returns false when %s', (_scenario, password) => {
    expect(isStrongPassword(password)).toBe(false);
  });

  it('returns false for nullish values', () => {
    expect(isStrongPassword(undefined)).toBe(false);
    expect(isStrongPassword(null)).toBe(false);
  });
});
