import AsyncStorage from '@react-native-async-storage/async-storage';
import { generatePrefixedId } from '@/utils/idGenerator';

export type SavedMoodPayload = {
  user_id: string;
  mood_score: number;
  energy_level: number;
  anxiety_level: number;
  notes?: string;
  triggers?: string[];
  activities?: string[];
  source?: string;
  method?: string;
  metadata?: any;
  timestamp?: string;
  [key: string]: any;
};

export interface OfflineMoodItem {
  id: string;
  userId: string;
  payload: SavedMoodPayload;
  insertedAt: string;
  retries: number;
  lastAttemptAt?: string | null;
  lastError?: string | null;
}

const STORAGE_PREFIX = 'offline_mood_queue_';
const DEFAULT_BACKOFF_BASE_MS = 2000;

const getStorageKey = (userId: string) => `${STORAGE_PREFIX}${userId}`;

const readQueue = async (userId: string): Promise<OfflineMoodItem[]> => {
  try {
    const raw = await AsyncStorage.getItem(getStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OfflineMoodItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item === 'object' && typeof item.id === 'string')
      .sort((a, b) => new Date(a.insertedAt).getTime() - new Date(b.insertedAt).getTime());
  } catch (error) {
    console.warn('[offlineQueue] Failed to read queue', error);
    return [];
  }
};

const writeQueue = async (userId: string, queue: OfflineMoodItem[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(getStorageKey(userId), JSON.stringify(queue));
  } catch (error) {
    console.warn('[offlineQueue] Failed to persist queue', error);
  }
};

export const peekAllDetailed = async (userId: string): Promise<OfflineMoodItem[]> => {
  return readQueue(userId);
};

export const enqueue = async (
  userId: string,
  payload: SavedMoodPayload,
  options: { id?: string; insertedAt?: string } = {}
): Promise<OfflineMoodItem> => {
  const queue = await readQueue(userId);
  const item: OfflineMoodItem = {
    id: options.id || generatePrefixedId('offline_mood'),
    userId,
    payload,
    insertedAt: options.insertedAt || new Date().toISOString(),
    retries: 0,
    lastAttemptAt: null,
    lastError: null,
  };
  queue.push(item);
  await writeQueue(userId, queue);
  return item;
};

export const remove = async (userId: string, itemId: string): Promise<void> => {
  const queue = await readQueue(userId);
  const filtered = queue.filter((item) => item.id !== itemId);
  if (filtered.length === queue.length) return;
  await writeQueue(userId, filtered);
};

export const peekAll = async (userId: string): Promise<OfflineMoodItem[]> => {
  return readQueue(userId);
};

export const markRetry = async (
  userId: string,
  itemId: string,
  context: { errorMessage?: string; attemptedAt?: string } = {}
): Promise<OfflineMoodItem | null> => {
  const queue = await readQueue(userId);
  const next = queue.map((item) =>
    item.id === itemId
      ? {
          ...item,
          retries: item.retries + 1,
          lastAttemptAt: context.attemptedAt || new Date().toISOString(),
          lastError: context.errorMessage ?? item.lastError ?? null,
        }
      : item
  );
  await writeQueue(userId, next);
  return next.find((item) => item.id === itemId) ?? null;
};

export const flush = async (userId: string): Promise<OfflineMoodItem[]> => {
  const queue = await readQueue(userId);
  await writeQueue(userId, []);
  return queue;
};

export const clearAll = async (userId: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(getStorageKey(userId));
  } catch (error) {
    console.warn('[offlineQueue] Failed to clear queue', error);
  }
};

export const clearAllStrict = async (userId: string): Promise<void> => {
  await AsyncStorage.removeItem(getStorageKey(userId));
};

export const getBackoffDelay = (retries: number, baseMs: number = DEFAULT_BACKOFF_BASE_MS, maxMs: number = 120000) => {
  if (retries <= 0) return Math.min(baseMs, maxMs);
  const delay = baseMs * Math.pow(2, retries);
  return Math.min(delay, maxMs);
};

export const buildSummary = (item: OfflineMoodItem): string => {
  try {
    const parts: string[] = [];
    const score = typeof item.payload?.mood_score === 'number' ? Math.round(item.payload.mood_score) : null;
    if (typeof score === 'number' && Number.isFinite(score)) {
      parts.push(`Mood ${score}`);
    }
    const triggers = Array.isArray(item.payload?.triggers)
      ? item.payload.triggers.filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
      : [];
    if (triggers.length) {
      const list = triggers.slice(0, 2).join(', ');
      parts.push(list);
    }
    const note = typeof item.payload?.notes === 'string' ? item.payload.notes.trim() : '';
    if (note) {
      const clipped = note.length > 60 ? `${note.slice(0, 57)}…` : note;
      parts.push(clipped);
    }
    return parts.length ? parts.join(' • ') : 'Mood kaydı';
  } catch {
    return 'Mood kaydı';
  }
};

export const moodOfflineQueue = {
  enqueue,
  remove,
  peekAll,
  peekAllDetailed,
  markRetry,
  flush,
  clearAll,
  clearAllStrict,
  getBackoffDelay,
  buildSummary,
};

export default moodOfflineQueue;
