// cefrLevels is the canonical ordered set accepted by the domain model.
export const cefrLevels: readonly ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] = [
  'A1',
  'A2',
  'B1',
  'B2',
  'C1',
  'C2',
] as const;

// CefrLevel narrows vocabulary and grammar settings to supported CEFR values.
export type CefrLevel = (typeof cefrLevels)[number];
