// DictionaryPickerSummaryInput carries the visible state used by picker status copy.
export type DictionaryPickerSummaryInput = {
  // isLoading distinguishes catalog work from a settled empty result.
  readonly isLoading: boolean;
  // search is the controlled query entered by the learner.
  readonly search: string;
  // visibleWordCount is the bounded number of rows currently rendered.
  readonly visibleWordCount: number;
};

// getDictionaryPickerSummary avoids claiming search matches before a query exists.
export function getDictionaryPickerSummary({
  isLoading,
  search,
  visibleWordCount,
}: DictionaryPickerSummaryInput): string {
  if (isLoading) {
    return search.trim()
      ? 'Searching the local dictionary...'
      : 'Loading local suggestions...';
  }

  if (!search.trim()) {
    return 'Suggestions from the local dictionary';
  }

  if (visibleWordCount === 0) {
    return 'No matches';
  }

  return `${visibleWordCount} ${visibleWordCount === 1 ? 'match' : 'matches'} shown`;
}
