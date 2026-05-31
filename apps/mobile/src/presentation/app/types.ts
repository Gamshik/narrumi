import type { CefrLevel } from '@domain/index';

import type { createStyles } from './MobileApp.styles';

export type AppStyles = ReturnType<typeof createStyles>;
export type LevelFilter = CefrLevel | 'ALL';
