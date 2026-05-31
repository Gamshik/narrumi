import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import {
  type DailyLearningSession,
  learningGenres,
  type LearningGenre,
  type VocabularyItem,
  type WordPracticeDecision,
} from '@domain/index';

import { localAppServices } from '../services/localAppServices';
import type { AppStyles } from '../types';

// genreLabels maps domain genre values to user-facing labels from the PRD.
const genreLabels: Record<LearningGenre, string> = {
  'daily-life': 'Daily Life',
  'work-it': 'Work & IT',
  'travel-leisure': 'Travel',
  'short-fiction': 'Short Fiction',
};

// DailySessionScreenProps carries themed styles into the local practice flow.
type DailySessionScreenProps = {
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
};

// SessionStage tracks the visible part of the local daily flow.
type SessionStage = 'loading' | 'practice' | 'genre' | 'generation';

// SessionState stores the loaded local session and vocabulary cards.
type SessionState = {
  // session is the persisted local daily session.
  readonly session: DailyLearningSession;
  // words are the ordered vocabulary cards shown in local practice.
  readonly words: readonly VocabularyItem[];
};

// DailySessionScreen assembles local flashcard practice and genre selection.
export function DailySessionScreen({
  styles,
}: DailySessionScreenProps): ReactElement {
  const [stage, setStage] = useState<SessionStage>('loading');
  const [sessionState, setSessionState] = useState<SessionState>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    let isActive = true;

    void localAppServices.networkStatus
      .getCurrentState()
      .then((state) => {
        if (isActive) {
          setIsOnline(state.isOnline);
        }
      })
      .catch(() => setIsOnline(false));

    void startLocalSession(isActive);

    return () => {
      isActive = false;
    };
  }, []);

  const currentWord = useMemo(
    () =>
      sessionState?.words.find(
        (word) => !sessionState.session.completedWordIds.includes(word.id),
      ),
    [sessionState],
  );

  const startLocalSession = async (isActive = true): Promise<void> => {
    setIsLoading(true);
    setErrorMessage(undefined);

    try {
      const { session } = await localAppServices.startDailySession.execute();
      const words = await loadSessionWords(session);

      if (isActive) {
        setSessionState({ session, words });
        setStage(resolveSessionStage(session, words));
      }
    } catch {
      if (isActive) {
        setErrorMessage('Local daily session could not be loaded.');
      }
    } finally {
      if (isActive) {
        setIsLoading(false);
      }
    }
  };

  const completeCard = async (
    word: VocabularyItem,
    decision: WordPracticeDecision,
  ): Promise<void> => {
    if (!sessionState) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(undefined);

    try {
      await localAppServices.markWordPracticeProgress.execute({
        wordId: word.id,
        decision,
      });
      const session = await localAppServices.updateDailySession.execute({
        session: sessionState.session,
        completedWordId: word.id,
      });

      setSessionState({ ...sessionState, session });

      if (session.completedWordIds.length >= sessionState.words.length) {
        setStage('genre');
      }
    } catch {
      setErrorMessage('Word progress could not be saved locally.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectGenre = async (genre: LearningGenre): Promise<void> => {
    if (!sessionState) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(undefined);

    try {
      const session = await localAppServices.updateDailySession.execute({
        session: sessionState.session,
        selectedGenre: genre,
        shouldComplete: true,
      });

      setSessionState({ ...sessionState, session });
      setStage('generation');
    } catch {
      setErrorMessage('Genre choice could not be saved locally.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.screenContent}>
      <View style={styles.homeHeader}>
        <Text style={styles.largeTitle}>Daily Session</Text>
      </View>

      {errorMessage ? (
        <View style={styles.stateMessage}>
          <Text style={styles.stateMessageTitle}>{errorMessage}</Text>
        </View>
      ) : null}

      {stage === 'loading' ? (
        <View style={styles.settingsCard}>
          <Text style={styles.actionTitle}>Loading local flashcards...</Text>
          <Text style={styles.secondaryText}>
            Daily word count is taken from Settings and progress is saved on
            this device.
          </Text>
        </View>
      ) : null}

      {stage === 'practice' && sessionState && currentWord ? (
        <PracticeCard
          isLoading={isLoading}
          progressLabel={`${sessionState.session.completedWordIds.length + 1} of ${
            sessionState.words.length
          }`}
          styles={styles}
          word={currentWord}
          onDecision={completeCard}
        />
      ) : null}

      {stage === 'genre' && sessionState ? (
        <GenreSelection
          isLoading={isLoading}
          selectedGenre={sessionState.session.selectedGenre}
          styles={styles}
          onSelectGenre={selectGenre}
        />
      ) : null}

      {stage === 'generation' && sessionState ? (
        <GenerationState
          isOnline={isOnline}
          selectedGenre={sessionState.session.selectedGenre}
          styles={styles}
        />
      ) : null}
    </ScrollView>
  );
}

// PracticeCard renders one local flashcard with simple practice decisions.
function PracticeCard({
  isLoading,
  progressLabel,
  styles,
  word,
  onDecision,
}: {
  // isLoading disables duplicate progress writes.
  readonly isLoading: boolean;
  // progressLabel shows the card position inside today's local queue.
  readonly progressLabel: string;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
  // word is the current local vocabulary card.
  readonly word: VocabularyItem;
  // onDecision persists the selected practice decision.
  readonly onDecision: (
    word: VocabularyItem,
    decision: WordPracticeDecision,
  ) => void;
}): ReactElement {
  return (
    <View style={styles.practiceCard}>
      <Text style={styles.sectionLabel}>{progressLabel}</Text>
      <Text style={styles.practiceWord}>{word.word}</Text>
      <Text style={styles.partOfSpeech}>{word.partOfSpeech}</Text>
      <Text style={styles.phonetics}>
        {word.phonetics.us ?? word.phonetics.uk ?? 'No phonetics'}
      </Text>
      <Text style={styles.exampleText}>{word.examples[0] ?? 'No example'}</Text>
      <View style={styles.practiceActions}>
        <SecondaryAction
          disabled={isLoading}
          label="Already know"
          styles={styles}
          onPress={() => onDecision(word, 'skip-new')}
        />
        <PrimaryAction
          disabled={isLoading}
          label="Learned"
          styles={styles}
          onPress={() => onDecision(word, 'mark-learned')}
        />
      </View>
      <PrimaryAction
        disabled={isLoading}
        label="Keep practicing"
        styles={styles}
        onPress={() => onDecision(word, 'start-learning')}
      />
    </View>
  );
}

// GenreSelection renders the approved MVP genre choices after cards.
function GenreSelection({
  isLoading,
  selectedGenre,
  styles,
  onSelectGenre,
}: {
  // isLoading disables duplicate genre writes.
  readonly isLoading: boolean;
  // selectedGenre is the locally saved story context when present.
  readonly selectedGenre: LearningGenre | undefined;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
  // onSelectGenre persists the selected local genre.
  readonly onSelectGenre: (genre: LearningGenre) => void;
}): ReactElement {
  return (
    <View style={styles.settingsCard}>
      <Text style={styles.actionTitle}>Choose a story genre</Text>
      <Text style={styles.secondaryText}>
        The choice is saved with today&apos;s session for future generation.
      </Text>
      {learningGenres.map((genre) => (
        <Pressable
          disabled={isLoading}
          key={genre}
          onPress={() => onSelectGenre(genre)}
          style={({ pressed }) => [
            styles.genreRow,
            genre === selectedGenre && styles.activeGenreRow,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.actionTitle}>{genreLabels[genre]}</Text>
          <Text style={styles.rowChevron}>›</Text>
        </Pressable>
      ))}
    </View>
  );
}

// GenerationState renders the explicit offline state for server-only story generation.
function GenerationState({
  isOnline,
  selectedGenre,
  styles,
}: {
  // isOnline tells whether server-backed generation could be attempted.
  readonly isOnline: boolean;
  // selectedGenre is the saved genre used by the future story request.
  readonly selectedGenre: LearningGenre | undefined;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
}): ReactElement {
  return (
    <View style={styles.goalCard}>
      <Text style={styles.actionTitle}>Text of the Day</Text>
      <Text style={styles.secondaryText}>
        Local practice is saved. Selected genre:{' '}
        {selectedGenre ? genreLabels[selectedGenre] : 'not selected'}.
      </Text>
      <View style={styles.offlineNotice}>
        <Text style={styles.stateMessageTitle}>
          {isOnline ? 'Generation backend is not connected yet.' : 'Offline mode'}
        </Text>
        <Text style={styles.secondaryText}>
          Story generation requires the Supabase Edge Function. This local MVP
          keeps the session ready and shows generation as unavailable for now.
        </Text>
      </View>
    </View>
  );
}

// PrimaryAction renders the main filled action button.
function PrimaryAction({
  disabled,
  label,
  styles,
  onPress,
}: {
  // disabled prevents duplicate local writes while an action is pending.
  readonly disabled: boolean;
  // label is the visible action text.
  readonly label: string;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
  // onPress forwards the user intent to the screen use case handler.
  readonly onPress: () => void;
}): ReactElement {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        disabled && styles.disabledControl,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

// SecondaryAction renders the neutral companion action button.
function SecondaryAction({
  disabled,
  label,
  styles,
  onPress,
}: {
  // disabled prevents duplicate local writes while an action is pending.
  readonly disabled: boolean;
  // label is the visible action text.
  readonly label: string;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
  // onPress forwards the user intent to the screen use case handler.
  readonly onPress: () => void;
}): ReactElement {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondaryButton,
        disabled && styles.disabledControl,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

// loadSessionWords resolves the session queue through the vocabulary use case.
async function loadSessionWords(
  session: DailyLearningSession,
): Promise<readonly VocabularyItem[]> {
  const words = await localAppServices.browseVocabulary.execute();
  const wordsById = new Map(words.map((word) => [word.id, word]));

  return session.wordIds.flatMap((wordId) => {
    const word = wordsById.get(wordId);

    return word ? [word] : [];
  });
}

// resolveSessionStage resumes completed sessions at the right local flow step.
function resolveSessionStage(
  session: DailyLearningSession,
  words: readonly VocabularyItem[],
): SessionStage {
  if (session.completedAt) {
    return 'generation';
  }

  if (
    words.length === 0 ||
    session.completedWordIds.length >= words.length
  ) {
    return 'genre';
  }

  return 'practice';
}
