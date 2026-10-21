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
    <section class="nexus-card other-product-page">
      <div class="form-header">
        <div class="header-content">
          <span class="eyebrow">TRANSFERENCIA TECNOLÓGICA</span>
          <h1>{{ isEditMode ? 'Editar Producto Académico' : 'Registrar Producto Académico' }}</h1>
          <p>{{ isEditMode ? 'Modifique la información del producto académico.' : 'Complete la información del producto académico de valor tecnológico o transferencia.' }}</p>
        </div>
        <button type="button" class="btn-secondary" (click)="onCancel()">Cancelar</button>
      </div>
      <div class="form-container">
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
      </div>
    </section>
  `,
  styles: [`
    .other-product-page {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem 1rem;
    }

    .form-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;
      gap: 2rem;
    }

    .header-content {
      flex: 1;
    }

    .eyebrow {
      display: block;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-muted, #6b7280);
      margin-bottom: 0.5rem;
    }

    .form-header h1 {
      margin: 0 0 0.5rem 0;
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--color-text-primary, #111827);
    }

    .form-header p {
      margin: 0;
      color: var(--color-text-secondary, #6b7280);
      font-size: 1rem;
    }

    .form-container {
      background: white;
      border: 1px solid var(--color-border, #e5e7eb);
      border-radius: 0.75rem;
      padding: 2rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    .loading-state,
    .error-state {
      text-align: center;
      padding: 3rem 1rem;
      color: var(--color-text-secondary, #6b7280);
    }

    .error-state button {
      margin-top: 1rem;
    }

    @media (max-width: 768px) {
      .form-header {
        flex-direction: column;
      }

      .form-container {
        padding: 1.5rem;
      }
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