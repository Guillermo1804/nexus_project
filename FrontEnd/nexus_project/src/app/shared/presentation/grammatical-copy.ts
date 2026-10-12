export type GrammaticalGender =
  | 'MASCULINE'
  | 'FEMININE'
  | 'NEUTRAL'
  | 'UNSPECIFIED';

export interface GrammaticalVariants {
  masculine: string;
  feminine: string;
  neutral: string;
}

export function selectGrammaticalVariant(
  gender: GrammaticalGender | string | null | undefined,
  variants: GrammaticalVariants,
): string {
  if (gender === 'MASCULINE') {
    return variants.masculine;
  }
  if (gender === 'FEMININE') {
    return variants.feminine;
  }
  // ponytail: neutral fallback covers UNSPECIFIED, null, undefined or unrecognized values. Upgrade to locale-based ICU if app goes multilingual.
  return variants.neutral;
}

export function formatWelcomeGreeting(
  nameOrEmail: string | null | undefined,
  gender: GrammaticalGender | string | null | undefined,
): string {
  const target = (nameOrEmail || '').trim();
  const greeting = selectGrammaticalVariant(gender, {
    masculine: 'Bienvenido',
    feminine: 'Bienvenida',
    neutral: 'Te damos la bienvenida',
  });

  if (!target) {
    return greeting;
  }

  if (greeting === 'Te damos la bienvenida') {
    return `Te damos la bienvenida, ${target}.`;
  }

  return `${greeting}, ${target}.`;
}
