import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { inject } from '@angular/core';
import { AuthService } from './core/services/auth.service';
import { Router } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shared/components/app-shell/app-shell.component').then(m => m.AppShellComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        canActivate: [
          () => {
            const authService = inject(AuthService);
            const router = inject(Router);
            const role = authService.currentUser()?.role;
            const studentId = authService.getStudentId();

            if (role === 'COORDINADOR' || role === 'ADMIN') {
              return router.createUrlTree(['/dashboard']);
            } else if (role === 'ESTUDIANTE') {
              return router.createUrlTree(['/students', studentId || 'me']);
            } else if (role === 'ASESOR') {
              return router.createUrlTree(['/dashboard']);
            }
            return router.createUrlTree(['/students']);
          }
        ],
        children: []
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'students',
        loadComponent: () => import('./features/students-list/students-list.component').then(m => m.StudentsListComponent)
      },
      {
        path: 'students/:id',
        loadComponent: () => import('./features/student-overview/student-overview.component').then(m => m.StudentOverviewComponent)
      },
      {
        path: 'students/:id/dossier',
        loadComponent: () => import('./features/reporting/full-dossier-report/full-dossier-report.component').then(m => m.FullDossierReportComponent)
      },
      {
        path: 'reporting/dossier/:id',
        loadComponent: () => import('./features/reporting/full-dossier-report/full-dossier-report.component').then(m => m.FullDossierReportComponent)
      },
      {
        path: 'tutoring',
        loadComponent: () => import('./features/student-overview/student-overview.component').then(m => m.StudentOverviewComponent)
      },
      {
        path: 'agreements',
        loadComponent: () => import('./features/agreements/agreements-list/agreements-list.component').then(m => m.AgreementsListComponent)
      },
      {
        path: 'academic-output',
        loadComponent: () => import('./features/academic-output/academic-output.component').then(m => m.AcademicOutputComponent)
      },
      {
        path: 'reports',
        loadComponent: () => import('./features/reporting/full-dossier-report/full-dossier-report.component').then(m => m.FullDossierReportComponent)
      },
      {
        path: 'reports/:id',
        loadComponent: () => import('./features/reporting/full-dossier-report/full-dossier-report.component').then(m => m.FullDossierReportComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
