import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StudentRecord } from '../core/academic/academic.models';

@Component({
  selector: 'app-academic-committee-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './academic-committee-card.component.html',
  styleUrl: './academic-committee-card.component.scss',
})
export class AcademicCommitteeCardComponent {
  readonly student = input.required<StudentRecord>();
}
