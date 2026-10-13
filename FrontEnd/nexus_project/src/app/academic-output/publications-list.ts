import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { AcademicService } from '../core/academic/academic.service';
import { Publication, PaginatedResponse } from '../core/academic/academic.models';

@Component({
  selector: 'app-publications-list',
  imports: [CommonModule, DatePipe],
  templateUrl: './publications-list.html',
  styleUrls: ['./publications-list.scss']
})
export class PublicationsListComponent implements OnInit {
  publications: Publication[] = [];
  studentId = 0;

  constructor(
    private academicService: AcademicService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const studentIdParam = this.route.snapshot.paramMap.get('studentId');
    if (studentIdParam) {
      this.studentId = +studentIdParam;
    }
    this.loadPublications();
  }

  loadPublications(): void {
    if (this.studentId > 0) {
      this.academicService.getPublications(this.studentId).subscribe({
        next: (data: PaginatedResponse<Publication>) => {
          this.publications = data.results;
        },
        error: (err: unknown) => {
          console.error('Error al cargar las publicaciones', err);
        }
      });
    }
  }
}