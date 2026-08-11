import { useEffect, useMemo, useRef } from 'react';
import type { ReactElement, RefObject } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BackIconButton,
  BubbleButton,
  PlatformBlurTargetView,
  ScreenEdgeEffects,
} from '../../../../shared';
import type { SeriesSetupGenerationTarget } from '@application/ports';

import {
  createCreateSeriesFlowStyles,
  type CreateSeriesFlowStyles,
} from './CreateSeriesFlow.styles';
import { preloadCreateSeriesCardImages } from './CreateSeriesFlow.assets';
import type { CreateSeriesFlowProps } from './CreateSeriesFlow.types';
import {
  isSeriesSetupStepComplete,
  type SeriesSetupStep,
} from './seriesSetupFlow';
import { SeriesSetupOverview } from './components/SeriesSetupOverview';
import { SeriesSetupQuest } from './components/SeriesSetupQuest';
import {
  useSeriesSetupQuest,
  type SeriesSetupQuestController,
} from './useSeriesSetupQuest';

// CreateSeriesFlow renders the complete reversible four-card series setup.
export function CreateSeriesFlow({
  actionError,
  colors,
  errors,
  form,
  isDark,
  isGeneratingSetup,
  isOnline,
  isSaving,
  isVisible,
  styles: sharedStyles,
  onChangeForm,
  onClose,
  onGenerate,
  onSaveDraft,
  onSubmit,
}: CreateSeriesFlowProps): ReactElement {
  const insets = useSafeAreaInsets();
  // flowStyles memoizes the palette-specific quest StyleSheet.
  const flowStyles: CreateSeriesFlowStyles = useMemo(
    (): CreateSeriesFlowStyles => createCreateSeriesFlowStyles(colors),
    [colors],
  );
  // blurTargetRef preserves the shared modal edge-effect source contract.
  const blurTargetRef: RefObject<View | null> = useRef<View>(null);
  // quest owns reversible navigation, concise memory, and card transitions.
  const quest: SeriesSetupQuestController = useSeriesSetupQuest({
    form,
    isVisible,
  });

  useEffect((): void => {
    // A failed cache warmup is non-blocking because every image remains a bundled module.
    void preloadCreateSeriesCardImages().catch((): void => undefined);
  }, []);
  // isBusy blocks conflicting navigation while local or online work is active.
  const isBusy: boolean = isSaving || isGeneratingSetup;
  // getPrimaryLabel keeps the bottom action contextual to the current required task.
  const getPrimaryLabel = (): string => {
    return quest.activeStep === 'title' ? 'Save series' : 'Continue';
  };

  // runPrimaryAction routes the current card to its single dominant outcome.
  const runPrimaryAction = (): void => {
    if (quest.activeStep === 'title') {
      void onSubmit();
      return;
    }

    quest.moveNext();
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      visible={isVisible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
        style={flowStyles.modal}
      >
        <PlatformBlurTargetView
          blurTargetRef={blurTargetRef}
          style={flowStyles.content}
        >
          <View
            style={[
              flowStyles.content,
              {
                paddingTop: insets.top,
                paddingBottom: insets.bottom,
              },
            ]}
          >
            <View style={flowStyles.header}>
              <BackIconButton
                accessibilityHint="Closes series creation"
                accessibilityLabel="Back from series creation"
                colors={colors}
                onPress={onClose}
              />
              <View style={flowStyles.headerCopy}>
                <Text style={flowStyles.headerTitle}>Create a series</Text>
              </View>
              <BubbleButton
                accessibilityHint="Saves the current setup locally and closes"
                colors={colors}
                contentStyle={flowStyles.saveButton}
                disabled={isBusy}
                onPress={(): void => {
                  void onSaveDraft();
                }}
                variant="secondary"
              >
                <Text style={flowStyles.saveButtonText}>Save</Text>
              </BubbleButton>
            </View>

            <SeriesSetupOverview
              activeIndex={quest.activeIndex}
              furthestIndex={quest.furthestIndex}
              items={quest.memoryItems}
              styles={flowStyles}
              onSelect={(step: SeriesSetupStep): void =>
                quest.navigateTo(step)
              }
            />

            <Animated.View
              style={[
                flowStyles.questMotion,
                {
                  opacity: quest.questOpacity,
                  transform: [
                    { translateY: quest.questTranslateY },
                    { scale: quest.questScale },
                  ],
                },
              ]}
            >
              <SeriesSetupQuest
                actionError={actionError}
                activeStep={quest.activeStep}
                colors={colors}
                errors={errors}
                form={form}
                isBusy={isBusy}
                isGeneratingSetup={isGeneratingSetup}
                isOnline={isOnline}
                isPrimaryDisabled={
                  isBusy ||
                  !isSeriesSetupStepComplete(form, quest.activeStep)
                }
                isSaving={isSaving}
                primaryLabel={getPrimaryLabel()}
                scrollRef={quest.stepScrollRef}
                sharedStyles={sharedStyles}
                styles={flowStyles}
                onBack={quest.moveBack}
                onChangeForm={onChangeForm}
                onFocus={quest.revealFocusedInput}
                onGenerate={(target: SeriesSetupGenerationTarget): void => {
                  void onGenerate(target);
                }}
                onPrimary={runPrimaryAction}
              />
            </Animated.View>
          </View>
        </PlatformBlurTargetView>
        <ScreenEdgeEffects
          blurTarget={blurTargetRef}
          bottomInset={insets.bottom}
          bottomVariant="modal"
          colors={colors}
          isDark={isDark}
          materialOpacity={1}
          topInset={insets.top}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}
