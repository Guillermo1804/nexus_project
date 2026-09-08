<<<<<<< HEAD
import { Component } from '@angular/core';
=======
import { Component, inject } from '@angular/core';
>>>>>>> 5500b6479b20ea3dd7350205b1f3603b392e4fa2
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
<<<<<<< HEAD
=======
  protected readonly auth = inject(AuthService);
>>>>>>> 5500b6479b20ea3dd7350205b1f3603b392e4fa2
}
