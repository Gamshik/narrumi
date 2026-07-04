import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ReactElement } from 'react';

import { createGetVocabularyItem } from '@application/index';
import type { VocabularyItem } from '@domain/index';
import { BundledOxfordVocabularyCatalog } from '@infrastructure/index';
import {
  DictionaryWordDetailsSheet,
  useAppStyles,
} from '@presentation/app';

// Use case instance is module-scoped so the bundled catalog is parsed once per route module.
const getVocabularyItem = createGetVocabularyItem(
  new BundledOxfordVocabularyCatalog(),
);

// Route contract: resolves a dictionary word id into native sheet content.
export default function DictionaryWordDetailsRoute(): ReactElement {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { styles } = useAppStyles();
  // word stays null/undefined until the local catalog resolves the route id.
  const [word, setWord] = useState<VocabularyItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Details are loaded from the bundled catalog only; no network lookup is allowed here.
    if (id) {
      setIsLoading(true);
      void getVocabularyItem.execute(id).then((result) => {
        setWord(result ?? null);
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, [id]);

  return (
    <DictionaryWordDetailsSheet
      styles={styles}
      word={word}
      isLoading={isLoading}
      onClose={() => router.back()}
    />
  );
}
