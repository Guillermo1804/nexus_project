import { Routes } from '@angular/router';

import { authGuard } from './auth.guard';
import { HomeComponent } from './home.component';
import { LoginComponent } from './login.component';

export const routes: Routes = [
	{ path: '', pathMatch: 'full', redirectTo: 'home' },
	{ path: 'login', component: LoginComponent },
	{ path: 'home', component: HomeComponent, canActivate: [authGuard] },
	{ path: '**', redirectTo: 'home' },
];
