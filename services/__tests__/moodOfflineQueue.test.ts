import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  enqueue,
  peekAll,
  peekAllDetailed,
  remove,
  markRetry,
  flush,
  clearAll,
  clearAllStrict,
  getBackoffDelay,
  buildSummary,
} from '../moodOfflineQueue';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const basePayload = {
  user_id: 'user-1',
  mood_score: 70,
  energy_level: 6,
  anxiety_level: 4,
};

describe('moodOfflineQueue', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('enqueues items in insertion order and returns them via peekAll', async () => {
    const first = await enqueue('user-1', basePayload);
    const second = await enqueue('user-1', { ...basePayload, mood_score: 80 });

    const queue = await peekAll('user-1');

    expect(queue).toHaveLength(2);
    expect(queue[0].id).toEqual(first.id);
    expect(queue[1].id).toEqual(second.id);
  });

  it('removes an item by id', async () => {
    const first = await enqueue('user-1', basePayload);
    const second = await enqueue('user-1', { ...basePayload, mood_score: 90 });

    await remove('user-1', first.id);

    const queue = await peekAll('user-1');
    expect(queue).toHaveLength(1);
    expect(queue[0].id).toBe(second.id);
  });

  it('marks retry, increments counter, and records attempt metadata', async () => {
    const item = await enqueue('user-1', basePayload);

    const updated = await markRetry('user-1', item.id, { errorMessage: 'network', attemptedAt: '2024-01-01T10:00:00.000Z' });

    expect(updated?.retries).toBe(1);
    expect(updated?.lastError).toBe('network');
    expect(updated?.lastAttemptAt).toBe('2024-01-01T10:00:00.000Z');
    const persisted = await peekAll('user-1');
    expect(persisted[0].retries).toBe(1);
    expect(persisted[0].lastError).toBe('network');
    expect(persisted[0].lastAttemptAt).toBe('2024-01-01T10:00:00.000Z');
  });

  it('flush clears queue and returns previous items', async () => {
    await enqueue('user-1', basePayload);
    await enqueue('user-1', { ...basePayload, mood_score: 50 });

    const flushed = await flush('user-1');
    const after = await peekAll('user-1');

    expect(flushed).toHaveLength(2);
    expect(after).toHaveLength(0);
  });

  it('clearAll removes queue storage', async () => {
    await enqueue('user-1', basePayload);
    await clearAll('user-1');
    const queue = await peekAll('user-1');
    expect(queue).toHaveLength(0);
  });

  it('peekAllDetailed returns items sorted by insertedAt', async () => {
    const first = await enqueue('user-1', basePayload, { insertedAt: '2024-01-01T10:00:00.000Z' });
    const second = await enqueue('user-1', basePayload, { insertedAt: '2024-01-01T09:00:00.000Z' });

    const detailed = await peekAllDetailed('user-1');

    expect(detailed[0].id).toBe(second.id);
    expect(detailed[1].id).toBe(first.id);
  });

  it('clearAllStrict throws errors to caller', async () => {
    const removeSpy = jest.spyOn(AsyncStorage, 'removeItem').mockImplementationOnce(() => {
      throw new Error('storage failure');
    });

    await expect(clearAllStrict('user-1')).rejects.toThrow('storage failure');
    removeSpy.mockRestore();
  });

  it('buildSummary combines mood, triggers, and notes', async () => {
    const item = await enqueue('user-1', {
      ...basePayload,
      notes: 'Uzun bir gün oldu ve biraz yorgunum',
      triggers: ['İş', 'Uyku'],
    });

    const queue = await peekAllDetailed('user-1');
    const summary = buildSummary(queue[0]);

    expect(summary).toContain('Mood');
    expect(summary).toContain('İş');
    expect(summary).toContain('Uzun bir gün');
  });

  it('calculates exponential backoff with upper bound', () => {
    expect(getBackoffDelay(0, 1000)).toBe(1000);
    expect(getBackoffDelay(1, 1000)).toBe(2000);
    expect(getBackoffDelay(4, 1000)).toBe(16000);
    expect(getBackoffDelay(10, 1000)).toBeLessThanOrEqual(120000);
  });
});
