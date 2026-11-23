import { FormBuilder } from '@angular/forms';
import { doiOrEvidenceValidator } from './publication-form';

describe('doiOrEvidenceValidator', () => {
  const formBuilder = new FormBuilder();

  it('permite registrar una publicación en preparación sin DOI ni evidencia', () => {
    const form = formBuilder.group({
      estado: 'PREPARACION',
      doi: '',
      evidencia: null,
    });

    expect(doiOrEvidenceValidator(form)).toBeNull();
  });

  it('permite usar evidencia en lugar de DOI para una publicación aceptada', () => {
    const form = formBuilder.group({
      estado: 'ACEPTADO',
      doi: '',
      evidencia: 42,
    });

    expect(doiOrEvidenceValidator(form)).toBeNull();
  });

  it('exige DOI o evidencia para una publicación aceptada', () => {
    const form = formBuilder.group({
      estado: 'ACEPTADO',
      doi: '',
      evidencia: null,
    });

    expect(doiOrEvidenceValidator(form)).toEqual({
      doiOrEvidence: 'Debe proporcionar DOI o evidencia para un articulo aceptado o publicado.',
    });
  });
});
