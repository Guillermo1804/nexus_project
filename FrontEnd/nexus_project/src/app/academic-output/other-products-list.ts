import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AcademicService } from '../core/academic/academic.service';
import { ToastService } from '../shared/toast.service';
import { OtherProduct, typeLabel, badgeClass } from '../core/academic/academic.models';

@Component({
  selector: 'app-other-products-list',
  imports: [CommonModule, DatePipe],
  templateUrl: './other-products-list.html',
  styleUrls: ['./other-products-list.scss']
})
export class OtherProductsListComponent implements OnInit {
  otherProducts: OtherProduct[] = [];
  studentId = 0;
  loading = false;
  error: string | null = null;
  badgeClass = badgeClass;
  typeLabel = typeLabel;

  constructor(
    private academicService: AcademicService,
    private route: ActivatedRoute,
    private router: Router,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    const studentIdParam = this.route.snapshot.paramMap.get('id');
    if (studentIdParam) {
      this.studentId = +studentIdParam;
    }
    this.loadOtherProducts();
  }

  loadOtherProducts(): void {
    if (this.studentId > 0) {
      this.loading = true;
      this.academicService.getOtherProducts(this.studentId).subscribe({
        next: (data: any) => {
          this.otherProducts = data.results || data;
          this.loading = false;
        },
        error: (err: unknown) => {
          console.error('Error al cargar los otros productos', err);
          this.loading = false;
        }
      });
    }
  }

  newOtherProduct(): void {
    this.router.navigate(['/students', this.studentId, 'academic-output', 'other-products', 'new']);
  }

  editOtherProduct(product: OtherProduct): void {
    this.router.navigate(['/students', this.studentId, 'academic-output', 'other-products', 'edit', product.id]);
  }

  deleteOtherProduct(product: OtherProduct): void {
    if (confirm(`¿Está seguro de eliminar el producto "${product.titulo}"?`)) {
      this.academicService.deleteOtherProduct(product.id).subscribe({
        next: () => {
          this.toastService.exito('Producto eliminado exitosamente');
          this.loadOtherProducts();
        },
        error: (err) => {
          this.toastService.error('Error al eliminar el producto');
          console.error(err);
        }
      });
    }
  }
}