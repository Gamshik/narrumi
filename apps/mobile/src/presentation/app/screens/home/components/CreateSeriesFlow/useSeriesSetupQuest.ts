import { useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { Animated, Easing, ScrollView } from 'react-native';

import { useReducedMotionPreference } from '../../../../shared';
import type { SeriesSetupFormState } from '../../../seriesSetupForm';

import {
  getInitialSeriesSetupStep,
  getSeriesSetupMemoryItems,
  getSeriesSetupStepIndex,
  seriesSetupSteps,
  type SeriesSetupMemoryItem,
  type SeriesSetupStep,
} from './seriesSetupFlow';

// UseSeriesSetupQuestOptions defines the controlled values used by card navigation.
type UseSeriesSetupQuestOptions = {
  // form contains the answers used to resume and summarize the four cards.
  readonly form: SeriesSetupFormState;
  // isVisible resets card state only when the native modal is newly opened.
  readonly isVisible: boolean;
};

// SeriesSetupQuestController exposes focused card state and bounded navigation actions.
export type SeriesSetupQuestController = {
  // activeIndex is the zero-based position of the focused card.
  readonly activeIndex: number;
  // activeStep identifies the focused setup card.
  readonly activeStep: SeriesSetupStep;
  // furthestIndex bounds direct navigation to deliberately visited cards.
  readonly furthestIndex: number;
  // memoryItems contains earlier answers and the live Role choice on the first card.
  readonly memoryItems: readonly SeriesSetupMemoryItem[];
  // questOpacity fades in a newly focused card.
  readonly questOpacity: Animated.AnimatedInterpolation<number>;
  // questScale gives a newly focused card a restrained settling effect.
  readonly questScale: Animated.AnimatedInterpolation<number>;
  // questTranslateY moves a newly focused card a short vertical distance.
  readonly questTranslateY: Animated.AnimatedInterpolation<number>;
  // stepScrollRef owns the focused card's keyboard-aware scroll surface.
  readonly stepScrollRef: RefObject<ScrollView | null>;
  // moveBack opens the immediately preceding card.
  readonly moveBack: () => void;
  // moveNext deliberately extends the path by one card.
  readonly moveNext: () => void;
  // navigateTo reopens a visited card or explicitly extends the path.
  readonly navigateTo: (step: SeriesSetupStep, canExtendFlow?: boolean) => void;
  // revealFocusedInput keeps the exact native input above the keyboard.
  readonly revealFocusedInput: (target: number) => void;
};

// useSeriesSetupQuest owns reversible navigation, resume state, and card motion.
export function useSeriesSetupQuest({
  form,
  isVisible,
}: UseSeriesSetupQuestOptions): SeriesSetupQuestController {
  // reduceMotion removes decorative card entrance motion for accessibility.
  const reduceMotion: boolean = useReducedMotionPreference();
  // activeStep identifies the focused card.
  const [activeStep, setActiveStep] =
    useState<SeriesSetupStep>('participation');
  // furthestIndex prevents jumping into unvisited cards.
  const [furthestIndex, setFurthestIndex] = useState<number>(0);
  // wasVisibleRef distinguishes a newly opened draft from controlled form edits.
  const wasVisibleRef = useRef<boolean>(false);
  // stepScrollRef owns the focused card's vertical keyboard-aware surface.
  const stepScrollRef: RefObject<ScrollView | null> = useRef<ScrollView>(null);
  // questEntryProgress drives one stable restrained card-entry transition.
  const [questEntryProgress] = useState<Animated.Value>(
    (): Animated.Value => new Animated.Value(1),
  );
  // activeIndex is the numeric card position used by progress and Back navigation.
  const activeIndex: number = getSeriesSetupStepIndex(activeStep);
  // memoryItems carries earlier answers or the live first-card choice into the overview.
  const memoryItems: readonly SeriesSetupMemoryItem[] = useMemo(
    (): readonly SeriesSetupMemoryItem[] =>
      getSeriesSetupMemoryItems(form, activeStep),
    [activeStep, form],
  );
  // questOpacity fades the next card in without hiding controls for Reduce Motion users.
  const questOpacity: Animated.AnimatedInterpolation<number> =
    questEntryProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.65, 1],
    });
  // questTranslateY gives each card a small game-like settling motion.
  const questTranslateY: Animated.AnimatedInterpolation<number> =
    questEntryProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [12, 0],
    });
  // questScale makes a revealed card feel selected without a distracting bounce.
  const questScale: Animated.AnimatedInterpolation<number> =
    questEntryProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.985, 1],
    });

  useEffect((): void => {
    if (isVisible && !wasVisibleRef.current) {
      const initialStep: SeriesSetupStep = getInitialSeriesSetupStep(form);
      const initialIndex: number = getSeriesSetupStepIndex(initialStep);

      setActiveStep(initialStep);
      setFurthestIndex(initialIndex);
      requestAnimationFrame((): void => {
        stepScrollRef.current?.scrollTo({ animated: false, y: 0 });
      });
    }

    wasVisibleRef.current = isVisible;
  }, [form, isVisible]);

  useEffect((): (() => void) | void => {
    questEntryProgress.stopAnimation();

    if (reduceMotion || !isVisible) {
      questEntryProgress.setValue(1);
      return;
    }

    questEntryProgress.setValue(0);
    const entryAnimation: Animated.CompositeAnimation = Animated.timing(
      questEntryProgress,
      {
        duration: 180,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      },
    );

    entryAnimation.start();
    return (): void => entryAnimation.stop();
  }, [activeStep, isVisible, questEntryProgress, reduceMotion]);

  // navigateTo opens a visited card or deliberately extends the path by one stage.
  const navigateTo = (
    step: SeriesSetupStep,
    canExtendFlow = false,
  ): void => {
    const targetIndex: number = getSeriesSetupStepIndex(step);

    if (targetIndex > furthestIndex && !canExtendFlow) {
      return;
    }

    setFurthestIndex((currentIndex: number): number =>
      Math.max(currentIndex, targetIndex),
    );
    setActiveStep(step);
    requestAnimationFrame((): void => {
      stepScrollRef.current?.scrollTo({ animated: false, y: 0 });
    });
  };

  // moveNext opens the next card while preserving every controlled answer.
  const moveNext = (): void => {
    const nextStep: SeriesSetupStep | undefined =
      seriesSetupSteps[activeIndex + 1];

    if (nextStep) {
      navigateTo(nextStep, true);
    }
  };

  // moveBack returns to the immediately preceding card without discarding answers.
  const moveBack = (): void => {
    const previousStep: SeriesSetupStep | undefined =
      seriesSetupSteps[activeIndex - 1];

    if (previousStep) {
      navigateTo(previousStep);
    }
  };

  // revealFocusedInput keeps focused text visible inside the current card.
  const revealFocusedInput = (target: number): void => {
    stepScrollRef.current?.scrollResponderScrollNativeHandleToKeyboard(
      target,
      116,
      true,
    );
  };

  return {
    activeIndex,
    activeStep,
    furthestIndex,
    memoryItems,
    questOpacity,
    questScale,
    questTranslateY,
    stepScrollRef,
    moveBack,
    moveNext,
    navigateTo,
    revealFocusedInput,
  };
}
