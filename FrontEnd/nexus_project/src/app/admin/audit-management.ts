import { Component, inject } from '@angular/core';
import { DatePipe, JsonPipe } from '@angular/common';
import { finalize } from 'rxjs';
import { AdminAuditLog } from './admin.models';
import { AdminService } from './admin.service';

@Component({
  selector: 'app-audit-management',
  imports: [DatePipe, JsonPipe],
  templateUrl: './audit-management.html',
})
export class AuditManagement {
  private readonly admin = inject(AdminService);
  protected logs: AdminAuditLog[] = [];
  protected loading = true;
  protected error = '';

  constructor() {
    this.admin.getAuditLogs().pipe(finalize(() => this.loading = false)).subscribe({
      next: (logs) => this.logs = logs,
      error: () => this.error = 'No fue posible cargar el historial administrativo.',
    });
  }
}