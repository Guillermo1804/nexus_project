import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth/auth.service';
import { SessionExpiredComponent } from './session-expired.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SessionExpiredComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly auth = inject(AuthService);
}
