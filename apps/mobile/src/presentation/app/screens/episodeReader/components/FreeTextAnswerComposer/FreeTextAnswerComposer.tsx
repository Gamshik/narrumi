import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { Text, TextInput, View } from 'react-native';

import type {
  EpisodeReplyGuidance,
  FreeReplyIntent,
  SeriesParticipationMode,
} from '@domain/index';
import { darkColors, lightColors } from '@presentation/theme';

import { JellyPressable } from '../../../../shared';
import { useAppTheme } from '../../../../theme';
import { createFreeTextAnswerComposerStyles } from './FreeTextAnswerComposer.styles';

// FREE_REPLY_CHARACTER_LIMIT bounds prompt context and keeps mobile replies focused.
export const FREE_REPLY_CHARACTER_LIMIT: number = 300;

// DRAFT_SAVE_DELAY_MS avoids an AsyncStorage write for every individual keystroke.
const DRAFT_SAVE_DELAY_MS: number = 450;

// FreeTextAnswerComposerProps owns one optional learner-authored response surface.
type FreeTextAnswerComposerProps = {
  // guidance explains why the current draft did not consume a story turn.
  readonly guidance?: EpisodeReplyGuidance | undefined;
  // initialDraft restores locally persisted typing after navigation or restart.
  readonly initialDraft?: string | undefined;
  // initialIntent restores the learner's last Say, Do, or Direction selection.
  readonly initialIntent?: FreeReplyIntent | undefined;
  // isSubmitting locks editing after local persistence and before server completion.
  readonly isSubmitting: boolean;
  // participationMode determines which reply intents are valid in the story.
  readonly participationMode: SeriesParticipationMode;
  // onDraftChange persists a debounced local draft without requiring connectivity.
  readonly onDraftChange: (text: string, intent: FreeReplyIntent) => void;
  // onSubmit sends one validated free reply into the continuation pipeline.
  readonly onSubmit: (text: string, intent: FreeReplyIntent) => void;
};

