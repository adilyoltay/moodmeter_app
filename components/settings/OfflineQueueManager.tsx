import React, { useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { useTheme, useThemeColors } from '@/contexts/ThemeContext';
import { buildSummary } from '@/services/moodOfflineQueue';
import type { OfflineMoodQueueViewItem } from '@/hooks/useOfflineMoodSync';
import { Colors, BorderRadius, Spacing as SpacingTokens } from '@/constants/Colors';

interface Props {
  items: OfflineMoodQueueViewItem[];
  isSyncing: boolean;
  onRetryAll: () => Promise<void>;
  onRetry: (itemId: string) => Promise<'SUCCESS' | 'QUEUED' | 'FAILED' | 'SKIPPED'>;
  onDelete: (itemId: string) => Promise<void>;
  onClearAll: () => Promise<void>;
  onRefresh?: () => Promise<void>;
}

const OfflineQueueManager: React.FC<Props> = ({ items, isSyncing, onRetryAll, onRetry, onDelete, onClearAll, onRefresh }) => {
  const theme = useThemeColors();
  const { scheme } = useTheme();
  const [busy, setBusy] = useState<string | null>(null);
  const [retryingAll, setRetryingAll] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const borderColor = scheme === 'dark' ? Colors.dark.border : Colors.ui.border;
  const secondaryTextColor = scheme === 'dark' ? Colors.dark.icon : Colors.text.secondary;
  const secondarySurface = scheme === 'dark' ? Colors.dark.background : Colors.ui.background;

  const renderItem = ({ item }: { item: OfflineMoodQueueViewItem }) => {
    const summary = buildSummary(item);
    const insertedAt = (() => {
      try {
        return formatDistanceToNow(new Date(item.insertedAt), { addSuffix: true });
      } catch {
        return item.insertedAt;
      }
    })();
    const lastAttempt = (() => {
      if (!item.lastAttemptAt) return 'Henüz denenmedi';
      try {
        return formatDistanceToNow(new Date(item.lastAttemptAt), { addSuffix: true });
      } catch {
        return item.lastAttemptAt;
      }
    })();
    const nextAttempt = (() => {
      if (!item.nextAttemptAt) return 'Hazır';
      try {
        const label = formatDistanceToNow(new Date(item.nextAttemptAt), { addSuffix: true });
        return label;
      } catch {
        return item.nextAttemptAt;
      }
    })();
    const nextBackoffLabel = (() => {
      if (item.nextBackoffMs == null) return null;
      if (item.nextBackoffMs < 1000) return '<1 sn';
      if (item.nextBackoffMs < 60_000) {
        return `${Math.round(item.nextBackoffMs / 1000)} sn`;
      }
      return `${Math.round(item.nextBackoffMs / 60000)} dk`;
    })();

    const isItemBusy = busy === item.id;

    const handleRetry = async () => {
      setBusy(item.id);
      try {
        await onRetry(item.id);
      } finally {
        setBusy(null);
      }
    };

    const handleDelete = async () => {
      setBusy(item.id);
      try {
        await onDelete(item.id);
      } finally {
        setBusy(null);
      }
    };

    return (
      <View style={[styles.card, { backgroundColor: secondarySurface, borderColor }]}> 
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: theme.text }]}>{summary}</Text>
            <Text style={[styles.meta, { color: secondaryTextColor }]}>Eklendi: {insertedAt} · Deneme: {item.retries}</Text>
            <View style={styles.metaRow}>
              <Text style={[styles.metaDetail, { color: secondaryTextColor }]}>Son deneme: {lastAttempt}</Text>
              <Text style={[styles.metaSeparator, { color: secondaryTextColor }]}>•</Text>
              <Text style={[styles.metaDetail, { color: secondaryTextColor }]}>Sıradaki: {nextAttempt}</Text>
            </View>
            {nextBackoffLabel ? (
              <Text style={[styles.metaDetail, { color: secondaryTextColor }]}>Backoff: {nextBackoffLabel}</Text>
            ) : null}
            {item.lastError ? (
              <Text style={[styles.errorText, { color: Colors.status.error }]}>Hata: {item.lastError}</Text>
            ) : null}
          </View>
          <View style={styles.badgeColumn}>
            {item.isNew ? (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>Yeni</Text>
              </View>
            ) : null}
            {isItemBusy ? <ActivityIndicator size="small" color={theme.text} /> : null}
          </View>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.button, styles.retryButton]} onPress={handleRetry} disabled={isItemBusy || isSyncing}>
            <Text style={[styles.buttonLabel, { color: Colors.status.success }]}>Tekrar Dene</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={handleDelete} disabled={isItemBusy || isSyncing}>
            <Text style={[styles.buttonLabel, { color: Colors.status.error }]}>Sil</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const handleRetryAll = async () => {
    if (retryingAll || isSyncing || !items.length) return;
    setRetryingAll(true);
    try {
      await onRetryAll();
    } finally {
      setRetryingAll(false);
    }
  };

  const handleClearAll = () => {
    if (!items.length || clearingAll || isSyncing) return;
    Alert.alert(
      'Hepsini Sil',
      'Tüm bekleyen mood kayıtları kalıcı olarak silinecek. Emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            setClearingAll(true);
            try {
              await onClearAll();
            } finally {
              setClearingAll(false);
            }
          },
        },
      ]
    );
  };

  if (isSyncing && !items.length) {
    return (
      <View style={[styles.empty, { backgroundColor: theme.card, borderColor }]}> 
        <ActivityIndicator size="small" color={theme.text} />
        <Text style={[styles.emptyLabel, { color: secondaryTextColor }]}>Kuyruk yükleniyor…</Text>
      </View>
    );
  }

  if (!items.length) {
    return (
      <View style={[styles.empty, { backgroundColor: theme.card, borderColor }]}> 
        <Text style={[styles.emptyLabel, { color: secondaryTextColor }]}>Bekleyen mood kaydı yok.</Text>
        {onRefresh ? (
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <Text style={[styles.buttonLabel, { color: theme.text }]}>Yenile</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.container, { borderColor, backgroundColor: theme.card }]}> 
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Bekleyen Kayıtlar ({items.length})</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.retryAllButton} onPress={handleRetryAll} disabled={retryingAll || isSyncing}>
            {retryingAll ? <ActivityIndicator size="small" color={Colors.status.success} /> : (
              <Text style={[styles.buttonLabel, { color: Colors.status.success }]}>Hepsini Dene</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.clearAllButton, clearingAll ? styles.clearAllButtonDisabled : null]}
            onPress={handleClearAll}
            disabled={clearingAll || isSyncing}
          >
            {clearingAll ? <ActivityIndicator size="small" color={Colors.status.error} /> : (
              <Text style={[styles.buttonLabel, { color: Colors.status.error }]}>Hepsini Sil</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: SpacingTokens.md,
    gap: SpacingTokens.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SpacingTokens.sm,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  retryAllButton: {
    paddingHorizontal: SpacingTokens.sm,
    paddingVertical: SpacingTokens.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  clearAllButton: {
    paddingHorizontal: SpacingTokens.sm,
    paddingVertical: SpacingTokens.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  clearAllButtonDisabled: {
    opacity: 0.6,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.md,
    padding: SpacingTokens.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SpacingTokens.sm,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  meta: {
    fontSize: 12,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  metaDetail: {
    fontSize: 11,
    fontWeight: '500',
  },
  metaSeparator: {
    fontSize: 10,
  },
  errorText: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
  },
  badgeColumn: {
    alignItems: 'flex-end',
    gap: SpacingTokens.xs,
  },
  newBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  newBadgeText: {
    color: Colors.status.success,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SpacingTokens.sm,
    marginTop: SpacingTokens.sm,
  },
  button: {
    paddingHorizontal: SpacingTokens.md,
    paddingVertical: SpacingTokens.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  retryButton: {
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  deleteButton: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  buttonLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  separator: {
    height: SpacingTokens.sm,
  },
  empty: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: SpacingTokens.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SpacingTokens.sm,
  },
  emptyLabel: {
    fontSize: 14,
    textAlign: 'center',
  },
  refreshButton: {
    paddingHorizontal: SpacingTokens.md,
    paddingVertical: SpacingTokens.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(148, 163, 184, 0.4)',
  },
});

export default OfflineQueueManager;
