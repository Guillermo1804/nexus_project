export type PublicationType = 'ARTICULO_JCR' | 'ARTICULO_CONACYT' | 'CAPITULO_LIBRO' | 'OTRO';
export type PublicationStatus = 'PREPARACION' | 'ENVIADO' | 'EN_REVISION' | 'ACEPTADO' | 'PUBLICADO';
export type AcademicEventType = 'CONGRESO_NACIONAL' | 'CONGRESO_INTERNACIONAL' | 'COLOQUIO';
export type ModalityType = 'PRESENCIAL' | 'VIRTUAL' | 'HIBRIDA';
export type OtherProductType = 'SOFTWARE' | 'PROTOTIPO' | 'PATENTE' | 'BASE_DATOS' | 'OTRO';

export interface Publication {
  id: number;
  student: number;
  student_nombre?: string;
  student_matricula?: string;
  semester?: number | null;
  semester_numero?: number | null;
  titulo: string;
  autores_texto: string;
  tipo: PublicationType;
  tipo_display?: string;
  revista_editorial: string;
  estado: PublicationStatus;
  estado_display?: string;
  fecha_publicacion?: string | null;
  doi_url?: string;
  evidencia?: number | null;
  evidencia_titulo?: string | null;
  created_at: string;
  updated_at: string;

  // CamelCase aliases
  studentId?: number;
  studentName?: string;
  studentMatricula?: string;
  semesterId?: number | null;
  semesterNumber?: number | null;
  title?: string;
  authors?: string;
  type?: PublicationType;
  typeDisplay?: string;
  journalPublisher?: string;
  status?: PublicationStatus;
  statusDisplay?: string;
  publicationDate?: string | null;
  doiUrl?: string;
  evidenceId?: number | null;
  evidenceTitle?: string | null;
}

export interface PublicationCreateRequest {
  student: number;
  semester?: number | null;
  titulo: string;
  autores_texto: string;
  tipo: PublicationType;
  revista_editorial: string;
  estado?: PublicationStatus;
  fecha_publicacion?: string | null;
  doi_url?: string;
  evidencia?: number | null;
}

export interface PublicationCreateResponse {
  publication_created_id: number;
  mensaje: string;
  publication: Publication;
}

export interface AcademicEvent {
  id: number;
  student: number;
  student_nombre?: string;
  student_matricula?: string;
  semester?: number | null;
  semester_numero?: number | null;
  tipo_evento: AcademicEventType;
  tipo_evento_display?: string;
  nombre_evento: string;
  titulo_ponencia: string;
  fecha_presentacion: string;
  sede_lugar: string;
  modalidad: ModalityType;
  modalidad_display?: string;
  evidencia?: number | null;
  evidencia_titulo?: string | null;
  created_at: string;
  updated_at: string;

  // CamelCase aliases
  studentId?: number;
  studentName?: string;
  studentMatricula?: string;
  eventType?: AcademicEventType;
  eventTypeDisplay?: string;
  eventName?: string;
  presentationTitle?: string;
  presentationDate?: string;
  locationVenue?: string;
  modality?: ModalityType;
  modalityDisplay?: string;
}

export interface AcademicEventCreateRequest {
  student: number;
  semester?: number | null;
  tipo_evento: AcademicEventType;
  nombre_evento: string;
  titulo_ponencia: string;
  fecha_presentacion: string;
  sede_lugar: string;
  modalidad?: ModalityType;
  evidencia?: number | null;
}

export interface AcademicEventCreateResponse {
  academic_event_created_id: number;
  mensaje: string;
  academic_event: AcademicEvent;
}

export interface ResearchStay {
  id: number;
  student: number;
  student_nombre?: string;
  student_matricula?: string;
  institucion_receptora: string;
  pais: string;
  fecha_inicio: string;
  fecha_fin: string;
  responsable_estancia: string;
  objetivos?: string;
  resultados?: string;
  evidencia?: number | null;
  evidencia_titulo?: string | null;
  created_at: string;
  updated_at: string;

  // CamelCase aliases
  studentId?: number;
  studentName?: string;
  studentMatricula?: string;
  hostInstitution?: string;
  country?: string;
  startDate?: string;
  endDate?: string;
  hostResearcher?: string;
  objectives?: string;
  results?: string;
}

export interface ResearchStayCreateRequest {
  student: number;
  institucion_receptora: string;
  pais: string;
  fecha_inicio: string;
  fecha_fin: string;
  responsable_estancia: string;
  objetivos?: string;
  resultados?: string;
  evidencia?: number | null;
}

export interface ResearchStayCreateResponse {
  research_stay_created_id: number;
  mensaje: string;
  research_stay: ResearchStay;
}

export interface OtherProduct {
  id: number;
  student: number;
  student_nombre?: string;
  student_matricula?: string;
  tipo_producto: OtherProductType;
  tipo_producto_display?: string;
  titulo: string;
  descripcion: string;
  fecha_registro: string;
  evidencia?: number | null;
  evidencia_titulo?: string | null;
  created_at: string;
  updated_at: string;

  // CamelCase aliases
  studentId?: number;
  studentName?: string;
  studentMatricula?: string;
  productType?: OtherProductType;
  productTypeDisplay?: string;
  title?: string;
  description?: string;
  registrationDate?: string;
}

export interface OtherProductCreateRequest {
  student: number;
  tipo_producto: OtherProductType;
  titulo: string;
  descripcion: string;
  fecha_registro?: string;
  evidencia?: number | null;
}

export interface OtherProductCreateResponse {
  other_product_created_id: number;
  mensaje: string;
  other_product: OtherProduct;
}
