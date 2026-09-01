export type TutoringModality = 'PRESENCIAL' | 'VIRTUAL' | 'HIBRIDA';
export type TutoringRole =
  | 'ESTUDIANTE'
  | 'ASESOR_PRINCIPAL'
  | 'COASESOR'
  | 'VOCAL'
  | 'SECRETARIO'
  | 'INVITADO';

export interface TutoringParticipant {
  id?: number;
  session?: number;
  user: number;
  user_nombre?: string;
  userName?: string;
  user_email?: string;
  userEmail?: string;
  rol_en_sesion: TutoringRole | string;
  rol_en_sesion_display?: string;
  role?: string;
  asistencia: boolean;
  attended?: boolean;
  notas?: string;
}

export interface TutoringObservation {
  id?: number;
  session?: number;
  autor?: number;
  autor_nombre?: string;
  authorName?: string;
  autor_email?: string;
  titulo_tema: string;
  topicTitle?: string;
  contenido: string;
  content?: string;
  created_at?: string;
}

export interface TutoringSession {
  id: number;
  student: number;
  student_nombre?: string;
  student_matricula?: string;
  studentId?: number;
  studentName?: string;
  semester: number;
  semester_numero?: number;
  semesterId?: number;
  semesterNumber?: number;
  fecha_sesion: string;
  sessionDate?: string;
  modalidad: TutoringModality;
  modalidad_display?: string;
  resumen: string;
  proxima_reunion_fecha?: string | null;
  nextMeetingDate?: string;
  proxima_reunion_notas?: string;
  nextMeetingNotes?: string;
  created_by?: number | null;
  created_by_nombre?: string;
  participants: TutoringParticipant[];
  observations: TutoringObservation[];
  total_participantes?: number;
  total_observaciones?: number;
  agreementsCount?: number;
  created_at?: string;
  updated_at?: string;
  createdAt?: string;
}

export interface TutoringSessionCreateRequest {
  student: number;
  semester: number;
  fecha_sesion: string;
  modalidad: TutoringModality;
  resumen: string;
  proxima_reunion_fecha?: string | null;
  proxima_reunion_notas?: string;
  participants?: Array<{
    user: number;
    rol_en_sesion: string;
    asistencia?: boolean;
    notas?: string;
  }>;
  observations?: Array<{
    autor?: number;
    titulo_tema: string;
    contenido: string;
  }>;
}

export interface TutoringSessionCreateResponse {
  tutoring_session_created_id: number;
  mensaje: string;
  tutoring_session: TutoringSession;
}
