import { UserRole } from '../../core/auth/auth.models';
import {
  GrammaticalGender,
  GrammaticalVariants,
  selectGrammaticalVariant,
} from './grammatical-copy';

export const GENDERED_ROLE_LABELS: Record<UserRole, GrammaticalVariants> = {
  STUDENT: {
    masculine: 'Estudiante',
    feminine: 'Estudiante',
    neutral: 'Estudiante',
  },
  TUTOR: {
    masculine: 'Asesor / Tutor',
    feminine: 'Asesora / Tutora',
    neutral: 'Tutoría académica',
  },
  COMMITTEE_MEMBER: {
    masculine: 'Miembro del comité',
    feminine: 'Miembro del comité',
    neutral: 'Integrante del comité',
  },
  PROGRAM_COORDINATOR: {
    masculine: 'Coordinador del programa',
    feminine: 'Coordinadora del programa',
    neutral: 'Coordinación del programa',
  },
  SYSTEM_ADMIN: {
    masculine: 'Administrador del sistema',
    feminine: 'Administradora del sistema',
    neutral: 'Administración del sistema',
  },
};

export function getRoleLabelByGender(
  role: UserRole | string | null | undefined,
  gender?: GrammaticalGender | string | null,
): string {
  if (!role) {
    return '';
  }

  const roleVariants = GENDERED_ROLE_LABELS[role as UserRole];
  if (!roleVariants) {
    return String(role);
  }

  // ponytail: masculine fallback keeps existing default terminology when no explicit gender is requested.
  return gender
    ? selectGrammaticalVariant(gender, roleVariants)
    : roleVariants.masculine;
}
