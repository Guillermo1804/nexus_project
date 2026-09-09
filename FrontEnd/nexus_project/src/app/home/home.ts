import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../core/auth/auth.service';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected isLeaving = false;

  logout(): void {
    if (this.isLeaving) return;
    this.isLeaving = true;
    this.auth.logout().pipe(finalize(() => {
      this.auth.clearSession();
      void this.router.navigate(['/login']);
    })).subscribe({ error: () => undefined });
  }
}
