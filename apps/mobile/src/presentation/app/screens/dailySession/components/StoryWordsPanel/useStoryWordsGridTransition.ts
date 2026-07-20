import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { Animated, Easing } from 'react-native';

import type { VocabularyItem } from '@domain/index';

import { countChangedWordSlots } from './storyWordsGridChange';

// gridExitDurationMs hides the stable old grid without stretching the layout.
const gridExitDurationMs: number = 120;
// gridEnterDurationMs reveals all new cards together in one calm visual beat.
const gridEnterDurationMs: number = 190;

// StoryWordsGridTransition exposes the stable words and shared opacity animation.
export type StoryWordsGridTransition = {
  // animateCardChanges keeps single-word replacement motion enabled outside mass updates.
  readonly animateCardChanges: boolean;
  // displayedWords remain unchanged until a full replacement grid is invisible.
  readonly displayedWords: readonly VocabularyItem[];
  // gridOpacity fades the complete grid without independent card layout phases.
  readonly gridOpacity: Animated.Value;
  // isGridTransitioning blocks overlapping actions through the coordinated swap.
  readonly isGridTransitioning: boolean;
};

// useStoryWordsGridTransition coordinates multi-card changes while preserving local motion.
export function useStoryWordsGridTransition(
  words: readonly VocabularyItem[],
  reduceMotion: boolean,
): StoryWordsGridTransition {
  // displayedWords own the currently visible stable slot content.
  const [displayedWords, setDisplayedWords] =
    useState<readonly VocabularyItem[]>(words);
  // displayedWordsRef provides the previous visible ids without retriggering effects.
  const displayedWordsRef: RefObject<readonly VocabularyItem[]> =
    useRef<readonly VocabularyItem[]>(words);
  // isGridTransitioning distinguishes a coordinated full swap from a local replacement.
  const [isGridTransitioning, setIsGridTransitioning] =
    useState<boolean>(false);
  // isGridReadyToEnter starts reveal only after React commits the hidden new words.
  const [isGridReadyToEnter, setIsGridReadyToEnter] =
    useState<boolean>(false);
  // gridOpacity keeps layout mounted while its full content changes invisibly.
  const [gridOpacity] = useState<Animated.Value>(
    (): Animated.Value => new Animated.Value(1),
  );
  // gridAnimationRef cancels a stale sequence if newer words arrive unexpectedly.
  const gridAnimationRef: RefObject<
    Animated.CompositeAnimation | undefined
  > = useRef<Animated.CompositeAnimation | undefined>(undefined);

  useEffect((): (() => void) | undefined => {
    const changedSlotCount: number = countChangedWordSlots(
      displayedWordsRef.current,
      words,
    );

    if (changedSlotCount === 0) {
      return undefined;
    }

    gridAnimationRef.current?.stop();

    if (reduceMotion || changedSlotCount === 1) {
      gridOpacity.setValue(1);
      displayedWordsRef.current = words;
      setDisplayedWords(words);
      setIsGridTransitioning(false);
      setIsGridReadyToEnter(false);

      return undefined;
    }

    setIsGridTransitioning(true);
    setIsGridReadyToEnter(false);
    // exitAnimation keeps the old set fully mounted until it is no longer visible.
    const exitAnimation: Animated.CompositeAnimation = Animated.timing(
      gridOpacity,
      {
        duration: gridExitDurationMs,
        easing: Easing.in(Easing.cubic),
        toValue: 0,
        useNativeDriver: true,
      },
    );
    gridAnimationRef.current = exitAnimation;
    exitAnimation.start(({ finished }: { finished: boolean }): void => {
      if (!finished) {
        return;
      }

      displayedWordsRef.current = words;
      setDisplayedWords(words);
      gridOpacity.setValue(0);
      setIsGridReadyToEnter(true);
    });

    return (): void => gridAnimationRef.current?.stop();
  }, [gridAnimationRef, gridOpacity, reduceMotion, words]);

  useEffect((): (() => void) | undefined => {
    if (!isGridReadyToEnter) {
      return undefined;
    }

    // enterAnimation starts after the hidden new grid has completed its React commit.
    const enterAnimation: Animated.CompositeAnimation = Animated.timing(
      gridOpacity,
      {
        duration: gridEnterDurationMs,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      },
    );
    gridAnimationRef.current = enterAnimation;
    enterAnimation.start(({ finished }: { finished: boolean }): void => {
      if (finished) {
        setIsGridReadyToEnter(false);
        setIsGridTransitioning(false);
      }
    });

    return (): void => enterAnimation.stop();
  }, [gridAnimationRef, gridOpacity, isGridReadyToEnter]);

  return {
    animateCardChanges: !isGridTransitioning,
    displayedWords,
    gridOpacity,
    isGridTransitioning,
  };
}
