import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AcademicService } from '../../core/academic/academic.service';
import { Publication } from '../../core/academic/academic.models';

@Component({
  selector: 'app-publications-list',
  templateUrl: './publications-list.html',
  styleUrls: ['./publications-list.scss']
})
export class PublicationsListComponent implements OnInit {
  publications: Publication[] = [];
  studentId: number;

  constructor(
    private academicService: AcademicService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.studentId = +this.route.snapshot.paramMap.get('studentId');
    this.loadPublications();
  }

  loadPublications(): void {
    this.academicService.getPublications(this.studentId).subscribe({
      next: (data) => {
        this.publications = data.results;
      },
      error: (err) => {
        console.error('Error al cargar las publicaciones', err);
      }
    });
  }
}