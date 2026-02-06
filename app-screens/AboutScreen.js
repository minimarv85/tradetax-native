import React, { useContext } from 'react';
import { View, Text, ScrollView, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import { AuthContext } from '../App';

export default function AboutScreen({ navigation }) {
  const { colors } = useContext(AuthContext);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* App Icon & Name */}
        <View style={styles.appInfo}>
          <View style={[styles.appIcon, { backgroundColor: colors.primary }]}>
            <Text style={styles.appIconText}>📊</Text>
          </View>
          <Text style={[styles.appName, { color: colors.text }]}>TradeTax</Text>
          <Text style={[styles.version, { color: colors.secondary }]}>Version 1.0.0</Text>
        </View>

        {/* Description */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>About TradeTax</Text>
          <Text style={[styles.description, { color: colors.secondary }]}>
            TradeTax is the ultimate UK sole trader tax tracker app. Track income, expenses, calculate taxes, and manage your business finances all in one place.
          </Text>
        </View>

        {/* Features */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Features</Text>
          
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>💰</Text>
              <Text style={[styles.featureText, { color: colors.text }]}>Income & Expense Tracking</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>📄</Text>
              <Text style={[styles.featureText, { color: colors.text }]}>Invoice Creation</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>📷</Text>
              <Text style={[styles.featureText, { color: colors.text }]}>Receipt Scanning</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>🧮</Text>
              <Text style={[styles.featureText, { color: colors.text }]}>Tax Calculator (HMRC 2024/25)</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>💵</Text>
              <Text style={[styles.featureText, { color: colors.text }]}>VAT Calculator</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>🚗</Text>
              <Text style={[styles.featureText, { color: colors.text }]}>Mileage Tracker (45p/mile)</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>📊</Text>
              <Text style={[styles.featureText, { color: colors.text }]}>Reports & Analytics</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>📤</Text>
              <Text style={[styles.featureText, { color: colors.text }]}>Data Export (CSV)</Text>
            </View>
          </View>
        </View>

        {/* Tax Regions */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Supported Tax Regions</Text>
          <Text style={[styles.description, { color: colors.secondary }]}>
            • England & Northern Ireland{'\n'}
            • Scotland (Scottish tax bands){'\n'}
            • Wales (UK-wide bands)
          </Text>
        </View>

        {/* Links */}
        <View style={styles.linkSection}>
          <TouchableOpacity 
            style={[styles.linkButton, { backgroundColor: colors.primary }]}
            onPress={() => Linking.openURL('https://tradetax.app')}
          >
            <Text style={styles.linkButtonText}>🌐 Website</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.linkButton, { backgroundColor: colors.primary }]}
            onPress={() => Linking.openURL('https://tradetax.app/privacy')}
          >
            <Text style={styles.linkButtonText}>🔒 Privacy Policy</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.linkButton, { backgroundColor: colors.primary }]}
            onPress={() => Linking.openURL('https://tradetax.app/terms')}
          >
            <Text style={styles.linkButtonText}>📜 Terms of Service</Text>
          </TouchableOpacity>
        </View>

        {/* Developer */}
        <View style={styles.developerSection}>
          <Text style={[styles.developerTitle, { color: colors.secondary }]}>Developed by</Text>
          <Text style={[styles.developerName, { color: colors.text }]}>MiniMarv</Text>
        </View>

        {/* Copyright */}
        <Text style={[styles.copyright, { color: colors.secondary }]}>
          © 2026 TradeTax. All rights reserved.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 10,
    width: 50,
  },
  backButtonText: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 50,
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
  },
  appInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  appIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appIconText: {
    fontSize: 36,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  version: {
    fontSize: 14,
    marginTop: 4,
  },
  section: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
  },
  featureList: {
    marginTop: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIcon: {
    fontSize: 18,
    width: 28,
  },
  featureText: {
    fontSize: 14,
    marginLeft: 8,
  },
  linkSection: {
    marginTop: 8,
  },
  linkButton: {
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  linkButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  developerSection: {
    alignItems: 'center',
    marginTop: 24,
  },
  developerTitle: {
    fontSize: 12,
  },
  developerName: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  copyright: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
});
