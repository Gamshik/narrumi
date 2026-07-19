import type { SeriesDraftStrategy } from '@domain/index';

// describeDraftStrategy explains update permission and any cast-size conflict.
export function describeDraftStrategy(
  strategy: SeriesDraftStrategy,
  preferredCastSize: 1 | 2 | 3 | 4 | undefined,
  completedCharacterCount: number,
): string {
  if (strategy === 'fill-missing') {
    if (
      preferredCastSize !== undefined &&
      completedCharacterCount > preferredCastSize
    ) {
      return `Keeps your ${completedCharacterCount} existing characters. Use Refine or Rebuild to reduce the cast to ${preferredCastSize}.`;
    }

    return 'Fills empty fields. Everything already written stays unchanged.';
  }

  if (strategy === 'refine') {
    return preferredCastSize === undefined
      ? 'Fills gaps and improves existing fields only when it meaningfully helps.'
      : `Fills gaps, selectively improves the draft, and applies exactly ${preferredCastSize} character${preferredCastSize === 1 ? '' : 's'}.`;
  }

  return 'Creates a new draft. Your idea and story anchors still guide the result.';
}
