import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { AuthCredentials, AuthGateway } from '@application/ports';

import { createManageAuthSession } from './manageAuthSession';

// gateway is a deterministic auth boundary used to inspect validated credentials.
function createGateway(
  onSignIn: (credentials: AuthCredentials) => void,
): AuthGateway {
  return {
    getSession: async () => undefined,
    signIn: async (credentials) => {
      onSignIn(credentials);

      return { userId: 'user:1', email: credentials.email };
    },
    signUp: async () => ({ requiresEmailConfirmation: true }),
    signOut: async () => undefined,
    subscribe: () => ({ unsubscribe: () => undefined }),
  };
}

describe('manageAuthSession', () => {
  it('normalizes email before sign in', async () => {
    let receivedEmail = '';
    const auth = createManageAuthSession(
      createGateway((credentials) => {
        receivedEmail = credentials.email;
      }),
    );

    await auth.signIn({
      email: '  Learner@Example.COM ',
      password: 'password',
    });

    assert.equal(receivedEmail, 'learner@example.com');
  });

  it('rejects passwords shorter than eight characters', async () => {
    const auth = createManageAuthSession(createGateway(() => undefined));

    await assert.rejects(
      auth.signUp({ email: 'learner@example.com', password: 'short' }),
      /at least 8 characters/,
    );
  });
});
