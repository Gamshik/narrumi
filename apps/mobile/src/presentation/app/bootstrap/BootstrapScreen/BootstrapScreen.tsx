import React from 'react';
import { View, Text } from 'react-native';

import { useAppStyles } from '@presentation/app/useAppStyles';
import { BubbleButton } from '@presentation/app/shared/BubbleButton';
import { BubbleStatus } from '@presentation/app/shared/BubbleStatus';

import type { BootstrapState } from '../bootstrapState';
import { getBootstrapUiContent } from '../bootstrapUiState';

export type BootstrapScreenProps = {
  readonly state: BootstrapState;
  readonly onRetry: () => void;
};

export function BootstrapScreen({
  state,
  onRetry,
}: BootstrapScreenProps): React.ReactElement {
  const { styles, colors } = useAppStyles();
  const content = getBootstrapUiContent(state);

  return (
    <View style={styles.bootstrapScreen}>
      <View style={{ gap: 24, alignItems: 'center' }}>
        <BubbleStatus
          colors={colors}
          {...(content.subtitle ? { message: content.subtitle } : {})}
          title={content.title}
          tone={content.isError ? 'error' : 'loading'}
          variant="card"
        />
        {content.isError ? (
          <BubbleButton
            colors={colors}
            onPress={onRetry}
            variant="primary"
          >
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>Retry</Text>
          </BubbleButton>
        ) : null}
      </View>
    </View>
  );
}
