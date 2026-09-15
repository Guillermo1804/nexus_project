import { getRoleLabelByGender } from './role-labels';

describe('role-labels presentation helper', () => {
  it('returns feminine label when gender is FEMININE', () => {
    expect(getRoleLabelByGender('TUTOR', 'FEMININE')).toBe('Asesora / Tutora');
    expect(getRoleLabelByGender('PROGRAM_COORDINATOR', 'FEMININE')).toBe(
      'Coordinadora del programa',
    );
  });

  it('returns neutral role label when gender is NEUTRAL or UNSPECIFIED', () => {
    expect(getRoleLabelByGender('PROGRAM_COORDINATOR', 'NEUTRAL')).toBe(
      'Coordinación del programa',
    );
  });

  it('defaults to masculine label when no gender is provided', () => {
    expect(getRoleLabelByGender('SYSTEM_ADMIN')).toBe(
      'Administrador del sistema',
    );
  });
});
