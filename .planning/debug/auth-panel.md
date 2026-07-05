# Debug Session: Auth Panel

## Symptoms
- When opening the keyboard, the fields overlap.
- When entering gmail, the keyboard flickers.
- UAT Issue: "При открытии клавиатуры поля перекрываются, при вводе gmail клавиатура мерцает."

## Hypothesis
The issue is caused by incorrect nesting of `KeyboardAvoidingView` and `ScrollView`, as well as `justifyContent: 'center'` on the scroll container.
1. `KeyboardAvoidingView` is placed *inside* `ScrollView`.
2. `ScrollView` has `contentContainerStyle` with `justifyContent: 'center'`.

## Investigation
- Reviewed `apps/mobile/src/presentation/app/auth/AuthenticationScreen/AuthenticationScreen.tsx`.
- The `ScrollView` wraps the `KeyboardAvoidingView`.
- In `MobileApp.styles.ts`, `authScrollContent` uses `justifyContent: 'center'`.
- When the keyboard appears, the screen height shrinks. Because of `justifyContent: 'center'`, content larger than the visible area gets centered, pushing the top of the form off-screen (overlapping).
- When entering text, the state updates (`setEmail`, `setPassword`). This causes the screen to re-render. The `KeyboardAvoidingView` inside a `ScrollView` recalculates layout on re-render, fighting with `ScrollView`'s adjustments and causing layout thrashing (flickering).

## Root Cause
- `KeyboardAvoidingView` inside `ScrollView` causes layout recalculation on every state change (typing), leading to flickering.
- `justifyContent: 'center'` on a shrinking `ScrollView` pushes overflowing content off-screen.
