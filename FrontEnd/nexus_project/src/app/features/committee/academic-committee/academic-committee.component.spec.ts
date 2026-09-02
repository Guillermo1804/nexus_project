import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { AcademicCommitteeComponent } from './academic-committee.component';
import { CommitteeService } from '../../../core/services/committee.service';
import { AuthService } from '../../../core/services/auth.service';
import { AcademicCommitteeMember } from '../../../core/models/committee.model';
import { ComponentRef } from '@angular/core';

describe('AcademicCommitteeComponent', () => {
  let component: AcademicCommitteeComponent;
  let componentRef: ComponentRef<AcademicCommitteeComponent>;
  let fixture: ComponentFixture<AcademicCommitteeComponent>;
  let committeeServiceSpy: jasmine.SpyObj<CommitteeService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  const mockMembers: AcademicCommitteeMember[] = [
    {
      id: 1,
      student: 10,
      user: 2,
      user_detail: {
        id: 2,
        email: 'asesor@nexus.edu',
        full_name: 'Dr. Roberto Garcia',
        role: 'ASESOR'
      },
      rol_comite: 'ASESOR_PRINCIPAL',
      rol_comite_display: 'Asesor Principal / Director',
      fecha_asignacion: '2026-01-15',
      is_active: true
    },
    {
      id: 2,
      student: 10,
      user: 3,
      user_detail: {
        id: 3,
        email: 'coasesor@nexus.edu',
        full_name: 'Dra. Sofia Martinez',
        role: 'ASESOR'
      },
      rol_comite: 'COASESOR',
      rol_comite_display: 'Coasesor',
      fecha_asignacion: '2026-01-20',
      is_active: true
    }
  ];

  beforeEach(async () => {
    committeeServiceSpy = jasmine.createSpyObj('CommitteeService', [
      'getCommittee',
      'assignMember',
      'removeMember'
    ]);
    committeeServiceSpy.getCommittee.and.returnValue(of(mockMembers));

    authServiceSpy = jasmine.createSpyObj('AuthService', [], {
      currentUser: () => ({
        id: 1,
        email: 'coord@nexus.edu',
        role: 'COORDINADOR',
        isStaff: true
      })
    });

    await TestBed.configureTestingModule({
      imports: [AcademicCommitteeComponent, HttpClientTestingModule],
      providers: [
        { provide: CommitteeService, useValue: committeeServiceSpy },
        { provide: AuthService, useValue: authServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AcademicCommitteeComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    componentRef.setInput('studentId', 10);
    fixture.detectChanges();
  });

  it('should create and load committee members', () => {
    expect(component).toBeTruthy();
    expect(committeeServiceSpy.getCommittee).toHaveBeenCalledWith(10);
    expect(component.members().length).toBe(2);
    expect(component.members()[0].rol_comite).toBe('ASESOR_PRINCIPAL');
  });

  it('should detect coordinator role', () => {
    expect(component.isCoordinator()).toBeTrue();
  });

  it('should format initials correctly', () => {
    expect(component.getInitials('Roberto Garcia')).toBe('RG');
    expect(component.getInitials('Elena')).toBe('EL');
    expect(component.getInitials('')).toBe('AC');
  });
});
