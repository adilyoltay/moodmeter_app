/**
 * 🔍 Usage Audit Card - Debug Console Component
 * 
 * Displays usage audit system status and controls
 * for real-time code usage analysis.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { getSessionInfo, exportUsageData, clearUsageData } from '@/src/infra/usage';

interface UsageAuditCardProps {
  auditInfo: any;
  onRefresh: () => void;
}

export default function UsageAuditCard({ auditInfo, onRefresh }: UsageAuditCardProps) {
  const [exporting, setExporting] = useState(false);
  
  const handleExportData = async () => {
    try {
      setExporting(true);
      const data = await exportUsageData();
      
      Alert.alert(
        '📊 Usage Data Export',
        `Exported ${data.length} events\n\nCheck console for JSON data or reports/ folder`,
        [
          { text: 'Copy to Console', onPress: () => {
            console.log('📊 USAGE AUDIT DATA:');
            console.log(JSON.stringify(data, null, 2));
          }},
          { text: 'OK' }
        ]
      );
    } catch (error) {
      Alert.alert('Export Failed', error.message);
    } finally {
      setExporting(false);
    }
  };
  
  const handleClearData = () => {
    Alert.alert(
      'Clear Usage Data',
      'This will delete all collected usage audit data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: async () => {
          try {
            await clearUsageData();
            onRefresh();
            Alert.alert('Cleared', 'Usage audit data cleared');
          } catch (error) {
            Alert.alert('Clear Failed', error.message);
          }
        }}
      ]
    );
  };
  
  const isActive = auditInfo?.enabled;
  const statusColor = isActive ? '#10B981' : '#6B7280';
  const statusIcon = isActive ? 'record-circle' : 'record-circle-outline';
  
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <MaterialCommunityIcons 
            name="magnify-scan" 
            size={20} 
            color="#6366F1" 
          />
          <Text style={styles.title}>Usage Audit System</Text>
          <Badge 
            text={isActive ? 'ACTIVE' : 'INACTIVE'} 
            color={statusColor}
            size="small"
          />
        </View>
      </View>
      
      <View style={styles.content}>
        <View style={styles.statusRow}>
          <MaterialCommunityIcons 
            name={statusIcon} 
            size={16} 
            color={statusColor} 
          />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {isActive ? 'Recording usage patterns' : 'Not active'}
          </Text>
        </View>
        
        {auditInfo && (
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Session ID</Text>
              <Text style={styles.infoValue}>
                {auditInfo.sessionId?.split('_')[2] || 'N/A'}
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Queue Length</Text>
              <Text style={styles.infoValue}>
                {auditInfo.queueLength || 0} events
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Start Time</Text>
              <Text style={styles.infoValue}>
                {auditInfo.startTime ? 
                  new Date(parseInt(auditInfo.startTime)).toLocaleTimeString('tr-TR') : 
                  'N/A'
                }
              </Text>
            </View>
          </View>
        )}
        
        <View style={styles.actions}>
          <Pressable
            style={[styles.actionButton, styles.primaryAction]}
            onPress={handleExportData}
            disabled={exporting}
          >
            <MaterialCommunityIcons 
              name="download" 
              size={16} 
              color="#FFFFFF" 
            />
            <Text style={styles.actionButtonText}>
              {exporting ? 'Exporting...' : 'Export Data'}
            </Text>
          </Pressable>
          
          <Pressable
            style={[styles.actionButton, styles.secondaryAction]}
            onPress={handleClearData}
          >
            <MaterialCommunityIcons 
              name="delete-outline" 
              size={16} 
              color="#EF4444" 
            />
            <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>
              Clear
            </Text>
          </Pressable>
        </View>
        
        <View style={styles.note}>
          <Text style={styles.noteText}>
            💡 Enable with: EXPO_PUBLIC_USAGE_AUDIT=true npm start
          </Text>
          <Text style={styles.noteText}>
            🎯 Use for 5-10 min sessions to identify unused code
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 12,
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  content: {
    gap: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  infoItem: {
    flex: 1,
    minWidth: 100,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  primaryAction: {
    backgroundColor: '#6366F1',
  },
  secondaryAction: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  note: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#6366F1',
  },
  noteText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
  },
});
