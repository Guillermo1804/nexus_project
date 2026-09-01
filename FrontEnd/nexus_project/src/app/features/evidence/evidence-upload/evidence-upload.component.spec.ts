import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { EvidenceUploadComponent } from './evidence-upload.component';
import { EvidenceService } from '../../../core/services/evidence.service';

describe('EvidenceUploadComponent', () => {
  let component: EvidenceUploadComponent;
  let fixture: ComponentFixture<EvidenceUploadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        ReactiveFormsModule,
        EvidenceUploadComponent
      ],
      providers: [EvidenceService]
    }).compileComponents();

    fixture = TestBed.createComponent(EvidenceUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should default to FILE tab', () => {
    expect(component.activeTab()).toBe('FILE');
  });

  it('should switch to DOI tab correctly', () => {
    component.setTab('DOI');
    expect(component.activeTab()).toBe('DOI');
  });
});
