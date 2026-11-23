import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AcademicService } from '../core/academic/academic.service';
import { ToastService } from '../shared/toast.service';
import { ConfirmDialogComponent, ConfirmRequest } from '../shared/confirm-dialog.component';
import { OtherProduct, typeLabel, badgeClass } from '../core/academic/academic.models';
import { AuthService } from '../core/auth/auth.service';

@Component({
  selector: 'app-other-products-list',
  imports: [CommonModule, DatePipe, RouterLink, ConfirmDialogComponent],
  templateUrl: './other-products-list.html',
  styleUrls: ['./other-products-list.scss']
})
export class OtherProductsListComponent implements OnInit {
  otherProducts: OtherProduct[] = [];
  studentId = 0;
  loading = false;
  error: string | null = null;
  readonly auth: AuthService;
  pendingDelete: OtherProduct | null = null;
  readonly deleteRequest: ConfirmRequest = {
    title: 'Eliminar producto',
    message: '',
    warning: 'Esta acción no se puede deshacer.',
    confirmLabel: 'Eliminar',
    cancelLabel: 'Cancelar',
    tone: 'danger',
  };
  badgeClass = badgeClass;
  typeLabel = typeLabel;

  constructor(
    private academicService: AcademicService,
    private route: ActivatedRoute,
    private router: Router,
    private toastService: ToastService,
    auth: AuthService
  ) { this.auth = auth; }

  get canManage(): boolean {
    return this.auth.user?.role === 'STUDENT' && this.auth.user.student_id === this.studentId;
  }

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
    this.pendingDelete = product;
    this.deleteRequest.message = `¿Está seguro de eliminar el producto "${product.titulo}"?`;
  }

  confirmDelete(): void {
    const product = this.pendingDelete;
    if (!product) return;

    this.pendingDelete = null;
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

  cancelDelete(): void {
    this.pendingDelete = null;
  }
}