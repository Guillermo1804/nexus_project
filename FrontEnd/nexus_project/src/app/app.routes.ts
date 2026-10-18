import { Routes } from '@angular/router';
import { authGuard, permissionGuard, roleGuard } from './core/auth/auth.guard';
import { RoleManagement } from './admin/role-management';
import { InstitutionalUsers } from './admin/institutional-users';
import { CommitteeManagement } from './admin/committee-management';
import { AuditManagement } from './admin/audit-management';
import { Home } from './home/home';
import { Login } from './login/login';
import { RegistroEstudiante } from './coordinador/registro-estudiante';
import { StudentOverviewComponent } from './expediente/student-overview';
import { AgreementsListComponent } from './agreements/agreements-list';
import { PublicationsListComponent } from './academic-output/publications-list';
import { PublicationFormComponent } from './academic-output/publication-form';
import { EventsListComponent } from './academic-output/events-list';
import { EventFormComponent } from './academic-output/event-form';
import { ResearchStaysListComponent } from './academic-output/research-stays-list';
import { ResearchStayFormPageComponent } from './academic-output/research-stay-form-page';
import { AppShell } from './layout/app-shell';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: '',
    component: AppShell,
    children: [
      { path: 'home', component: Home, canActivate: [authGuard] },
      {
        path: 'expediente/:id',
        component: StudentOverviewComponent,
        canActivate: [authGuard, roleGuard],
        data: { allowedRoles: ['STUDENT', 'TUTOR', 'COMMITTEE_MEMBER', 'PROGRAM_COORDINATOR'] },
      },
      {
        path: 'students/:id/academic-output',
        component: PublicationsListComponent,
        canActivate: [authGuard, roleGuard],
        data: { allowedRoles: ['STUDENT', 'TUTOR', 'COMMITTEE_MEMBER', 'PROGRAM_COORDINATOR'] },
      },
      {
        path: 'students/:id/academic-output/new',
        component: PublicationFormComponent,
        canActivate: [authGuard, roleGuard],
        data: { allowedRoles: ['STUDENT', 'TUTOR', 'COMMITTEE_MEMBER', 'PROGRAM_COORDINATOR'] },
      },
      {
        path: 'students/:id/academic-output/edit/:publicationId',
        component: PublicationFormComponent,
        canActivate: [authGuard, roleGuard],
        data: { allowedRoles: ['STUDENT', 'TUTOR', 'COMMITTEE_MEMBER', 'PROGRAM_COORDINATOR'] },
      },
      {
        path: 'students/:id/academic-output/events',
        component: EventsListComponent,
        canActivate: [authGuard, roleGuard],
        data: { allowedRoles: ['STUDENT', 'TUTOR', 'COMMITTEE_MEMBER', 'PROGRAM_COORDINATOR'] },
      },
      {
        path: 'students/:id/academic-output/events/new',
        component: EventFormComponent,
        canActivate: [authGuard, roleGuard],
        data: { allowedRoles: ['STUDENT', 'TUTOR', 'COMMITTEE_MEMBER', 'PROGRAM_COORDINATOR'] },
      },
      {
        path: 'students/:id/academic-output/events/edit/:eventId',
        component: EventFormComponent,
        canActivate: [authGuard, roleGuard],
        data: { allowedRoles: ['STUDENT', 'TUTOR', 'COMMITTEE_MEMBER', 'PROGRAM_COORDINATOR'] },
      },
      {
        path: 'students/:id/academic-output/research-stays',
        component: ResearchStaysListComponent,
        canActivate: [authGuard, roleGuard],
        data: { allowedRoles: ['STUDENT', 'TUTOR', 'COMMITTEE_MEMBER', 'PROGRAM_COORDINATOR'] },
      },
      {
        path: 'students/:id/academic-output/research-stays/new',
        component: ResearchStayFormPageComponent,
        canActivate: [authGuard, roleGuard],
        data: { allowedRoles: ['STUDENT', 'TUTOR', 'COMMITTEE_MEMBER', 'PROGRAM_COORDINATOR'] },
      },
      {
        path: 'students/:id/academic-output/research-stays/edit/:stayId',
        component: ResearchStayFormPageComponent,
        canActivate: [authGuard, roleGuard],
        data: { allowedRoles: ['STUDENT', 'TUTOR', 'COMMITTEE_MEMBER', 'PROGRAM_COORDINATOR'] },
      },
      {
        path: 'acuerdos',
        component: AgreementsListComponent,
        canActivate: [authGuard, roleGuard],
        data: { allowedRoles: ['STUDENT', 'TUTOR', 'COMMITTEE_MEMBER', 'PROGRAM_COORDINATOR'] },
      },
      {
        path: 'admin/roles',
        component: RoleManagement,
        canActivate: [authGuard, roleGuard, permissionGuard],
        data: { requiredPermission: 'users.role.assign', allowedRoles: ['SYSTEM_ADMIN'] },
      },
      {
        path: 'admin/users',
        component: InstitutionalUsers,
        canActivate: [authGuard, roleGuard, permissionGuard],
        data: { requiredPermission: 'users.role.assign', allowedRoles: ['SYSTEM_ADMIN'] },
      },
      {
        path: 'admin/audit',
        component: AuditManagement,
        canActivate: [authGuard, roleGuard, permissionGuard],
        data: { requiredPermission: 'users.role.assign', allowedRoles: ['SYSTEM_ADMIN'] },
      },
      {
        path: 'coordinator/committee',
        component: CommitteeManagement,
        canActivate: [authGuard, roleGuard, permissionGuard],
        data: { requiredPermission: 'committee.manage', allowedRoles: ['PROGRAM_COORDINATOR'] },
      },
      { path: 'admin/committee', redirectTo: 'coordinator/committee' },
      {
        path: 'coordinator/students/new',
        component: RegistroEstudiante,
        canActivate: [authGuard, roleGuard, permissionGuard],
        data: { requiredPermission: 'students.create', allowedRoles: ['PROGRAM_COORDINATOR'] },
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
