import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  ConnectivityState,
  ExcerptTranslationGateway,
  NetworkStatus,
} from '@application/ports';
import type {
  ExcerptTranslationPayload,
  TranslateExcerptRequest,
} from '@application/ai/excerptTranslation';
import { excerptTextLimit } from '@application/ai/excerptTranslation';

import { createTranslateEpisodeExcerpt } from './translateEpisodeExcerpt';

test('translateEpisodeExcerpt diagnoses offline after a real request attempt', async (): Promise<void> => {
  // gatewayWasCalled proves stale reachability no longer prevents a real request attempt.
  let gatewayWasCalled: boolean = false;
  const networkStatus: NetworkStatus = {
    getCurrentState: async (): Promise<ConnectivityState> => ({ isOnline: false }),
  };
  const gateway: ExcerptTranslationGateway = {
    translateExcerpt: async (): Promise<ExcerptTranslationPayload> => {
      gatewayWasCalled = true;
      throw new Error('Transport unavailable');
    },
  };
  const useCase = createTranslateEpisodeExcerpt(networkStatus, gateway);

  await assert.rejects(
    useCase.execute({
      selectedText: 'quiet harbor',
    }),
    /available only when online/,
  );
  assert.equal(gatewayWasCalled, true);
});

test('translateEpisodeExcerpt returns the gateway translation online', async (): Promise<void> => {
  // networkWasCalled proves connectivity is not checked before a successful request.
  let networkWasCalled: boolean = false;
  const networkStatus: NetworkStatus = {
    getCurrentState: async (): Promise<ConnectivityState> => {
      networkWasCalled = true;
      return { isOnline: true };
    },
  };
  const gateway: ExcerptTranslationGateway = {
    translateExcerpt: async (
      request: TranslateExcerptRequest,
    ): Promise<ExcerptTranslationPayload> => ({
      translation: request.selectedText === 'quiet harbor' ? 'тихая гавань' : '',
    }),
  };
  const useCase = createTranslateEpisodeExcerpt(networkStatus, gateway);

  const result = await useCase.execute({
    selectedText: 'quiet harbor',
  });

  assert.deepEqual(result, { translation: 'тихая гавань' });
  assert.equal(networkWasCalled, false);
});

test('translateEpisodeExcerpt reports an actionable limit before transport', async (): Promise<void> => {
  const networkStatus: NetworkStatus = {
    getCurrentState: async (): Promise<ConnectivityState> => ({ isOnline: true }),
  };
  const gateway: ExcerptTranslationGateway = {
    translateExcerpt: async (): Promise<ExcerptTranslationPayload> => ({
      translation: 'Не должно вызываться',
    }),
  };
  const useCase = createTranslateEpisodeExcerpt(networkStatus, gateway);

  await assert.rejects(
    useCase.execute({
      selectedText: 'x'.repeat(excerptTextLimit + 1),
    }),
    /Select a shorter passage/,
  );
});

test('translateEpisodeExcerpt preserves transport errors when reachability lookup fails', async (): Promise<void> => {
  const networkStatus: NetworkStatus = {
    getCurrentState: async (): Promise<ConnectivityState> => {
      throw new Error('Reachability lookup failed');
    },
  };
  const gateway: ExcerptTranslationGateway = {
    translateExcerpt: async (): Promise<ExcerptTranslationPayload> => {
      throw new Error('Gateway response failed');
    },
  };
  const useCase = createTranslateEpisodeExcerpt(networkStatus, gateway);

  await assert.rejects(
    useCase.execute({ selectedText: 'quiet harbor' }),
    /Gateway response failed/,
  );
});
