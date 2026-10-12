import { Pipe, PipeTransform } from '@angular/core';
import {
  GrammaticalGender,
  GrammaticalVariants,
  selectGrammaticalVariant,
} from './grammatical-copy';

@Pipe({
  name: 'grammaticalVariant',
  standalone: true,
  pure: true,
})
export class GrammaticalVariantPipe implements PipeTransform {
  transform(
    gender: GrammaticalGender | string | null | undefined,
    variants: GrammaticalVariants,
  ): string {
    return selectGrammaticalVariant(gender, variants);
  }
}