// FreeTextAnswerComposer adds a calm custom-answer path beneath generated choices.
export function FreeTextAnswerComposer({
  guidance,
  initialDraft = '',
  initialIntent,
  isSubmitting,
  onDraftChange,
  onSubmit,
  participationMode,
}: FreeTextAnswerComposerProps): ReactElement {
  const { isDark } = useAppTheme();
  const colors = isDark ? darkColors : lightColors;
  const styles = useMemo(
    (): ReturnType<typeof createFreeTextAnswerComposerStyles> =>
      createFreeTextAnswerComposerStyles(colors),
    [colors],
  );
  const defaultIntent: FreeReplyIntent =
    participationMode === 'character' ? 'speech' : 'direction';
  const [isExpanded, setIsExpanded] = useState<boolean>(
    initialDraft.trim().length > 0 || guidance !== undefined,
  );
  const [draft, setDraft] = useState<string>(initialDraft);
  const [intent, setIntent] = useState<FreeReplyIntent>(
    initialIntent ?? defaultIntent,
  );
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [validationMessage, setValidationMessage] = useState<string>();
  // didEditRef prevents the initial restored value from creating a redundant local write.
  const didEditRef = useRef<boolean>(false);
  // draftTimerRef lets submission cancel a pending draft write before answer persistence.
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  // latestDraftRef lets route exit flush the newest text without stale closures.
  const latestDraftRef = useRef<string>(initialDraft);
  // latestIntentRef preserves the newest explicit interpretation during unmount.
  const latestIntentRef = useRef<FreeReplyIntent>(initialIntent ?? defaultIntent);
  // saveDraftRef keeps the current persistence callback available to unmount cleanup.
  const saveDraftRef = useRef(onDraftChange);

  useEffect((): void => {
    saveDraftRef.current = onDraftChange;
  }, [onDraftChange]);

  useEffect((): (() => void) => {
    return (): void => {
      if (didEditRef.current) {
        saveDraftRef.current(latestDraftRef.current, latestIntentRef.current);
      }
    };
  }, []);

  useEffect((): void => {
    if (guidance) {
      setIsExpanded(true);
    }
  }, [guidance]);

  useEffect((): (() => void) | undefined => {
    if (!didEditRef.current) {
      return undefined;
    }

    draftTimerRef.current = setTimeout((): void => {
      draftTimerRef.current = undefined;
      onDraftChange(draft, intent);
    }, DRAFT_SAVE_DELAY_MS);

    return (): void => {
      if (draftTimerRef.current) {
        clearTimeout(draftTimerRef.current);
        draftTimerRef.current = undefined;
      }
    };
  }, [draft, intent, onDraftChange]);

  // updateDraft keeps validation responsive while persistence remains debounced.
  const updateDraft = (value: string): void => {
    didEditRef.current = true;
    latestDraftRef.current = value;
    setDraft(value);
    setValidationMessage(undefined);
  };

  // updateIntent persists the learner's explicit interpretation with the same draft.
  const updateIntent = (value: FreeReplyIntent): void => {
    didEditRef.current = true;
    latestIntentRef.current = value;
    setIntent(value);
    setValidationMessage(undefined);
  };

  // submit validates only basic local shape; semantic English checks remain server-owned.
  const submit = (): void => {
    const normalizedDraft: string = draft.replace(/\s+/g, ' ').trim();

    if (!/\p{L}/u.test(normalizedDraft)) {
      setValidationMessage('Write a short answer using words.');
      return;
    }

    if (draftTimerRef.current) {
      clearTimeout(draftTimerRef.current);
      draftTimerRef.current = undefined;
    }

    didEditRef.current = false;
    onSubmit(normalizedDraft, intent);
  };

  if (!isExpanded) {
    return (
      <JellyPressable
        accessibilityHint="Opens a field for your own story response"
        accessibilityLabel="Write my own answer"
        disabled={isSubmitting}
        onPress={(): void => setIsExpanded(true)}
        style={[styles.trigger, isSubmitting && styles.disabled]}
      >
        <Text style={styles.triggerText}>Write my own answer</Text>
      </JellyPressable>
    );
  }

  const placeholder: string =
    intent === 'speech'
      ? 'What do you say?'
      : intent === 'action'
        ? 'What do you do?'
        : 'What happens next?';

  return (
    <View style={styles.composer}>
      {participationMode === 'character' ? (
        <View accessibilityRole="tablist" style={styles.modeRow}>
          {(['speech', 'action'] as const).map(
            (candidate: FreeReplyIntent): ReactElement => {
              const isSelected: boolean = intent === candidate;

              return (
                <JellyPressable
                  accessibilityLabel={
                    candidate === 'speech'
                      ? 'Write spoken reply'
                      : 'Write character action'
                  }
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isSelected }}
                  disabled={isSubmitting}
                  key={candidate}
                  onPress={(): void => updateIntent(candidate)}
                  style={[
                    styles.modePill,
                    isSelected && styles.modePillSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.modeText,
                      isSelected && styles.modeTextSelected,
                    ]}
                  >
                    {candidate === 'speech' ? 'Say' : 'Do'}
                  </Text>
                </JellyPressable>
              );
            },
          )}
        </View>
      ) : (
        <Text style={styles.directionLabel}>Direct the scene</Text>
      )}

      <TextInput
        accessibilityHint="Your answer will shape the next scene and receive concise English feedback"
        accessibilityLabel="Your own story answer"
        autoCapitalize="sentences"
        autoCorrect
        editable={!isSubmitting}
        maxLength={FREE_REPLY_CHARACTER_LIMIT}
        multiline
        onBlur={(): void => setIsFocused(false)}
        onChangeText={updateDraft}
        onFocus={(): void => setIsFocused(true)}
        placeholder={placeholder}
        placeholderTextColor={colors.labelTertiary}
        returnKeyType="default"
        selectionColor={colors.systemBlue}
        style={[styles.input, isFocused && styles.inputFocused]}
        value={draft}
      />

      <View style={styles.metaRow}>
        <Text style={styles.quietText}>Saved on this device while you write</Text>
        <Text style={styles.counter}>
          {draft.length}/{FREE_REPLY_CHARACTER_LIMIT}
        </Text>
      </View>

      {guidance ? (
        <View accessibilityLiveRegion="polite" style={styles.guidance}>
          <Text style={styles.guidanceTitle}>Try a small edit</Text>
          <Text style={styles.guidanceText}>{guidance.message}</Text>
          {guidance.suggestedText ? (
            <JellyPressable
              accessibilityLabel="Use suggested wording"
              disabled={isSubmitting}
              onPress={(): void => updateDraft(guidance.suggestedText ?? draft)}
            >
              <Text style={styles.triggerText}>Use suggestion</Text>
            </JellyPressable>
          ) : null}
        </View>
      ) : null}

      {validationMessage ? (
        <Text accessibilityLiveRegion="polite" style={styles.errorText}>
          {validationMessage}
        </Text>
      ) : null}

      <View style={styles.actionRow}>
        <JellyPressable
          accessibilityLabel="Use a suggested answer"
          disabled={isSubmitting}
          onPress={(): void => setIsExpanded(false)}
          style={styles.secondaryAction}
        >
          <Text style={styles.secondaryActionText}>Suggestions</Text>
        </JellyPressable>
        <JellyPressable
          accessibilityHint="Checks the answer and continues the story"
          accessibilityLabel="Continue story with my answer"
          disabled={isSubmitting || draft.trim().length === 0}
          onPress={submit}
          style={[
            styles.primaryAction,
            (isSubmitting || draft.trim().length === 0) && styles.disabled,
          ]}
        >
          <Text style={styles.primaryActionText}>
            {isSubmitting ? 'Checking...' : 'Continue story'}
          </Text>
        </JellyPressable>
      </View>
    </View>
  );
}
