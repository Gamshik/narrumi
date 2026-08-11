import type { ReactElement, RefObject } from 'react';
import { ScrollView, Text, View } from 'react-native';

import type { SeriesSetupGenerationTarget } from '@application/ports';
import type { AppColors } from '@presentation/theme';

import { BubbleButton, BubbleStatus } from '../../../../../../shared';
import type { AppStyles } from '../../../../../../types';
import type {
  SeriesSetupFormErrors,
  SeriesSetupFormState,
} from '../../../../../seriesSetupForm';
import type { CreateSeriesFlowStyles } from '../../CreateSeriesFlow.styles';
import {
  getSeriesSetupStepIndex,
  getSeriesSetupStepTitle,
  type SeriesSetupStep,
} from '../../seriesSetupFlow';
import { SeriesSetupStepCard } from '../../SeriesSetupStepCard';
import { SeriesSetupStepContent } from '../../SeriesSetupStepContent';
import { SeriesSetupCardImage } from '../SeriesSetupCardImage';

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
  // isGeneratingSetup selects the current loading message.
  readonly isGeneratingSetup: boolean;
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
  // onFocus asks the focused card to reveal a native input.
  readonly onFocus: (target: number) => void;
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
  isGeneratingSetup,
  isOnline,
  isPrimaryDisabled,
  isSaving,
  primaryLabel,
  scrollRef,
  sharedStyles,
  styles,
  onBack,
  onChangeForm,
  onFocus,
  onGenerate,
  onPrimary,
}: SeriesSetupQuestProps): ReactElement {
  // activeIndex provides one-based card progress and Back visibility.
  const activeIndex: number = getSeriesSetupStepIndex(activeStep);

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
              isOnline={isOnline}
              sharedStyles={sharedStyles}
              step={activeStep}
              onChangeForm={onChangeForm}
              onFocus={onFocus}
              onGenerate={onGenerate}
            />
            {isBusy ? (
              <BubbleStatus
                colors={colors}
                style={styles.status}
                title={
                  isSaving
                    ? 'Saving your series…'
                    : isGeneratingSetup
                      ? 'Creating an AI suggestion…'
                      : 'Working…'
                }
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
          </>
        }
        image={<SeriesSetupCardImage step={activeStep} />}
        scrollRef={scrollRef}
        styles={styles}
        title={getSeriesSetupStepTitle(activeStep)}
      />
    </View>
  );
}
