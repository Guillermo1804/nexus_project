import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { finalize } from 'rxjs';
import { AdminAuditLog } from './admin.models';
import { AdminService } from './admin.service';

@Component({
  selector: 'app-audit-management',
  imports: [DatePipe],
  templateUrl: './audit-management.html',
  styleUrls: ['./audit-management.scss'],
})
export class AuditManagement {
  private readonly admin = inject(AdminService);
  protected logs: AdminAuditLog[] = [];
  protected loading = true;
  protected error = '';
  protected page = 1;
  protected total = 0;
  protected hasNext = false;
  /** Ids de las filas desplegadas; el resto se ve resumida. */
  protected expanded = new Set<number>();
  /** Se calcula al cargar: en la plantilla se reharía en cada detección de cambios. */
  private rowsPorLog = new Map<number, { label: string; value: string }[]>();

  constructor() { this.load(); }

  protected readonly actionLabels: Record<string, string> = {
    ROLE_ASSIGNED: 'Rol asignado',
    INSTITUTIONAL_USER_CREATED: 'Cuenta institucional creada',
    COMMITTEE_ASSIGNED: 'Asociación creada',
    COMMITTEE_STATUS_CHANGED: 'Estado de asociación cambiado',
  };

  protected readonly roleLabels: Record<string, string> = {
    SYSTEM_ADMIN: 'Administración del sistema',
    PROGRAM_COORDINATOR: 'Coordinación del programa',
    TUTOR: 'Tutor',
    COMMITTEE_MEMBER: 'Miembro del comité',
    STUDENT: 'Estudiante',
    ASESOR: 'Asesor principal',
    COASESOR: 'Coasesor',
    COMMITTEE_MEMBER_ROLE: 'Miembro del comité',
  };

  private readonly detailLabels: Record<string, string> = {
    student_matricula: 'Matrícula',
    email: 'Correo',
    role: 'Rol',
    previous_role: 'Rol anterior',
    new_role: 'Rol nuevo',
    timestamp: 'Momento',
    created_at: 'Alta',
    status: 'Estado',
  };

  protected actionLabel(action: string): string {
    return this.actionLabels[action] ?? action.replaceAll('_', ' ').toLowerCase();
  }

  /** Los detalles se muestran como pares etiquetados, no como JSON recortado. */
  protected detailRows(log: AdminAuditLog): { label: string; value: string }[] {
    return this.rowsPorLog.get(log.id) ?? [];
  }

  private buildRows(log: AdminAuditLog): { label: string; value: string }[] {
    const details = log.details ?? {};
    return Object.entries(details)
      .filter(([, value]) => value !== null && value !== undefined && value !== '')
      .map(([key, value]) => ({ label: this.detailLabels[key] ?? key.replaceAll('_', ' '), value: this.formatValue(key, value) }));
  }

  private formatValue(key: string, value: unknown): string {
    if (typeof value !== 'string') return JSON.stringify(value);
    // Cualquier clave de rol (`role`, `previous_role`, `new_role`) se traduce: dejar
    // la constante en pantalla es justo lo que se complaint del formato.
    if (key === 'role' || key.endsWith('_role')) return this.roleLabels[value] ?? value;
    if (key === 'timestamp' || key === 'created_at') {
      const fecha = new Date(value);
      return Number.isNaN(fecha.getTime()) ? value : fecha.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
    }
    return value;
  }

  protected isExpanded(log: AdminAuditLog): boolean { return this.expanded.has(log.id); }

  protected toggleExpanded(log: AdminAuditLog): void {
    const next = new Set(this.expanded);
    next.has(log.id) ? next.delete(log.id) : next.add(log.id);
    this.expanded = next;
  }

  protected load(page = 1): void {
    this.loading = true;
    this.admin.getAuditLogs(page).pipe(finalize(() => (this.loading = false))).subscribe({
      next: (response) => {
        this.logs = response.results;
        this.rowsPorLog = new Map(response.results.map((log) => [log.id, this.buildRows(log)]));
        this.total = response.count;
        this.page = page;
        this.hasNext = !!response.next;
      },
      error: () => this.error = 'No fue posible cargar el historial administrativo.',
    });
  }
}