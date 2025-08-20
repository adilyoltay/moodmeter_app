import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface MoodEntry {
  id: string;
  mood_score: number;
  energy_level: number;
  anxiety_level: number;
  notes: string;
  trigger?: string;
  created_at: string;
  user_id: string;
}

interface MoodListProps {
  entries: MoodEntry[];
  onEdit?: (entry: MoodEntry) => void;
  onDelete?: (entryId: string) => void;
}

export function MoodList({ entries, onEdit, onDelete }: MoodListProps) {
  const getMoodEmoji = (value: number) => {
    if (value < 20) return '😢';
    if (value < 40) return '😟';
    if (value < 60) return '😐';
    if (value < 80) return '🙂';
    return '😊';
  };

  const getMoodColor = (value: number) => {
    if (value < 20) return '#EF4444';
    if (value < 40) return '#F59E0B';
    if (value < 60) return '#FCD34D';
    if (value < 80) return '#84CC16';
    return '#10B981';
  };

  const formatDate = (created_at: string) => {
    const date = new Date(created_at);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Bugün, ${date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Dün, ${date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  const renderMoodEntry = ({ item }: { item: MoodEntry }) => (
    <Pressable
      style={styles.entryCard}
      onPress={() => {
        if (onEdit) {
          onEdit(item);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }}
    >
      <View style={styles.entryHeader}>
        <View style={styles.entryLeft}>
          <Text style={styles.emoji}>{getMoodEmoji(item.mood_score)}</Text>
          <View style={styles.entryInfo}>
            <Text style={styles.entryDate}>{formatDate(item.created_at)}</Text>
            {item.trigger && (
              <View style={styles.triggerBadge}>
                <Text style={styles.triggerText}>{item.trigger}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.entryRight}>
          <Text style={[styles.moodScore, { color: getMoodColor(item.mood_score) }]}>
            {Math.round(item.mood_score)}
          </Text>
        </View>
      </View>

      <View style={styles.entryMetrics}>
        <View style={styles.metric}>
          <MaterialCommunityIcons name="lightning-bolt" size={16} color="#F59E0B" />
          <Text style={styles.metricValue}>{item.energy_level}/10</Text>
          <Text style={styles.metricLabel}>Enerji</Text>
        </View>
        <View style={styles.metric}>
          <MaterialCommunityIcons name="heart-pulse" size={16} color="#EF4444" />
          <Text style={styles.metricValue}>{item.anxiety_level}/10</Text>
          <Text style={styles.metricLabel}>Anksiyete</Text>
        </View>
      </View>

      {item.notes && (
        <Text style={styles.notes} numberOfLines={2}>
          {item.notes}
        </Text>
      )}

      {onDelete && (
        <Pressable
          style={styles.deleteButton}
          onPress={(e) => {
            e.stopPropagation();
            onDelete(item.id);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }}
        >
          <MaterialCommunityIcons name="trash-can-outline" size={18} color="#EF4444" />
        </Pressable>
      )}
    </Pressable>
  );

  return (
    <View style={styles.listContent}>
      {entries.map((item, index) => (
        <React.Fragment key={item.id}>
          {renderMoodEntry({ item })}
          {index < entries.length - 1 && <View style={styles.separator} />}
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 10,
  },
  entryCard: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    position: 'relative',
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  entryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  emoji: {
    fontSize: 32,
    marginRight: 12,
  },
  entryInfo: {
    flex: 1,
  },
  entryDate: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  triggerBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  triggerText: {
    fontSize: 11,
    color: '#4B5563',
  },
  entryRight: {
    alignItems: 'flex-end',
  },
  moodScore: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  entryMetrics: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginHorizontal: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  notes: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  deleteButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
  },
  separator: {
    height: 12,
  },
});
