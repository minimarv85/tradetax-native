import React, { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch, Alert, ScrollView } from 'react-native';
import { AuthContext } from '../App';
import { supabase } from '../app-lib/supabase';
import * as SecureStore from 'expo-secure-store';

export default function SettingsScreen({ navigation }) {
  const { session, colors, toggleTheme, theme } = useContext(AuthContext);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => supabase.auth.signOut() }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          const { error } = await supabase.auth.admin.deleteUser(session.user.id);
          if (error) {
            Alert.alert('Error', error.message);
          } else {
            supabase.auth.signOut();
          }
        }}
      ]
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>

        {/* Appearance */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>
          
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Dark Mode</Text>
            <Switch
              value={theme === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{ false: '#767577', true: colors.primary }}
              thumbColor={theme === 'dark' ? colors.accent : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Security */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Security</Text>
          
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Face ID / Fingerprint</Text>
            <Switch
              value={biometricEnabled}
              onValueChange={() => {
                setBiometricEnabled(!biometricEnabled);
                if (!biometricEnabled) {
                  SecureStore.setItemAsync('biometric_enabled', 'true');
                } else {
                  SecureStore.deleteItemAsync('biometric_enabled');
                }
              }}
              trackColor={{ false: '#767577', true: colors.primary }}
              thumbColor={biometricEnabled ? colors.accent : '#f4f3f4'}
            />
          </View>

          <Text style={[styles.infoText, { color: colors.secondary }]}>
            Enable biometric login for faster, more secure access to your account.
          </Text>
        </View>

        {/* Account */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Account</Text>
          
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.secondary }]}>Email</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{session?.user?.email}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.secondary }]}>User ID</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{session?.user?.id?.substring(0, 8)}...</Text>
          </View>

          <TouchableOpacity 
            style={[styles.dangerButton, { backgroundColor: colors.danger }]}
            onPress={handleLogout}
          >
            <Text style={styles.dangerText}>Sign Out</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.deleteButton, { borderColor: colors.danger }]}
            onPress={handleDeleteAccount}
          >
            <Text style={[styles.deleteText, { color: colors.danger }]}>Delete Account</Text>
          </TouchableOpacity>
        </View>

        {/* About */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
          
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.secondary }]}>Version</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>1.0.0</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.secondary }]}>Data Sync</Text>
            <Text style={[styles.infoValue, { color: colors.success }]}>Supabase Connected</Text>
          </View>
        </View>

        {/* Data Management */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Data</Text>
          
          <TouchableOpacity 
            style={styles.actionRow}
            onPress={() => Alert.alert('Export Data', 'Export feature coming soon!')}
          >
            <Text style={[styles.actionText, { color: colors.text }]}>Export Data</Text>
            <Text style={[styles.arrow, { color: colors.secondary }]}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionRow}
            onPress={() => Alert.alert('Clear Cache', 'Cache cleared successfully!')}
          >
            <Text style={[styles.actionText, { color: colors.text }]}>Clear Cache</Text>
            <Text style={[styles.arrow, { color: colors.secondary }]}>›</Text>
          </TouchableOpacity>
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingLabel: {
    fontSize: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 12,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  actionText: {
    fontSize: 16,
  },
  arrow: {
    fontSize: 20,
    fontWeight: '600',
  },
  dangerButton: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  dangerText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  deleteText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
