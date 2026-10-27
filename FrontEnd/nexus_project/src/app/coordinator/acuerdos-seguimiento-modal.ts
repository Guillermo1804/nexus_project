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

interface AcuerdoSegumiento {
  id: number;
  descripcion: string;
  estado: string;
  fecha_limite: string;
  responsable: string;
  estudiante: string;
  matricula: string;
}

@Component({
  selector: 'app-acuerdos-seguimiento-modal',
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
  templateUrl: './acuerdos-seguimiento-modal.html',
  styleUrls: ['./acuerdos-seguimiento-modal.scss'],
})

export class AcuerdosSegumientoModalComponent {
  displayedColumns: string[] = ['descripcion', 'estado', 'fecha_limite', 'responsable', 'estudiante', 'matricula'];
  dataSource: MatTableDataSource<AcuerdoSegumiento>;

  constructor(
    public dialogRef: MatDialogRef<AcuerdosSegumientoModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { acuerdos: AcuerdoSegumiento[] },
    public sort: MatSort
  ) {
    this.dataSource = new MatTableDataSource(data.acuerdos);
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