import type { CefrLevel } from '@domain/index';

import type { createStyles } from './MobileApp.styles';

// AppStyles is the generated StyleSheet contract shared by app presentation components.
export type AppStyles = ReturnType<typeof createStyles>;
// LevelFilter extends CEFR levels with ALL for dictionary browsing.
export type LevelFilter = CefrLevel | 'ALL';
