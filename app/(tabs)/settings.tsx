import React, { useState, useEffect } from 'react';
import { 
  Text, 
  View, 
  StyleSheet, 
  ScrollView, 
  Pressable,
  Alert,
  Share,
  Linking
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Custom UI Components
import { Switch } from '@/components/ui/Switch';
import ScreenLayout from '@/components/layout/ScreenLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

// Hooks & Utils
import { useTranslation } from '@/hooks/useTranslation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { router } from 'expo-router';

// Stores
import { useGamificationStore } from '@/store/gamificationStore';
import { useAISettingsStore, aiSettingsUtils } from '@/store/aiSettingsStore';

// Storage utility
import { StorageKeys } from '@/utils/storage';

import { FEATURE_FLAGS } from '@/constants/featureFlags';

// Settings data structure
interface SettingsData {
  notifications: boolean;
  biometric: boolean;
  reminderTimes: boolean;
  weeklyReports: boolean;
}

const LANGUAGE_OPTIONS = [
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'en', name: 'English', flag: '🇺🇸' }
];

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();
  const { user, signOut, profile } = useAuth();
  const { aiConsents, setConsent } = useAISettingsStore();
  
  const [settings, setSettings] = useState<SettingsData>({
    notifications: true,
    biometric: false,
    reminderTimes: false,
    weeklyReports: true
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem(StorageKeys.SETTINGS);
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const updateSetting = async (key: keyof SettingsData, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    try {
      await AsyncStorage.setItem(StorageKeys.SETTINGS, JSON.stringify(newSettings));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const handleLanguageChange = async (code: string) => {
    setLanguage(code);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSignOut = () => {
    Alert.alert(
      'Çıkış Yap',
      'Çıkış yapmak istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Çıkış Yap', 
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/login');
          }
        }
      ]
    );
  };

  // Development helpers
  const handleRestartAIOnboarding = async () => {
    Alert.alert(
      'AI Onboarding Sıfırlama',
      'AI Onboarding sürecini sıfırlamak istediğinizden emin misiniz? Bu işlem mevcut profil ve tedavi planı verilerini silecektir.',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Sıfırla', 
          style: 'destructive',
          onPress: async () => {
            try {
              if (user?.id) {
                await AsyncStorage.multiRemove([
                  `ai_onboarding_completed_${user.id}`,
                  `ai_user_profile_${user.id}`,
                  `ai_treatment_plan_${user.id}`,
                  `onboarding_session_${user.id}`,
                  'profileCompleted'
                ]);
                
                Alert.alert('✅ Başarılı', 'AI Onboarding sıfırlandı. Uygulamayı yeniden başlatın.');
              }
            } catch (error) {
              Alert.alert('❌ Hata', 'Sıfırlama işlemi başarısız oldu.');
              console.error('Restart AI onboarding error:', error);
            }
          }
        }
      ]
    );
  };

  const handleViewAIProfile = async () => {
    try {
      if (user?.id) {
        const profileData = await AsyncStorage.getItem(`ai_user_profile_${user.id}`);
        const treatmentData = await AsyncStorage.getItem(`ai_treatment_plan_${user.id}`);
        const onboardingCompleted = await AsyncStorage.getItem(`ai_onboarding_completed_${user.id}`);
        
        const profileExists = profileData ? '✅' : '❌';
        const treatmentExists = treatmentData ? '✅' : '❌';
        const onboardingStatus = onboardingCompleted === 'true' ? '✅' : '❌';
        
        Alert.alert(
          '🤖 AI Profil Durumu',
          `${onboardingStatus} Onboarding: ${onboardingCompleted || 'Tamamlanmamış'}\n${profileExists} Profil: ${profileData ? 'Mevcut' : 'Yok'}\n${treatmentExists} Tedavi Planı: ${treatmentData ? 'Mevcut' : 'Yok'}`,
          [
            { text: 'Tamam' },
            ...(profileData ? [{
              text: 'Profil Detayları',
              onPress: () => {
                try {
                  const profile = JSON.parse(profileData);
                  Alert.alert(
                    '📋 Profil Detayları',
                    `İsim: ${profile.name || 'N/A'}\nYaş: ${profile.demographics?.age || 'N/A'}\nY-BOCS Puanı: ${profile.ybocsScore || 'N/A'}`
                  );
                } catch (err) {
                  Alert.alert('❌ Hata', 'Profil verisi okunamadı');
                }
              }
            }] : [])
          ]
        );
      }
    } catch (error) {
      Alert.alert('❌ Hata', 'Profil bilgileri alınamadı');
      console.error('View AI profile error:', error);
    }
  };

  const handleDataExport = async () => {
    Alert.alert(
      'Verilerinizi İndirin',
      'Tüm verileriniz güvenli bir şekilde dışa aktarılacak.',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'İndir',
          onPress: async () => {
            // Data export logic here
            Alert.alert('Başarılı', 'Verileriniz başarıyla indirildi.');
          }
        }
      ]
    );
  };

  const handleShareApp = async () => {
    try {
      await Share.share({
        message: 'ObsessLess - OKB ile başa çıkmanızda size yardımcı olan uygulama. İndirin: https://obsessless.app',
        title: 'ObsessLess Uygulamasını Paylaş'
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL('https://obsessless.app/privacy');
  };

  const handleTermsOfService = () => {
    Linking.openURL('https://obsessless.app/terms');
  };

  const renderProfileSection = () => (
    <View style={styles.profileSection}>
      <View style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.email || 'Kullanıcı'}</Text>
            <Text style={styles.profileEmail}>Üye: {new Date(user?.created_at || Date.now()).toLocaleDateString('tr-TR')}</Text>
          </View>
        </View>
        
        <View style={styles.profileStats}>
          <View style={styles.profileStat}>
            <MaterialCommunityIcons name="fire" size={16} color="#EF4444" />
            <Text style={styles.profileStatText}>{profile?.currentStreak || 0} gün</Text>
          </View>
          <View style={styles.profileStatDivider} />
          <View style={styles.profileStat}>
            <MaterialCommunityIcons name="trophy" size={16} color="#10B981" />
            <Text style={styles.profileStatText}>{profile?.level || 1}. seviye</Text>
          </View>
          <View style={styles.profileStatDivider} />
          <View style={styles.profileStat}>
            <MaterialCommunityIcons name="star" size={16} color="#F59E0B" />
            <Text style={styles.profileStatText}>{profile?.healingPointsTotal || 0} puan</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderSettingItem = (
    title: string,
    icon: string,
    value: boolean,
    onToggle: (value: boolean) => void
  ) => (
    <View style={styles.settingItem}>
      <View style={styles.settingLeft}>
        <MaterialCommunityIcons name={icon as any} size={24} color="#6B7280" />
        <Text style={styles.settingTitle}>{title}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
      />
    </View>
  );

  const renderActionItem = (
    title: string,
    icon: string,
    onPress: () => void,
    danger = false
  ) => (
    <Pressable 
      style={({ pressed }) => [
        styles.actionItem,
        pressed && styles.actionItemPressed
      ]} 
      onPress={onPress}
    >
      <View style={styles.actionLeft}>
        <MaterialCommunityIcons 
          name={icon as any} 
          size={24} 
          color={danger ? '#EF4444' : '#6B7280'} 
        />
        <Text style={[styles.actionTitle, danger && styles.dangerText]}>
          {title}
        </Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color="#9CA3AF" />
    </Pressable>
  );

  const renderLanguageSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Dil</Text>
      <View style={styles.languageContainer}>
        {LANGUAGE_OPTIONS.map((lang) => (
          <Pressable
            key={lang.code}
            style={[
              styles.languageOption,
              language === lang.code && styles.languageOptionActive
            ]}
            onPress={() => handleLanguageChange(lang.code)}
          >
            <Text style={styles.languageFlag}>{lang.flag}</Text>
            <Text style={[
              styles.languageName,
              language === lang.code && styles.languageNameActive
            ]}>
              {lang.name}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <ScreenLayout>
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft} />
          <Text style={styles.headerTitle}>Ayarlar</Text>
          <View style={styles.headerRight} />
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {renderProfileSection()}

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bildirimler</Text>
          <View style={styles.sectionContent}>
            {renderSettingItem(
              'Günlük Hatırlatıcılar',
              'bell-outline',
              settings.notifications,
              (value) => updateSetting('notifications', value)
            )}
            {renderSettingItem(
              'Belirli Saatlerde',
              'clock-outline',
              settings.reminderTimes,
              (value) => updateSetting('reminderTimes', value)
            )}
          </View>
        </View>

        {/* Security */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Güvenlik</Text>
          <View style={styles.sectionContent}>
            {renderSettingItem(
              'Biyometrik Kilit',
              'fingerprint',
              settings.biometric,
              (value) => updateSetting('biometric', value)
            )}
          </View>
        </View>

        {/* Language */}
        {renderLanguageSection()}

        {/* AI Özellikleri - MASTER SWITCH */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Yapay Zeka Asistanı</Text>
          <View style={styles.sectionContent}>
            {renderSettingItem(
              'AI Özellikleri',
              'robot',
              FEATURE_FLAGS.isEnabled('AI_ENABLED'),
              (value) => {
                // Master AI toggle değiştirildiğinde
                FEATURE_FLAGS.setFlag('AI_ENABLED', value);
                
                // Kullanıcıya bilgi ver
                Alert.alert(
                  value ? '✅ AI Özellikleri Açıldı' : '❌ AI Özellikleri Kapatıldı',
                  value 
                    ? 'Tüm yapay zeka özellikleri aktif edildi:\n\n• AI Sohbet Asistanı\n• Akıllı İçgörüler\n• Kişiselleştirilmiş Onboarding\n• Tedavi Planı Oluşturma\n• Risk Değerlendirmesi\n• CBT Müdahaleleri\n• İlerleme Analizi'
                    : 'Tüm yapay zeka özellikleri devre dışı bırakıldı.',
                  [{ text: 'Tamam' }]
                );
                
                // Haptic feedback
                Haptics.impactAsync(
                  value 
                    ? Haptics.ImpactFeedbackStyle.Light 
                    : Haptics.ImpactFeedbackStyle.Medium
                );
              }
            )}
          </View>
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Destek</Text>
          <View style={styles.sectionContent}>
            {renderActionItem(
              'Uygulamayı Paylaş',
              'share-variant',
              handleShareApp
            )}
            {renderActionItem(
              'Verilerini İndir',
              'download',
              handleDataExport
            )}
            {renderActionItem(
              'Gizlilik Politikası',
              'shield-check',
              handlePrivacyPolicy
            )}
            {renderActionItem(
              'Kullanım Şartları',
              'file-document',
              handleTermsOfService
            )}
          </View>
        </View>



        {/* Developer Tools (only in dev mode) */}
        {__DEV__ && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🛠️ Geliştirici Araçları</Text>
            <View style={styles.sectionContent}>
              {renderActionItem(
                '🤖 AI Profil Durumunu Görüntüle',
                'account-details',
                handleViewAIProfile,
                false
              )}
              {renderActionItem(
                '🔄 AI Onboarding\'i Yeniden Başlat',
                'refresh',
                handleRestartAIOnboarding,
                true
              )}
            </View>
          </View>
        )}

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hesap</Text>
          <View style={styles.sectionContent}>
            {renderActionItem(
              'Çıkış Yap',
              'logout',
              handleSignOut,
              true
            )}
          </View>
        </View>

        {/* Version Info */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>ObsessLess v1.0.0</Text>
          <Text style={styles.versionSubtext}>Made with ❤️ for OCD warriors</Text>
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingTop: 8,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    width: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileSection: {
    padding: 20,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  profileStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  profileStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  profileStatText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
  },
  profileStatDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#E5E7EB',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  sectionContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    color: '#374151',
    marginLeft: 12,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  actionItemPressed: {
    backgroundColor: '#F9FAFB',
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    color: '#374151',
    marginLeft: 12,
  },
  dangerText: {
    color: '#EF4444',
  },
  languageContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 8,
    gap: 8,
  },
  languageOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    gap: 8,
  },
  languageOptionActive: {
    backgroundColor: '#EFF6FF',
  },
  languageFlag: {
    fontSize: 20,
  },
  languageName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  languageNameActive: {
    color: '#3B82F6',
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  versionText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  versionSubtext: {
    fontSize: 12,
    color: '#D1D5DB',
  },
});
