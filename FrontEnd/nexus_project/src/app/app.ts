import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { SessionExpiredComponent } from './session-expired.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SessionExpiredComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
}
