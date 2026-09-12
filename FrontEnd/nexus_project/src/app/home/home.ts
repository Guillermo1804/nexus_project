import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../core/auth/auth.service';
import { AcademicService } from '../core/academic/academic.service';
import { StudentRecord } from '../core/academic/academic.models';

@Component({
  selector: 'app-home',
  imports: [CommonModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly academicService = inject(AcademicService);
  private readonly router = inject(Router);
  protected isLeaving = false;
  protected estudiantes: StudentRecord[] = [];
  protected cargandoEstudiantes = false;

  ngOnInit(): void {
    if (this.auth.hasPermission('academic.read.global')) {
      this.cargarEstudiantes();
    }
  }

  cargarEstudiantes(): void {
    this.cargandoEstudiantes = true;
    this.academicService
      .getGlobalOverview()
      .pipe(finalize(() => (this.cargandoEstudiantes = false)))
      .subscribe({
        next: (data) => {
          this.estudiantes = data;
        },
        error: () => {
          this.estudiantes = [];
        },
      });
  }

  logout(): void {
    if (this.isLeaving) return;
    this.isLeaving = true;
    this.auth
      .logout()
      .pipe(
        finalize(() => {
          this.auth.clearSession();
          void this.router.navigate(['/login']);
        })
      )
      .subscribe({ error: () => undefined });
  }
}
