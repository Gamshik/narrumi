import assert from 'node:assert/strict';
import test from 'node:test';

import { getDictionaryPickerSummary } from './dictionaryPickerCopy';

test('dictionary picker does not report matches before search starts', (): void => {
  assert.equal(
    getDictionaryPickerSummary({
      isLoading: false,
      search: '',
      visibleWordCount: 32,
    }),
    'Suggestions from the local dictionary',
  );
});

test('dictionary picker reports bounded matches after a query', (): void => {
  assert.equal(
    getDictionaryPickerSummary({
      isLoading: false,
      search: 'drift',
      visibleWordCount: 1,
    }),
    '1 match shown',
  );
});
