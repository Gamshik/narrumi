import { useState } from 'react';
import type { ReactElement } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BubbleButton, BubbleStatus, BubbleSurface, JellyPressable, RouteScreen } from '../../shared';
import { useAppStyles } from '../../useAppStyles';
import { useAuthSession } from '../AuthProvider';

// AuthMode selects whether the form signs in or creates an account.
type AuthMode = 'sign-in' | 'sign-up';

// AuthenticationScreen creates the Supabase session required by RLS sync.
export function AuthenticationScreen(): ReactElement {
  const { signIn, signUp } = useAuthSession();
  const { isDark, colors, styles } = useAppStyles();
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string>();
  const [isError, setIsError] = useState(false);

  const submit = async (): Promise<void> => {
    setIsSubmitting(true);
    setMessage(undefined);
    setIsError(false);

    try {
      if (mode === 'sign-in') {
        await signIn({ email, password });
      } else {
        const result = await signUp({ email, password });

        if (result.requiresEmailConfirmation) {
          setMessage(
            'Check your inbox, confirm the email, then return and sign in.',
          );
          setPassword('');
          setMode('sign-in');
        }
      }
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : 'Authentication failed. Try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDisabled =
    isSubmitting || email.trim().length === 0 || password.length === 0;

  return (
    <RouteScreen isDark={isDark} styles={styles}>
      <ScrollView
        contentContainerStyle={styles.authScrollContent}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        style={styles.authKeyboardView}
      >
        <View style={styles.authContent}>
          <View style={styles.authHeader}>
            <Text style={styles.appCategory}>PERSONAL AI SERIES</Text>
            <Text style={styles.authTitle}>Context-English</Text>
            <Text style={styles.authSubtitle}>
              Sign in to back up your series and continue on another device.
            </Text>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.authFormKeyboardRegion}
          >
            <BubbleSurface colors={colors} style={styles.authCard} variant="card">
              <View style={styles.authModeRow}>
                <AuthModeButton
                  isActive={mode === 'sign-in'}
                  label="Sign In"
                  styles={styles}
                  onPress={() => {
                    setMode('sign-in');
                    setMessage(undefined);
                  }}
                />
                <AuthModeButton
                  isActive={mode === 'sign-up'}
                  label="Create Account"
                  styles={styles}
                  onPress={() => {
                    setMode('sign-up');
                    setMessage(undefined);
                  }}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.sectionLabel}>EMAIL</Text>
                <TextInput
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  onChangeText={setEmail}
                  placeholder="learner@example.com"
                  placeholderTextColor={styles.placeholder.color}
                  style={styles.formInput}
                  textContentType="emailAddress"
                  value={email}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.sectionLabel}>PASSWORD</Text>
                <TextInput
                  autoCapitalize="none"
                  autoComplete={
                    mode === 'sign-up' ? 'new-password' : 'current-password'
                  }
                  onChangeText={setPassword}
                  onSubmitEditing={() => {
                    if (!isDisabled) {
                      void submit();
                    }
                  }}
                  placeholder="At least 8 characters"
                  placeholderTextColor={styles.placeholder.color}
                  secureTextEntry
                  style={styles.formInput}
                  textContentType={
                    mode === 'sign-up' ? 'newPassword' : 'password'
                  }
                  value={password}
                />
              </View>

              {message ? (
                <BubbleStatus
                  colors={colors}
                  tone={isError ? 'error' : 'success'}
                  title={message}
                  variant="row"
                />
              ) : null}

              <BubbleButton
                colors={colors}
                disabled={isDisabled}
                onPress={() => void submit()}
                variant="primary"
              >
                <Text style={styles.primaryButtonText}>
                  {isSubmitting
                    ? 'Please wait...'
                    : mode === 'sign-in'
                      ? 'Sign In'
                      : 'Create Account'}
                </Text>
              </BubbleButton>
            </BubbleSurface>
          </KeyboardAvoidingView>
        </View>
      </ScrollView>
    </RouteScreen>
  );
}

// AuthModeButton renders one compact account-mode selector.
function AuthModeButton({
  isActive,
  label,
  styles,
  onPress,
}: {
  // isActive applies the selected blue capsule.
  readonly isActive: boolean;
  // label is the visible account action.
  readonly label: string;
  // styles is the shared themed app style contract.
  readonly styles: ReturnType<typeof useAppStyles>['styles'];
  // onPress changes the current authentication mode.
  readonly onPress: () => void;
}): ReactElement {
  return (
    <JellyPressable
      containerStyle={styles.flexOne}
      onPress={onPress}
      style={({ pressed }) => [
        styles.authModeButton,
        isActive && styles.authModeButtonActive,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.authModeButtonText,
          isActive && styles.authModeButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </JellyPressable>
  );
}
