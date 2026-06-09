// RestrictedCapability names product actions that may be denied by moderation.
export type RestrictedCapability =
  | 'aiGeneration'
  | 'interaction'
  | 'grammarExplanation'
  | 'remoteSync'
  | 'remoteWrite';

// UserRestrictionKind mirrors the database categories without exposing row shapes.
export type UserRestrictionKind =
  | 'fullBan'
  | 'aiGenerationBlock'
  | 'interactionBlock'
  | 'syncBlock'
  | 'writeBlock';

// UserRestrictionSummary is the safe moderation state that application flows may display or branch on.
export type UserRestrictionSummary = {
  // kind identifies the active restriction without leaking database-specific values.
  readonly kind: UserRestrictionKind;
  // reason is a user-safe explanation prepared by a trusted boundary.
  readonly reason: string;
  // startsAt marks when the restriction became active.
  readonly startsAt: string;
  // endsAt marks a temporary restriction expiry; undefined means no scheduled expiry is exposed.
  readonly endsAt?: string;
};

// UserAccessDecision describes whether one capability is currently allowed.
export type UserAccessDecision =
  | {
      // allowed true means the capability can continue normally.
      readonly allowed: true;
    }
  | {
      // allowed false means the caller must stop the protected action.
      readonly allowed: false;
      // restriction explains the active moderation rule behind the denial.
      readonly restriction: UserRestrictionSummary;
    };

// UserAccessPolicy checks moderation state without leaking Supabase tables or admin APIs.
export type UserAccessPolicy = {
  // getCurrentRestriction returns the broadest active restriction for user-facing state.
  readonly getCurrentRestriction: (
    userId: string,
  ) => Promise<UserRestrictionSummary | undefined>;
  // canUseCapability lets use cases gate server-only or write-heavy actions.
  readonly canUseCapability: (
    userId: string,
    capability: RestrictedCapability,
  ) => Promise<UserAccessDecision>;
};
