import { Component, inject, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AcademicService } from '../core/academic/academic.service';
import { StudentOverview } from '../core/academic/academic.models';
import { ResearchStayFormComponent } from './research-stay-form';

@Component({
  selector: 'app-research-stay-form-page',
  standalone: true,
  imports: [ResearchStayFormComponent],
  template: `
    <app-research-stay-form
      [studentId]="studentId"
      [semesterId]="selectedSemesterId"
      (saved)="onSaved()"
      (cancelled)="onCancel()"
    />
  `,
})
export class ResearchStayFormPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(AcademicService);
  protected readonly studentId = Number(this.route.snapshot.paramMap.get('id') ?? 0);
  protected selectedSemesterId = 0;

  ngOnInit(): void {
    this.loadSemester();
  }

  private loadSemester() {
    this.service.getStudentOverview(this.studentId).subscribe({
      next: (overview: StudentOverview) => {
        this.selectedSemesterId = overview.current_semester?.id ?? 0;
      },
      error: () => {
        this.selectedSemesterId = 0;
      },
    });
  }

  onSaved() {
    this.router.navigate(['/students', this.studentId, 'academic-output', 'research-stays']);
  }

  onCancel() {
    this.router.navigate(['/students', this.studentId, 'academic-output', 'research-stays']);
  }
}
