import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { Home } from './home/home';
import { Login } from './login/login';
import { Register } from './register/register';

<<<<<<< HEAD
import { authGuard } from './auth.guard';
import { HomeComponent } from './home.component';
import { LoginComponent } from './login.component';

export const routes: Routes = [
	{ path: '', pathMatch: 'full', redirectTo: 'home' },
	{ path: 'login', component: LoginComponent },
	{ path: 'home', component: HomeComponent, canActivate: [authGuard] },
	{ path: '**', redirectTo: 'home' },
=======
export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'home', component: Home, canActivate: [authGuard] },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' },
>>>>>>> 5500b6479b20ea3dd7350205b1f3603b392e4fa2
];
