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

interface AcuerdoVencido {
  id: number;
  descripcion: string;
  estado: string;
  fecha_limite: string;
  fecha_conclusion: string | null;
  responsable: string;
  estudiante: string;
  matricula: string;
  dias_vencido: number;
}

@Component({
  selector: 'app-acuerdos-vencidos-modal',
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
  templateUrl: './acuerdos-vencidos-modal.html',
  styleUrls: ['./acuerdos-vencidos-modal.scss'],
})

export class AcuerdosVencidosModalComponent {
  displayedColumns: string[] = ['descripcion', 'estado', 'fecha_limite', 'dias_vencido', 'responsable', 'estudiante', 'matricula'];
  dataSource: MatTableDataSource<AcuerdoVencido>;

  constructor(
    public dialogRef: MatDialogRef<AcuerdosVencidosModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { acuerdos: AcuerdoVencido[] },
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