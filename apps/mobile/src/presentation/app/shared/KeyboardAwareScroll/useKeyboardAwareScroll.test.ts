import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

// readSource loads one presentation file without requiring a React Native test renderer.
function readSource(relativePath: string): string {
  return readFileSync(resolve(__dirname, relativePath), 'utf8');
}

describe('setup keyboard-aware scrolling', (): void => {
  it('measures the exact focused input instead of combining nested offsets', (): void => {
    // hookSource protects the native keyboard-aware responder integration.
    const hookSource: string = readSource('./useKeyboardAwareScroll.ts');
    // focusSourcePaths cover every shared setup component that owns a TextInput.
    const focusSourcePaths: readonly string[] = [
      '../SeriesSetupTextField/SeriesSetupTextField.tsx',
      '../SeriesCreativeBriefEditor/SeriesCreativeBriefEditor.tsx',
      '../CharacterProfilesEditor/CharacterProfilesEditor.tsx',
    ];
    // screenSourcePaths cover setup surfaces that use the reusable vertical-scroll hook.
    const screenSourcePaths: readonly string[] = [
      '../../screens/SeriesDetailsScreen.tsx',
    ];
    // createFlowSource protects the quest-card equivalent for its focused scrolling surface.
    const createFlowSource: string = readSource(
      '../../screens/home/components/CreateSeriesFlow/CreateSeriesFlow.tsx',
    );
    // createQuestHookSource owns the single active card's exact keyboard responder call.
    const createQuestHookSource: string = readSource(
      '../../screens/home/components/CreateSeriesFlow/useSeriesSetupQuest.ts',
    );

    assert.match(
      hookSource,
      /scrollResponderScrollNativeHandleToKeyboard\([\s\S]*?target,[\s\S]*?KEYBOARD_CLEARANCE,[\s\S]*?true,/,
    );

    focusSourcePaths.forEach((sourcePath: string): void => {
      assert.match(readSource(sourcePath), /event\.nativeEvent\.target/);
    });

    screenSourcePaths.forEach((sourcePath: string): void => {
      const screenSource: string = readSource(sourcePath);

      assert.match(screenSource, /useKeyboardAwareScroll\(\)/);
      assert.match(screenSource, /onFocus=\{revealFocusedInput\}/);
      assert.doesNotMatch(screenSource, /scrollToField|fieldOffsetsRef/);
    });

    assert.match(
      createQuestHookSource,
      /scrollResponderScrollNativeHandleToKeyboard\([\s\S]*?target,[\s\S]*?116,[\s\S]*?true,/,
    );
    assert.match(createFlowSource, /onFocus=\{quest\.revealFocusedInput\}/);
    assert.doesNotMatch(
      `${createFlowSource}\n${createQuestHookSource}`,
      /scrollToField|fieldOffsetsRef/,
    );
  });
});
