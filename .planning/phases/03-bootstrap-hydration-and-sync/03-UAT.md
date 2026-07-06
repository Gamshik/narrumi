---
status: testing
phase: 03-bootstrap-hydration-and-sync
source: 03-VERIFICATION.md
started: 2026-07-07T00:52:37.3138596+03:00
updated: 2026-07-07T01:46:23.6366556+03:00
---

## Current Test

number: 1
name: Bootstrap Uses Local Preferences Before Sync
expected: |
  Launch the authenticated app with saved non-default local preferences and a slow or failing remote sync. Settings-visible surfaces must not show default preferences first; saved local preferences should appear after bootstrap while sync continues or fails in the background.
awaiting: user response

## Tests

### 1. Bootstrap Uses Local Preferences Before Sync
expected: Launch the authenticated app with saved non-default local preferences and a slow or failing remote sync. Settings-visible surfaces must not show default preferences first; saved local preferences should appear after bootstrap while sync continues or fails in the background.
result: [pending]

### 2. Settings Route Loading Appearance
expected: Navigate to Settings while bootstrap is still hydrating. SettingsSkeleton should appear with Bubble/Sorbet settings-shaped blocks and transition to loaded controls without a visible layout jump.
result: [pending]

### 3. Offline Bootstrap Entry
expected: Launch signed in with network disabled. The app should enter using local data and surface an offline sync state instead of hanging.
result: [pending]

### 4. Recovery And Warning UX
expected: Corrupt stored preferences, launch, then open Settings. The app should recover safely, display a recovery warning, and keep settings edits enabled.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
