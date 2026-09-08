export interface ThesisComponents {
  protocolo: number;
  estadoArte: number;
  marcoTeorico: number;
  metodologia: number;
  analisis: number;
  redaccion: number;
}

export interface ThesisProgress {
  id?: number;
  student?: number;
  student_nombre?: string;
  student_matricula?: string;
  semester?: number;
  semester_numero?: number;
  porcentaje_avance?: number;
  componentes_json?: ThesisComponents;
  observaciones?: string;
  fecha_registro?: string;
  created_at?: string;
  updated_at?: string;

  // CamelCase aliases
  studentId?: number;
  studentName?: string;
  studentMatricula?: string;
  thesisTitle?: string;
  researchLine?: string;
  overallPercentage?: number;
  chapters?: any[];
  lastUpdated?: string;
  semesterId?: number;
  semesterNumero?: number;
  currentPercentage?: number;
  percentage?: number;
  components?: ThesisComponents;
  chapterProgress?: any[];
  summary?: string;
  observations?: string;
  registrationDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ThesisProgressCreateRequest {
  student: number;
  semester: number;
  porcentaje_avance: number;
  componentes_json?: ThesisComponents;
  observaciones?: string;
  fecha_registro?: string;
}

export interface ThesisProgressCreateResponse {
  thesis_progress_created_id: number;
  mensaje: string;
  thesis_progress: ThesisProgress;
}

export interface ThesisHistoryItem {
  id?: number;
  semester_id?: number;
  semester_numero: number;
  porcentaje_avance: number;
  fecha_registro: string;
  componentes: ThesisComponents;
  componentes_json?: ThesisComponents;
  observaciones?: string;
  created_at?: string;

  // CamelCase aliases
  semesterNumber?: number;
  percentage?: number;
  registrationDate?: string;
  components?: ThesisComponents;
  observations?: string;
}

export interface ThesisHistoryResponse {
  student_id: number;
  student_matricula?: string;
  student_nombre?: string;
  total_registros: number;
  progreso_actual: number;
  historico: ThesisHistoryItem[];

  // CamelCase aliases
  studentId?: number;
  studentMatricula?: string;
  studentName?: string;
  totalRecords?: number;
  currentProgress?: number;
  history?: ThesisHistoryItem[];
}
