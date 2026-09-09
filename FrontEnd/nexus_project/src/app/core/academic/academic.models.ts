import { UserRole } from '../auth/auth.models';

export interface StudentRecord {
  id: number;
  matricula: string;
  nombre_completo: string;
  programa_doctoral: string;
  cohorte: string;
  estatus_activo: boolean;
}

export interface TutoringSessionData {
  student: number;
  semester: number;
  fecha_sesion: string;
  modalidad: 'PRESENCIAL' | 'VIRTUAL' | 'HIBRIDA';
  resumen: string;
  proxima_reunion_fecha?: string;
  proxima_reunion_notas?: string;
}

export interface TutoringSession extends TutoringSessionData {
  id: number;
  created_by: number;
}

export type AcademicRole = UserRole;