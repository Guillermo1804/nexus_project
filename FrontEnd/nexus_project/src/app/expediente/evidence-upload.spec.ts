import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { EvidenceUploadComponent, MAX_EVIDENCE_BYTES } from './evidence-upload';

describe('EvidenceUploadComponent', () => {
  let fixture: ComponentFixture<EvidenceUploadComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [EvidenceUploadComponent, HttpClientTestingModule] }).compileComponents();
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
});
