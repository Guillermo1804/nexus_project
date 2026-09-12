import { Routes } from '@angular/router';
import { authGuard, permissionGuard } from './core/auth/auth.guard';
import { RoleManagement } from './admin/role-management';
import { InstitutionalUsers } from './admin/institutional-users';
import { CommitteeManagement } from './admin/committee-management';
import { AuditManagement } from './admin/audit-management';
import { Home } from './home/home';
import { Login } from './login/login';
import { Register } from './register/register';
import { RegistroEstudiante } from './coordinador/registro-estudiante';
import { StudentOverviewComponent } from './expediente/student-overview';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'home', component: Home, canActivate: [authGuard] },
  {
    path: 'expediente/:id',
    component: StudentOverviewComponent,
    canActivate: [authGuard],
  },
  {
    path: 'admin/roles',
    component: RoleManagement,
    canActivate: [authGuard, permissionGuard],
    data: { requiredPermission: 'users.role.assign' },
  },
  {
    path: 'admin/users',
    component: InstitutionalUsers,
    canActivate: [authGuard, permissionGuard],
    data: { requiredPermission: 'users.role.assign' },
  },
  {
    path: 'admin/committee',
    component: CommitteeManagement,
    canActivate: [authGuard, permissionGuard],
    data: { requiredPermission: 'users.role.assign' },
  },
  {
    path: 'admin/audit',
    component: AuditManagement,
    canActivate: [authGuard, permissionGuard],
    data: { requiredPermission: 'users.role.assign' },
  },
  {
    path: 'coordinator/students/new',
    component: RegistroEstudiante,
    canActivate: [authGuard, permissionGuard],
    data: { requiredPermission: 'students.create' },},
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' },
];
