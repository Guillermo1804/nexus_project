import { Component, inject } from '@angular/core';
import { DatePipe, JsonPipe } from '@angular/common';
import { finalize } from 'rxjs';
import { AdminAuditLog } from './admin.models';
import { AdminService } from './admin.service';

@Component({
  selector: 'app-audit-management',
  imports: [DatePipe, JsonPipe],
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

  constructor() { this.load(); }

  protected load(page = 1): void {
    this.loading = true;
    this.admin.getAuditLogs(page).pipe(finalize(() => this.loading = false)).subscribe({
      next: (response) => { this.logs = response.results; this.total = response.count; this.page = page; this.hasNext = !!response.next; },
      error: () => this.error = 'No fue posible cargar el historial administrativo.',
    });
  }
}