import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { createGetVocabularyItem } from '@application/index';
import type { VocabularyItem } from '@domain/index';
import { BundledOxfordVocabularyCatalog } from '@infrastructure/index';
import {
  DictionaryWordDetailsSheet,
  useAppStyles,
} from '@presentation/app';

const getVocabularyItem = createGetVocabularyItem(
  new BundledOxfordVocabularyCatalog(),
);

export default function DictionaryWordDetailsRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { styles } = useAppStyles();
  const [word, setWord] = useState<VocabularyItem>();

  useEffect(() => {
    if (id) {
      void getVocabularyItem.execute(id).then(setWord);
    }
  }, [id]);

  return (
    <DictionaryWordDetailsSheet
      styles={styles}
      word={word}
      onClose={() => router.back()}
    />
  );
}
