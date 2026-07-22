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
    // screenSourcePaths cover both setup surfaces that share the same form behavior.
    const screenSourcePaths: readonly string[] = [
      '../../screens/HomeScreen.tsx',
      '../../screens/SeriesDetailsScreen.tsx',
    ];

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
  });
});
