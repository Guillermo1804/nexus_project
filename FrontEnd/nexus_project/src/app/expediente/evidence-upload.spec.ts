import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { AcademicService } from '../core/academic/academic.service';
import { EvidenceUploadComponent, MAX_EVIDENCE_BYTES } from './evidence-upload';

describe('EvidenceUploadComponent', () => {
  let fixture: ComponentFixture<EvidenceUploadComponent>;
  let academic: jasmine.SpyObj<AcademicService>;
  beforeEach(async () => {
    academic = jasmine.createSpyObj<AcademicService>('AcademicService', ['uploadEvidence', 'linkEvidence']);
    await TestBed.configureTestingModule({
      imports: [EvidenceUploadComponent, HttpClientTestingModule],
      providers: [{ provide: AcademicService, useValue: academic }],
    }).compileComponents();
    fixture = TestBed.createComponent(EvidenceUploadComponent);
    fixture.componentRef.setInput('studentId', 1);
  });

  it('prevalidates 15 MiB + 1 and accepts exactly 15 MiB', () => {
    const input = document.createElement('input');
    const oversized = new File([new Uint8Array(MAX_EVIDENCE_BYTES + 1)], 'large.pdf', { type: 'application/pdf' });
    Object.defineProperty(input, 'files', { value: [oversized], configurable: true });
    fixture.componentInstance.selectFile({ target: input } as unknown as Event);
    expect(fixture.componentInstance.file).toBeNull();
    expect(fixture.componentInstance.error).toContain('15 MiB');

    const exact = new File([new Uint8Array(MAX_EVIDENCE_BYTES)], 'exact.pdf', { type: 'application/pdf' });
    Object.defineProperty(input, 'files', { value: [exact], configurable: true });
    fixture.componentInstance.selectFile({ target: input } as unknown as Event);
    expect(fixture.componentInstance.file).toBe(exact);
  });

  it('exposes an accessible constrained file input', () => {
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#evidence-file');
    expect(input.labels?.[0].textContent).toContain('máximo 15 MiB');
    expect(input.accept).toContain('.pdf');
    expect(input.required).toBeTrue();
  });

  it('validates DOI and safe URL links', () => {
    const component = fixture.componentInstance;
    component.link = '10.1000/182';
    expect(component.linkKind).toBe('DOI');
    expect(component.testLinkHref).toBe('https://doi.org/10.1000/182');
    component.link = 'https://example.org/evidence';
    expect(component.linkKind).toBe('URL');
    component.link = 'javascript:alert(1)';
    expect(component.linkKind).toBeNull();
  });

  it('submits link evidence as ENLACE_DOI and emits saved', () => {
    academic.linkEvidence.and.returnValue(of({} as any));
    const component = fixture.componentInstance;
    fixture.componentRef.setInput('currentSemesterId', 2);
    component.title = 'Repositorio';
    component.semesterId = 2;
    component.link = '10.1000/182';
    spyOn(component.saved, 'emit');

    component.submitLink();

    expect(academic.linkEvidence).toHaveBeenCalledWith(jasmine.objectContaining({
      student: 1,
      semester: 2,
      tipo: 'ENLACE_DOI',
      enlace_url: '10.1000/182',
    }));
    expect(component.saved.emit).toHaveBeenCalled();
  });

  it('explica qué falta en lugar de dejar el botón deshabilitado en silencio', () => {
    fixture.componentRef.setInput('semesters', [{ id: 1, numero: 1, is_active: true } as any]);
    fixture.componentRef.setInput('currentSemesterId', 1);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    const pending = fixture.nativeElement.querySelector('#evidence-pending-file') as HTMLElement;
    expect(pending.textContent).toContain('un archivo');
    expect(pending.textContent).toContain('el título de la evidencia');
    expect((fixture.nativeElement.querySelector('.evidence-modal button[type=submit], button[type=submit]') as HTMLButtonElement).disabled).toBeTrue();

    component.title = 'Bitácora';
    component.semesterId = 1;
    component.file = new File([new Uint8Array([1])], 'evidencia.pdf', { type: 'application/pdf' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#evidence-pending-file')).toBeNull();
    expect((fixture.nativeElement.querySelector('button[type=submit]') as HTMLButtonElement).disabled).toBeFalse();
  });

  it('muestra y acepta únicamente el semestre vigente', () => {
    fixture.componentRef.setInput('semesters', [
      { id: 1, numero: 1, is_active: false },
      { id: 2, numero: 2, is_active: true },
    ] as any);
    fixture.componentRef.setInput('currentSemesterId', 2);
    fixture.detectChanges();

    const semesterInput = fixture.nativeElement.querySelector('input[name="semester"]') as HTMLInputElement;
    expect(semesterInput.value).toBe('Semestre 2');
    expect(semesterInput.readOnly).toBeTrue();

    const component = fixture.componentInstance;
    component.title = 'Bitácora';
    component.semesterId = 1;
    expect(component.commonFieldsValid).toBeFalse();
    component.semesterId = 2;
    expect(component.commonFieldsValid).toBeTrue();
  });

  it('muestra un indicador de carga mientras vincula la evidencia', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.upload-progress')).toBeNull();

    fixture.componentInstance.uploading = true;
    fixture.detectChanges();

    const indicator = fixture.nativeElement.querySelector('.upload-progress') as HTMLElement;
    expect(indicator).withContext('indicador de carga').toBeTruthy();
    expect(indicator.getAttribute('role')).toBe('status');
    expect(indicator.textContent).toContain('Vinculando');
    expect(fixture.nativeElement.querySelector('.spinner')).withContext('spinner').toBeTruthy();
    expect((fixture.nativeElement.querySelector('.actions .btn-secondary') as HTMLButtonElement).disabled)
      .withContext('cancelar bloqueado durante la subida').toBeTrue();

    fixture.componentInstance.uploading = false;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.upload-progress')).toBeNull();
  });
});
