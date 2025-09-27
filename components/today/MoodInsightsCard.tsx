import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Colors, Spacing as SpacingTokens, BorderRadius } from '@/constants/Colors';
import { useTheme, useThemeColors } from '@/contexts/ThemeContext';
import type { TimeRange } from '@/types/mood';
import {
  buildMoodInsights,
  DominantTriggerInsight,
  MoodInsightEntry,
} from '@/utils/moodInsights';

type Props = {
  entries: MoodInsightEntry[];
  accentColor?: string;
  isLoading?: boolean;
  range?: TimeRange;
};

const MoodInsightsCard: React.FC<Props> = ({ entries, accentColor = Colors.primary.green, isLoading = false, range = 'week' }) => {
  const theme = useThemeColors();
  const { scheme } = useTheme();

  const summary = useMemo(() => buildMoodInsights(entries ?? []), [entries]);
  const subtitleText = useMemo(() => {
    switch (range) {
      case 'day':
        return 'Bugünün öne çıkanları';
      case 'month':
        return 'Seçili ayın öne çıkanları';
      case '6months':
        return 'Son 6 ayın öne çıkanları';
      case 'year':
        return 'Son yılın öne çıkanları';
      case 'week':
        return 'Seçili haftanın öne çıkanları';
      default:
        return 'Seçili dönemin öne çıkanları';
    }
  }, [range]);
  const hasEntries = entries && entries.length > 0;
  const cardSurface = scheme === 'dark' ? Colors.dark.backgroundSecondary : Colors.ui.card;
  const borderColor = scheme === 'dark' ? Colors.dark.border : Colors.ui.border;
  const secondarySurface = scheme === 'dark' ? Colors.dark.background : Colors.ui.background;
  const showEmptyState = !isLoading && (!hasEntries || (
    (!summary.triggers?.length) &&
    !summary.bestActivity &&
    !summary.challengingActivity &&
    !summary.keyword
  ));

  const renderTriggers = (triggers: DominantTriggerInsight[]) => {
    if (!triggers.length) {
      return <Text style={[styles.emptyText, { color: theme.secondaryText }]}>Tetikleyici verisi henüz yok.</Text>;
    }

    return (
      <View style={styles.chipRow}>
        {triggers.map((item) => (
          <View key={item.trigger} style={[styles.chip, { backgroundColor: `${accentColor}1A` }]}> 
            <Text style={[styles.chipLabel, { color: accentColor }]}>{item.trigger}</Text>
            <Text style={[styles.chipMeta, { color: theme.secondaryText }]}>{item.count} • %{item.percentage}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderActivity = () => {
    if (!summary.bestActivity && !summary.challengingActivity) {
      return <Text style={styles.emptyText}>Aktivite etkisi için daha fazla kayda ihtiyaç var.</Text>;
    }

    const best = summary.bestActivity;
    const challenging = summary.challengingActivity;

    return (
      <View style={styles.activityRow}>
        {best && (
          <View style={[styles.activityCard, { borderColor: `${accentColor}33`, backgroundColor: secondarySurface }]}> 
            <View style={styles.activityHeader}>
              <MaterialCommunityIcons name="arrow-up-bold" size={18} color={accentColor} />
              <Text style={[styles.activityTitle, { color: theme.text }]}>{best.activity}</Text>
            </View>
            <Text style={[styles.activityValue, { color: accentColor }]}>+{best.moodDelta.toFixed(1)}</Text>
            <Text style={[styles.activityMeta, { color: theme.secondaryText }]}>Ortalama mood {best.averageMood.toFixed(1)} · {best.count} kayıt</Text>
          </View>
        )}
        {challenging && (
          <View style={[styles.activityCard, { borderColor: 'rgba(239,68,68,0.3)', backgroundColor: secondarySurface }]}> 
            <View style={styles.activityHeader}>
              <MaterialCommunityIcons name="arrow-down-bold" size={18} color={Colors.status.error} />
              <Text style={[styles.activityTitle, { color: theme.text }]}>{challenging.activity}</Text>
            </View>
            <Text style={[styles.activityValue, { color: Colors.status.error }]}>{challenging.moodDelta.toFixed(1)}</Text>
            <Text style={[styles.activityMeta, { color: theme.secondaryText }]}>Ortalama mood {challenging.averageMood.toFixed(1)} · {challenging.count} kayıt</Text>
          </View>
        )}
      </View>
    );
  };

  const renderKeyword = () => {
    if (!summary.keyword) {
      return <Text style={[styles.emptyText, { color: theme.secondaryText }]}>Notlarda öne çıkan kelime bulunamadı.</Text>;
    }

    return (
      <View style={styles.keywordContainer}>
        <View style={[styles.keywordBadge, { backgroundColor: `${accentColor}1A` }]}> 
          <MaterialCommunityIcons name="format-quote-close" size={16} color={accentColor} />
          <Text style={[styles.keyword, { color: accentColor }]}>{summary.keyword.word}</Text>
        </View>
        <Text style={[styles.keywordMeta, { color: theme.secondaryText }]}>Notlarda {summary.keyword.count} kez geçti</Text>
      </View>
    );
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: cardSurface,
          borderColor,
          shadowColor: scheme === 'dark' ? 'rgba(15,23,42,0.6)' : '#0f172a',
        },
      ]}
      accessibilityRole="summary"
      accessibilityLabel="Mood insights card"
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>Mood içgörüleri</Text>
          <Text style={[styles.subtitle, { color: theme.secondaryText }]}>{subtitleText}</Text>
        </View>
        {isLoading ? <ActivityIndicator size="small" color={accentColor} /> : null}
      </View>

      {isLoading ? null : showEmptyState ? (
        <Text style={[styles.emptyState, { color: theme.secondaryText }]}>Henüz içgörü oluşturmak için yeterli veri yok.</Text>
      ) : (
        <View style={styles.content}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="target" size={18} color={accentColor} />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>En belirgin tetikleyiciler</Text>
            </View>
            {renderTriggers(summary.triggers || [])}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="run" size={18} color={accentColor} />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Aktivite etkileri</Text>
            </View>
            {renderActivity()}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="message-text-outline" size={18} color={accentColor} />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Notlarda en sık geçen ifade</Text>
            </View>
            {renderKeyword()}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: SpacingTokens.md,
    marginTop: SpacingTokens.md,
    marginHorizontal: SpacingTokens.md,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  content: {
    marginTop: SpacingTokens.md,
    gap: SpacingTokens.md,
  },
  section: {
    borderRadius: BorderRadius.md,
    padding: SpacingTokens.sm,
    backgroundColor: 'transparent',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SpacingTokens.xs,
    marginBottom: SpacingTokens.xs,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SpacingTokens.xs,
  },
  chip: {
    borderRadius: BorderRadius.md,
    paddingVertical: SpacingTokens.xs,
    paddingHorizontal: SpacingTokens.sm,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  chipMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  emptyState: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: SpacingTokens.md,
  },
  activityRow: {
    flexDirection: 'row',
    gap: SpacingTokens.sm,
    flexWrap: 'wrap',
  },
  activityCard: {
    flex: 1,
    minWidth: 140,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.md,
    padding: SpacingTokens.sm,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SpacingTokens.xs,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  activityValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: SpacingTokens.xs,
  },
  activityMeta: {
    fontSize: 12,
    marginTop: 4,
  },
  keywordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SpacingTokens.sm,
  },
  keywordBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SpacingTokens.xs,
    borderRadius: BorderRadius.full,
    paddingVertical: 6,
    paddingHorizontal: SpacingTokens.sm,
  },
  keyword: {
    fontSize: 14,
    fontWeight: '600',
  },
  keywordMeta: {
    fontSize: 13,
  },
});

export default MoodInsightsCard;
