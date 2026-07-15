import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { Text, View } from 'react-native';

import {
  MAX_STORY_WORD_GOAL,
  MIN_STORY_WORD_GOAL,
} from '@domain/index';
import type { AppColors } from '@presentation/theme';

import { BubbleSlider } from '../../../../shared';
import { storyWordGoalSettingStyles as styles } from './StoryWordGoalSetting.styles';

// StoryWordGoalSettingProps connects the visual control to caller-owned preference persistence.
export type StoryWordGoalSettingProps = {
  // colors provides the active light or dark semantic theme tokens.
  readonly colors: AppColors;
  // value is the current automatic Story Word suggestion count.
  readonly value: number;
  // onChange persists the final snapped preference value.
  readonly onChange: (value: number) => void;
  // onInteractionStart lets the Settings scroll view pause during horizontal dragging.
  readonly onInteractionStart: () => void;
  // onInteractionEnd restores vertical Settings scrolling after dragging.
  readonly onInteractionEnd: () => void;
};

// StoryWordGoalSetting explains and edits automatic suggestions without implying a hard word limit.
export function StoryWordGoalSetting({
  colors,
  value,
  onChange,
  onInteractionStart,
  onInteractionEnd,
}: StoryWordGoalSettingProps): ReactElement {
  // displayValue follows transient drag steps while persisted props remain caller-owned.
  const [displayValue, setDisplayValue] = useState<number>(value);

  useEffect((): void => {
    setDisplayValue(value);
  }, [value]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.labelPrimary }]}>
          Story Word Suggestions
        </Text>
        <View style={styles.value}>
          <Text style={[styles.valueNumber, { color: colors.systemBlue }]}>
            {displayValue}
          </Text>
          <Text style={[styles.valueUnit, { color: colors.labelSecondary }]}>
            {displayValue === 1 ? 'word' : 'words'}
          </Text>
        </View>
      </View>

      <BubbleSlider
        accessibilityLabel="Story Word suggestions"
        colors={colors}
        max={MAX_STORY_WORD_GOAL}
        min={MIN_STORY_WORD_GOAL}
        step={1}
        value={value}
        valueUnit="suggestions"
        onInteractionEnd={onInteractionEnd}
        onInteractionStart={onInteractionStart}
        onValueChange={setDisplayValue}
        onSlidingComplete={onChange}
      />
    </View>
  );
}
