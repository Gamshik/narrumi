import { useCallback, useEffect, useRef } from 'react';
import type { ReactElement, RefObject } from 'react';
import {
  Keyboard,
  ScrollView,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import type { SeriesSetupGenerationTarget } from '@application/ports';
import type { AppColors } from '@presentation/theme';

import { BubbleButton, BubbleStatus } from '../../../../../../shared';
import type { AppStyles } from '../../../../../../types';
import type {
  SeriesSetupFormErrors,
  SeriesSetupFormState,
} from '../../../../../seriesSetupForm';
import type { CreateSeriesFlowStyles } from '../../CreateSeriesFlow.styles';
import type { SeriesSetupFieldFocusHandler } from '../../seriesSetupFocus';
import {
  getSeriesSetupStepIndex,
  getSeriesSetupStepTitle,
  type SeriesSetupStep,
} from '../../seriesSetupFlow';
import { SeriesSetupStepCard } from '../../SeriesSetupStepCard';
import { SeriesSetupStepContent } from '../../SeriesSetupStepContent';
import { SeriesSetupCardImage } from '../SeriesSetupCardImage';

// This inset leaves a small visual gap above every focused setup field.
const SETUP_FIELD_TOP_INSET: number = 12;

// SeriesSetupQuestProps defines the single focused card in series creation.
type SeriesSetupQuestProps = {
  // actionError reports a failure on the currently focused card.
  readonly actionError: string | undefined;
  // activeStep identifies the only setup card rendered in the stage.
  readonly activeStep: SeriesSetupStep;
  // colors provides the active semantic light or dark palette.
  readonly colors: AppColors;
  // errors contains validation messages for required setup fields.
  readonly errors: SeriesSetupFormErrors;
  // form is the complete controlled setup state.
  readonly form: SeriesSetupFormState;
  // isBusy blocks conflicting actions during persistence or generation.
  readonly isBusy: boolean;
  // isGeneratingCurrentStep selects loading only for the request-owning card.
  readonly isGeneratingCurrentStep: boolean;
  // isEditable preserves navigation while locking every value after episode one.
  readonly isEditable: boolean;
  // isOnline tells creative cards whether AI generation is available.
  readonly isOnline: boolean;
  // isPrimaryDisabled blocks Continue until the current required card is complete.
  readonly isPrimaryDisabled: boolean;
  // isSaving selects the current local-persistence message.
  readonly isSaving: boolean;
  // primaryLabel is the contextual action for the focused card.
  readonly primaryLabel: string;
  // scrollRef lets keyboard focus reveal the exact input in the focused card.
  readonly scrollRef: RefObject<ScrollView | null>;
  // sharedStyles provides the app-wide setup input style contract.
  readonly sharedStyles: AppStyles;
  // styles provides the active theme's card style contract.
  readonly styles: CreateSeriesFlowStyles;
  // onBack opens the previous visited card.
  readonly onBack: () => void;
  // onChangeForm publishes the complete controlled form after edits.
  readonly onChangeForm: (form: SeriesSetupFormState) => void;
  // onGenerate requests an AI replacement for only the current card.
  readonly onGenerate: (target: SeriesSetupGenerationTarget) => void;
  // onPrimary runs Continue or Save series.
  readonly onPrimary: () => void;
};

// SeriesSetupQuest renders one small required card at a time.
export function SeriesSetupQuest({
  actionError,
  activeStep,
  colors,
  errors,
  form,
  isBusy,
  isGeneratingCurrentStep,
  isEditable,
  isOnline,
  isPrimaryDisabled,
  isSaving,
  primaryLabel,
  scrollRef,
  sharedStyles,
  styles,
  onBack,
  onChangeForm,
  onGenerate,
  onPrimary,
}: SeriesSetupQuestProps): ReactElement {
  // activeIndex provides one-based card progress and Back visibility.
  const activeIndex: number = getSeriesSetupStepIndex(activeStep);
  // cardBodyOffsetRef locates the active setup controls inside the scroll content.
  const cardBodyOffsetRef = useRef<number>(0);
  // pendingFieldOffsetRef preserves the selected field while the keyboard changes the viewport.
  const pendingFieldOffsetRef = useRef<number | null>(null);

  // scrollToSetupField starts immediately using stable content coordinates.
  const scrollToSetupField = useCallback(
    (contentOffsetY: number): void => {
      scrollRef.current?.scrollTo({
        animated: true,
        y: Math.max(0, contentOffsetY - SETUP_FIELD_TOP_INSET),
      });
    },
    [scrollRef],
  );

  // revealSetupField responds to focus immediately and retains the position for keyboard fallback.
  const revealSetupField: SeriesSetupFieldFocusHandler = useCallback(
    (fieldOffsetY: number): void => {
      const contentOffsetY: number =
        cardBodyOffsetRef.current + fieldOffsetY;

      pendingFieldOffsetRef.current = contentOffsetY;
      scrollToSetupField(contentOffsetY);
    },
    [scrollToSetupField],
  );

  // handleCardBodyLayout keeps field coordinates aligned with the current card image and title.
  const handleCardBodyLayout = useCallback(
    (event: LayoutChangeEvent): void => {
      cardBodyOffsetRef.current = event.nativeEvent.layout.y;
    },
    [],
  );

  useEffect((): void => {
    // A newly rendered card must not reuse the previous card's focused position.
    pendingFieldOffsetRef.current = null;
  }, [activeStep]);

  useEffect((): (() => void) => {
    // willShow keeps iOS scrolling synchronized with the keyboard animation.
    const willShowSubscription = Keyboard.addListener(
      'keyboardWillShow',
      (): void => {
        if (pendingFieldOffsetRef.current !== null) {
          // The next frame lets KeyboardAvoidingView expose the new scroll range without a visible wait.
          requestAnimationFrame((): void => {
            if (pendingFieldOffsetRef.current !== null) {
              scrollToSetupField(pendingFieldOffsetRef.current);
            }
          });
        }
      },
    );
    // didShow is a fallback for platforms that do not emit a pre-animation event.
    const showSubscription = Keyboard.addListener(
      'keyboardDidShow',
      (): void => {
        if (pendingFieldOffsetRef.current !== null) {
          scrollToSetupField(pendingFieldOffsetRef.current);
        }
      },
    );
    // didHide clears the last coordinate before a later focus session.
    const hideSubscription = Keyboard.addListener(
      'keyboardDidHide',
      (): void => {
        pendingFieldOffsetRef.current = null;
      },
    );

    return (): void => {
      willShowSubscription.remove();
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [scrollToSetupField]);

  return (
    <View style={styles.questStage}>
      <SeriesSetupStepCard
        body={
          <>
            <SeriesSetupStepContent
              colors={colors}
              errors={errors}
              flowStyles={styles}
              form={form}
              isBusy={isBusy}
              isEditable={isEditable}
              isGenerating={isGeneratingCurrentStep}
              isOnline={isOnline}
              sharedStyles={sharedStyles}
              step={activeStep}
              onChangeForm={onChangeForm}
              onFieldFocus={revealSetupField}
              onGenerate={onGenerate}
            />
            {isSaving ? (
              <BubbleStatus
                colors={colors}
                style={styles.status}
                title="Saving your series…"
                tone="loading"
                variant="row"
              />
            ) : null}
            {!isBusy && actionError ? (
              <BubbleStatus
                accessibilityRole="alert"
                colors={colors}
                style={styles.status}
                title={actionError}
                tone="error"
                variant="row"
              />
            ) : null}
          </>
        }
        colors={colors}
        footer={
          <>
            {activeIndex > 0 ? (
              <BubbleButton
                colors={colors}
                contentStyle={styles.footerButton}
                disabled={isBusy}
                onPress={onBack}
                style={styles.footerBack}
                variant="secondary"
              >
                <Text style={styles.footerBackText}>Back</Text>
              </BubbleButton>
            ) : null}
            {isEditable ? (
              <BubbleButton
                colors={colors}
                contentStyle={styles.footerButton}
                disabled={isPrimaryDisabled}
                onPress={onPrimary}
                style={activeIndex > 0 ? styles.footerNext : styles.footerOnly}
                variant="primary"
              >
                <Text style={styles.footerNextText}>{primaryLabel}</Text>
              </BubbleButton>
            ) : null}
          </>
        }
        image={<SeriesSetupCardImage step={activeStep} />}
        onBodyLayout={handleCardBodyLayout}
        scrollRef={scrollRef}
        styles={styles}
        title={getSeriesSetupStepTitle(activeStep)}
      />
    </View>
  );
}
