import { GrammaticalVariantPipe } from './grammatical-variant.pipe';

describe('GrammaticalVariantPipe', () => {
  const pipe = new GrammaticalVariantPipe();
  const variants = {
    masculine: 'Activo',
    feminine: 'Activa',
    neutral: 'En estado activo',
  };

  it('transforms value using matching grammatical variant', () => {
    expect(pipe.transform('FEMININE', variants)).toBe('Activa');
    expect(pipe.transform('MASCULINE', variants)).toBe('Activo');
    expect(pipe.transform(undefined, variants)).toBe('En estado activo');
  });
});
