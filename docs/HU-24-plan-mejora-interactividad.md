# Plan de Mejora para el Dashboard del Coordinador (HU-24)

## **Objetivo**
Transformar el **Dashboard del Coordinador** para que sea más funcional e interactivo, permitiendo que los usuarios accedan a detalles específicos al hacer clic en los recuadros de métricas (Estudiantes activos, Tutorías, Acuerdos en seguimiento, Acuerdos vencidos, etc.).

---

## **Contexto**
El dashboard actual muestra métricas clave como:
- Estudiantes activos
- Tutorías del periodo
- Acuerdos en seguimiento
- Acuerdos vencidos

Sin embargo, estas métricas son estáticas. El objetivo es convertirlas en **botones interactivos** que, al ser clickeados, muestren detalles específicos en una modal o sección expandida.

---

## **Cambios Propuestos**

### **1. Backend**

#### **1.1. Modificar `DashboardService`**
Agregar nuevos métodos para devolver detalles específicos:

- **`get_estudiantes_activos()`**: Devuelve una lista de estudiantes activos con detalles como matrícula, nombre, semestre y asesor.
- **`get_tutorias_periodo()`**: Devuelve una lista de tutorías del periodo actual con fechas, modalidad y participantes.
- **`get_acuerdos_segumiento()`**: Devuelve una lista de acuerdos en seguimiento con responsables, fechas límite y estado.
- **`get_acuerdos_vencidos()`**: Devuelve una lista de acuerdos vencidos con días de retraso.

#### **1.2. Actualizar `DashboardView`**
Incluir los nuevos endpoints en la vista para que puedan ser consumidos desde el frontend.

---

### **2. Frontend**

#### **2.1. Convertir recuadros en botones interactivos**
- Usar Angular Material o estilos personalizados para que los recuadros se vean como botones clickeables.
- Al hacer clic en un recuadro, mostrar una **modal** con los detalles específicos.

#### **2.2. Agregar modales para detalles**
Crear componentes de modal para mostrar detalles al hacer clic en cada métrica:

- **Modal para Estudiantes Activos**: Lista de estudiantes con sus datos.
- **Modal para Tutorías del Periodo**: Lista de tutorías con fechas, modalidad y participantes.
- **Modal para Acuerdos en Seguimiento**: Lista de acuerdos con responsables, fechas límite y estado.
- **Modal para Acuerdos Vencidos**: Lista de acuerdos vencidos con días de retraso.

#### **2.3. Mejorar la visualización de gráficos**
- Asegurar que los gráficos (donut y barras) sean accesibles y respondan a clics para mostrar detalles.

---

## **Detalles Técnicos**

### **Backend**

#### **Nuevos Endpoints en `DashboardService`**
```python
@classmethod
def get_estudiantes_activos(cls):
    estudiantes = Student.objects.filter(
        semesters__isnull=False
    ).select_related('user', 'current_semester', 'asesor_principal').order_by('matricula')

    return [{
        'id': s.id,
        'matricula': s.matricula,
        'nombre': s.user.get_full_name(),
        'semestre': s.current_semester.numero,
        'asesor': s.asesor_principal.user.get_full_name() if s.asesor_principal else 'N/A'
    } for s in estudiantes]

@classmethod
def get_tutorias_periodo(cls):
    # Implementar lógica similar para tutorías
    pass

@classmethod
def get_acuerdos_segumiento(cls):
    # Implementar lógica similar para acuerdos en seguimiento
    pass

@classmethod
def get_acuerdos_vencidos(cls):
    # Implementar lógica similar para acuerdos vencidos
    pass
```

#### **Actualizar `DashboardView`**
```python
class DashboardView(APIView):
    permission_classes = [CanReadGlobalAcademics]

    def get(self, request):
        # ... (código existente)
        return Response({
            'kpis': kpis,
            'distribucion_semestres': distribucion_semestres,
            'distribucion_avance_tesis': distribucion_avance_tesis,
            'estudiantes_en_rezago': estudiantes_en_rezago,
            'estudiantes_activos': DashboardService.get_estudiantes_activos(),
            'tutorias_periodo': DashboardService.get_tutorias_periodo(),
            'acuerdos_segumiento': DashboardService.get_acuerdos_segumiento(),
            'acuerdos_vencidos': DashboardService.get_acuerdos_vencidos(),
        })
```

---

### **Frontend**

#### **Modificar `coordinator-dashboard.ts`**
```typescript
import { MatDialog } from '@angular/material/dialog';
// ...

constructor(
  private readonly monitoringService = inject(MonitoringService),
  private dialog: MatDialog
) {}

// Métodos para abrir modales
openEstudiantesActivosModal(): void {
  this.monitoringService.getEstudiantesActivos().subscribe({
    next: (estudiantes) => {
      this.dialog.open(EstudiantesActivosModalComponent, {
        data: { estudiantes },
      });
    },
    error: (err) => {
      console.error('Error al cargar estudiantes:', err);
    }
  });
}
```

#### **Modificar `coordinator-dashboard.html`**
```html
<!-- Ejemplo de recuadro convertido en botón -->
<article class="kpi-card kpi-primary" (click)="openEstudiantesActivosModal()">
  <div class="kpi-icon" aria-hidden="true">👥</div>
  <div class="kpi-content">
    <span class="kpi-value">{{ data.kpis.total_estudiantes_activos }}</span>
    <span class="kpi-label">Estudiantes Activos</span>
  </div>
</article>
```

#### **Crear componentes de modal**
Ejemplo para la modal de estudiantes activos:
```typescript
@Component({
  selector: 'app-estudiantes-activos-modal',
  templateUrl: './estudiantes-activos-modal.html',
  styleUrls: ['./estudiantes-activos-modal.scss'],
})
export class EstudiantesActivosModalComponent {
  constructor(public dialogRef: MatDialogRef<EstudiantesActivosModalComponent>, @Inject(MAT_DIALOG_DATA) public data: any) {}
}
```

---

## **Próximos Pasos**
1. **Implementar los nuevos endpoints en el backend** (`DashboardService` y `DashboardView`).
2. **Modificar el frontend** para convertir los recuadros en botones interactivos y agregar las modales.
3. **Probar la funcionalidad** para asegurar que los detalles se muestren correctamente.

---

## **Beneficios Esperados**
- **Mayor interactividad**: Los usuarios podrán acceder a detalles específicos sin salir del dashboard.
- **Mejor experiencia de usuario**: Visualización clara y directa de la información relevante.
- **Eficiencia**: Reducción del tiempo de búsqueda de información crítica.

---

¿Te parece bien este plan? ¿Quieres que continúe con la implementación o ajustar algún detalle?