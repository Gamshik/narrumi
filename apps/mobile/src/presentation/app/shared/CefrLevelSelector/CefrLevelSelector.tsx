import type { ReactElement } from 'react';
import { cefrLevels, type CefrLevel } from '@domain/index';

import type { AppStyles } from '../../types';
import { SeriesSetupChoiceGroup } from '../SeriesSetupChoiceGroup';

// CefrLevelSelectorProps defines the shared CEFR control used by setup and preferences flows.
export type CefrLevelSelectorProps = {
  // isDark enables a high-contrast accent treatment on dark Sorbet surfaces.
  readonly isDark: boolean;
  // isDisabled preserves the selected level while preventing edits to locked series.
  readonly isDisabled?: boolean;
  // label names the CEFR setting in its current screen context.
  readonly label?: string;
  // selectedLevel is the active grammar and vocabulary target.
  readonly selectedLevel: CefrLevel;
  // styles supplies the active light or dark Sorbet theme contract.
  readonly styles: AppStyles;
  // onSelect reports a supported CEFR level to the owning form.
  readonly onSelect: (level: CefrLevel) => void;
};

// CefrLevelSelector renders one consistent setup-style CEFR selector across the app.
export function CefrLevelSelector({
  isDark,
  isDisabled = false,
  label = 'CEFR Level',
  selectedLevel,
  styles,
  onSelect,
}: CefrLevelSelectorProps): ReactElement {
  return (
    <SeriesSetupChoiceGroup
      isDark={isDark}
      isDisabled={isDisabled}
      label={label}
      options={cefrLevels}
      selected={selectedLevel}
      styles={styles}
      onSelect={onSelect}
    />
  );
}
