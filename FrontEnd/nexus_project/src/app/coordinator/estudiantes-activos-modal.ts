import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

interface EstudianteActivo {
  id: number;
  matricula: string;
  nombre: string;
  semestre: string | number;
  asesor: string;
}

@Component({
  selector: 'app-estudiantes-activos-modal',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
  ],
  templateUrl: './estudiantes-activos-modal.html',
  styleUrls: ['./estudiantes-activos-modal.scss'],
})

export class EstudiantesActivosModalComponent {
  displayedColumns: string[] = ['matricula', 'nombre', 'semestre', 'asesor'];
  dataSource: MatTableDataSource<EstudianteActivo>;

  constructor(
    public dialogRef: MatDialogRef<EstudiantesActivosModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { estudiantes: EstudianteActivo[] },
    public sort: MatSort
  ) {
    this.dataSource = new MatTableDataSource(data.estudiantes);
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