import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from './auth.service';

@Component({
  selector: 'app-session-expired',
  standalone: true,
  templateUrl: './session-expired.component.html',
  styleUrl: './session-expired.component.scss',
})
export class SessionExpiredComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  returnToLogin(): void {
    this.auth.dismissExpiredSession();
    void this.router.navigate(['/login']);
  }
}
