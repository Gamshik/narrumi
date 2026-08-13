import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

// readSource loads one presentation file without requiring a React Native test renderer.
function readSource(relativePath: string): string {
  return readFileSync(resolve(__dirname, relativePath), 'utf8');
}

describe('setup keyboard-aware scrolling', (): void => {
  it('preserves native focused-input scrolling for ordinary setup fields', (): void => {
    // hookSource protects the established behavior shared by non-Cast forms.
    const hookSource: string = readSource('./useKeyboardAwareScroll.ts');
    // focusSourcePaths cover shared setup components that emit native focus handles.
    const focusSourcePaths: readonly string[] = [
      '../SeriesSetupTextField/SeriesSetupTextField.tsx',
      '../SeriesCreativeBriefEditor/SeriesCreativeBriefEditor.tsx',
      '../CharacterProfilesEditor/CharacterProfilesEditor.tsx',
    ];

    assert.match(
      hookSource,
      /scrollResponderScrollNativeHandleToKeyboard\([\s\S]*?target,[\s\S]*?KEYBOARD_CLEARANCE,[\s\S]*?true,/,
    );
    assert.match(
      hookSource,
      /KeyboardFocusTargetHandler = \(target: number\) => void/,
    );
    assert.doesNotMatch(hookSource, /Keyboard\.addListener|currentlyFocusedInput/);
    focusSourcePaths.forEach((sourcePath: string): void => {
      assert.match(readSource(sourcePath), /event\.nativeEvent\.target/);
    });
  });

  it('scrolls every series setup field immediately by its measured position', (): void => {
    // editorSource protects the distinct stored offset for every character row.
    const editorSource: string = readSource(
      '../CharacterProfilesEditor/CharacterProfilesEditor.tsx',
    );
    // charactersStepSource protects the distinct repeated-row coordinate wiring.
    const charactersStepSource: string = readSource(
      '../../screens/home/components/CreateSeriesFlow/steps/CharactersStep/CharactersStep.tsx',
    );
    // ideaStepSource protects measured focus for the multiline idea input.
    const ideaStepSource: string = readSource(
      '../../screens/home/components/CreateSeriesFlow/steps/IdeaStep/IdeaStep.tsx',
    );
    // titleStepSource protects measured focus for the final title input.
    const titleStepSource: string = readSource(
      '../../screens/home/components/CreateSeriesFlow/steps/TitleStep/TitleStep.tsx',
    );
    // questSource owns immediate scrolling and keyboard-animation fallbacks.
    const questSource: string = readSource(
      '../../screens/home/components/CreateSeriesFlow/components/SeriesSetupQuest/SeriesSetupQuest.tsx',
    );
    // cardSource ensures every setup card receives native keyboard insets.
    const cardSource: string = readSource(
      '../../screens/home/components/CreateSeriesFlow/SeriesSetupStepCard.tsx',
    );
    // editorUsage isolates the Cast instance from the ordinary learner-role input below it.
    const editorUsage: string =
      charactersStepSource.match(/<CharacterProfilesEditor[\s\S]*?\/>/)?.[0] ??
      '';

    assert.match(editorSource, /rowOffsetsRef\.current\[profileId\] = rowOffsetY/);
    assert.match(
      editorSource,
      /onFieldFocus\?\.\([\s\S]*?listOffsetRef\.current \+ \(rowOffsetsRef\.current\[profileId\] \?\? 0\)/,
    );
    assert.notEqual(editorUsage, '');
    assert.match(charactersStepSource, /onFieldFocus=\{/);
    assert.doesNotMatch(editorUsage, /onFocus=/);
    assert.match(charactersStepSource, /editorOffsetRef\.current \+ rowOffsetY/);
    assert.match(charactersStepSource, /learnerRoleOffsetRef\.current/);
    assert.match(ideaStepSource, /fieldOffsetRef\.current = event\.nativeEvent\.layout\.y/);
    assert.match(ideaStepSource, /onFieldFocus\(fieldOffsetRef\.current\)/);
    assert.match(titleStepSource, /fieldOffsetRef\.current = event\.nativeEvent\.layout\.y/);
    assert.match(titleStepSource, /onFieldFocus\(fieldOffsetRef\.current\)/);
    assert.match(questSource, /pendingFieldOffsetRef\.current = contentOffsetY/);
    assert.match(
      questSource,
      /pendingFieldOffsetRef\.current = contentOffsetY;[\s\S]*?scrollToSetupField\(contentOffsetY\)/,
    );
    assert.match(questSource, /Keyboard\.addListener\([\s\S]*?'keyboardWillShow'/);
    assert.match(questSource, /Keyboard\.addListener\([\s\S]*?'keyboardDidShow'/);
    assert.match(questSource, /cardBodyOffsetRef\.current \+ fieldOffsetY/);
    assert.match(questSource, /scrollRef\.current\?\.scrollTo\(/);
    assert.doesNotMatch(questSource, /scrollResponderScrollNativeHandleToKeyboard/);
    assert.match(cardSource, /automaticallyAdjustKeyboardInsets/);
  });
});
