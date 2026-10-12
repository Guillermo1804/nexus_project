import {
  formatWelcomeGreeting,
  selectGrammaticalVariant,
} from './grammatical-copy';

describe('grammatical-copy presentation utilities', () => {
  const sampleVariants = {
    masculine: 'Bienvenido',
    feminine: 'Bienvenida',
    neutral: 'Te damos la bienvenida',
  };

  it('selects masculine variant when gender is MASCULINE', () => {
    expect(selectGrammaticalVariant('MASCULINE', sampleVariants)).toBe(
      'Bienvenido',
    );
  });

  it('selects feminine variant when gender is FEMININE', () => {
    expect(selectGrammaticalVariant('FEMININE', sampleVariants)).toBe(
      'Bienvenida',
    );
  });

  it('falls back to neutral variant for unspecified or unknown values', () => {
    expect(selectGrammaticalVariant('UNSPECIFIED', sampleVariants)).toBe(
      'Te damos la bienvenida',
    );
    expect(selectGrammaticalVariant('NEUTRAL', sampleVariants)).toBe(
      'Te damos la bienvenida',
    );
    expect(selectGrammaticalVariant(null, sampleVariants)).toBe(
      'Te damos la bienvenida',
    );
    expect(selectGrammaticalVariant(undefined, sampleVariants)).toBe(
      'Te damos la bienvenida',
    );
    expect(selectGrammaticalVariant('OTHER', sampleVariants)).toBe(
      'Te damos la bienvenida',
    );
  });

  it('formats full welcome greeting properly according to gender', () => {
    expect(formatWelcomeGreeting('Juan', 'MASCULINE')).toBe('Bienvenido, Juan.');
    expect(formatWelcomeGreeting('Ana', 'FEMININE')).toBe('Bienvenida, Ana.');
    expect(formatWelcomeGreeting('Alex', 'UNSPECIFIED')).toBe(
      'Te damos la bienvenida, Alex.',
    );
    expect(formatWelcomeGreeting('', 'MASCULINE')).toBe('Bienvenido');
  });
});
