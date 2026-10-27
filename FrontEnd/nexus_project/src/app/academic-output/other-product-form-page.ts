import { Component, inject, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AcademicService } from '../core/academic/academic.service';
import { StudentOverview } from '../core/academic/academic.models';
import { OtherProductFormComponent } from './other-product-form';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-other-product-form-page',
  standalone: true,
  imports: [OtherProductFormComponent],
  template: `
    @if (selectedSemesterId > 0 || isEditMode) {
      @if (loadingProduct) {
        <div class="loading-state">Cargando producto...</div>
      } @else {
        <app-other-product-form
          [studentId]="studentId"
          [semesterId]="selectedSemesterId"
          [productId]="productId"
          [initialData]="productData"
          (saved)="onSaved()"
          (cancelled)="onCancel()"
        />
      }
    } @else if (loadingSemester) {
      <div class="loading-state">Cargando semestre activo...</div>
    } @else {
      <div class="error-state">
        <p>No se encontró un semestre activo para este estudiante.</p>
        <p>Por favor, cree un semestre antes de registrar productos académicos.</p>
        <button class="btn-primary" (click)="onCancel()">Volver</button>
      </div>
    }
  `,
  styles: [`
    .loading-state,
    .error-state {
      color: var(--color-text-secondary, #6b7280);
      padding: 3rem 1rem;
      text-align: center;
    }

    .error-state button {
      margin-top: 1rem;
    }
  `],
})
export class OtherProductFormPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(AcademicService);
  protected readonly studentId = Number(this.route.snapshot.paramMap.get('id') ?? 0);
  protected readonly productId = Number(this.route.snapshot.paramMap.get('productId') ?? 0);
  protected readonly isEditMode = this.productId > 0;
  protected selectedSemesterId = 0;
  protected loadingSemester = true;
  protected loadingProduct = false;
  protected productData: any = null;

  ngOnInit(): void {
    this.loadSemester();
    if (this.isEditMode) {
      this.loadProduct();
    }
  }

  private loadSemester() {
    this.service.getStudentOverview(this.studentId).subscribe({
      next: (overview: StudentOverview) => {
        this.selectedSemesterId = overview.current_semester?.id ?? 0;
        this.loadingSemester = false;
      },
      error: () => {
        this.selectedSemesterId = 0;
        this.loadingSemester = false;
      },
    });
  }

  private loadProduct() {
    this.loadingProduct = true;
    this.service.getOtherProducts(this.studentId).pipe(
      finalize(() => this.loadingProduct = false)
    ).subscribe({
      next: (data) => {
        const product = data.results?.find((p: any) => p.id === this.productId) || data.find((p: any) => p.id === this.productId);
        if (product) {
          this.productData = product;
          // Use the product's semester if available
          if (product.semester && !this.selectedSemesterId) {
            this.selectedSemesterId = product.semester;
          }
        }
      },
      error: (err) => {
        console.error('Error cargando producto:', err);
      },
    });
  }

  onSaved() {
    this.router.navigate(['/students', this.studentId, 'academic-output', 'other-products']);
  }

  onCancel() {
    this.router.navigate(['/students', this.studentId, 'academic-output', 'other-products']);
  }
}