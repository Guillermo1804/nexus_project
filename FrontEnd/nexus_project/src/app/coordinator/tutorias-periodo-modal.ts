import { Component, Inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

interface TutoriaPeriodo {
  id: number;
  fecha: string;
  modalidad: string;
  estudiante: string;
  matricula: string;
  semestre: string | number;
  resumen: string;
}

@Component({
  selector: 'app-tutorias-periodo-modal',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    MatDialogModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
  ],
  templateUrl: './tutorias-periodo-modal.html',
  styleUrls: ['./tutorias-periodo-modal.scss'],
})

export class TutoriasPeriodoModalComponent {
  displayedColumns: string[] = ['fecha', 'modalidad', 'estudiante', 'matricula', 'semestre'];
  dataSource: MatTableDataSource<TutoriaPeriodo>;

  constructor(
    public dialogRef: MatDialogRef<TutoriasPeriodoModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { tutorias: TutoriaPeriodo[] },
    public sort: MatSort
  ) {
    this.dataSource = new MatTableDataSource(data.tutorias);
    this.dataSource.sort = this.sort;
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  onNoClick(): void {
    this.dialogRef.close();
  }
}