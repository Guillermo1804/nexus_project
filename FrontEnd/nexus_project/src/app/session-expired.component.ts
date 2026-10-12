import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from './core/auth/auth.service';
import { ModalFocusDirective } from './shared/modal-focus.directive';

@Component({
  selector: 'app-session-expired',
  standalone: true,
  imports: [ModalFocusDirective],
  templateUrl: './session-expired.component.html',
  styleUrl: './session-expired.component.scss',
})
export class SessionExpiredComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  returnToLogin(): void {
    this.auth.dismissSessionExpired();
    void this.router.navigate(['/login']);
  }
}
