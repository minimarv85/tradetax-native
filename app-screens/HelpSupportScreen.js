import React, { useState, useContext } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { AuthContext } from '../App';
import { clearSession } from '../app-lib/auth';

const FAQItem = ({ question, answer }) => {
  const [expanded, setExpanded] = useState(false);
  const { colors } = useContext(AuthContext);

  return (
    <View style={[styles.faqItem, { backgroundColor: colors.card }]}>
      <TouchableOpacity 
        style={styles.faqQuestion}
        onPress={() => setExpanded(!expanded)}
      >
        <Text style={[styles.faqQuestionText, { color: colors.text }]}>{question}</Text>
        <Text style={[styles.faqIcon, { color: colors.primary }]}>{expanded ? '−' : '+'}</Text>
      </TouchableOpacity>
      {expanded && (
        <Text style={[styles.faqAnswer, { color: colors.secondary }]}>{answer}</Text>
      )}
    </View>
  );
};

export default function HelpSupportScreen({ navigation }) {
  const { colors, resetNavigation } = useContext(AuthContext);

  const handleContactSupport = () => {
    Alert.alert(
      'Contact Support',
      'Choose how to get help',
      [
        { text: 'Email', onPress: () => Linking.openURL('mailto:support@tradetax.app') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            await clearSession();
            resetNavigation('Login');
          }
        },
      ]
    );
  };

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
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* FAQ Section */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Frequently Asked Questions</Text>
        
        <FAQItem 
          question="How do I add income?"
          answer="Go to the Dashboard and tap the '+ Income' button. Enter the amount, description, date, and category."
        />
        
        <FAQItem 
          question="How do I record expenses?"
          answer="Tap the '+ Expense' button on the Dashboard. Fill in the details including amount, description, and category."
        />
        
        <FAQItem 
          question="Can I scan receipts?"
          answer="Yes! Tap the 'Scan' button to use your camera. You can also manually enter receipt details."
        />
        
        <FAQItem 
          question="How does the tax calculator work?"
          answer="The tax calculator uses official HMRC 2024/25 rates. It accounts for your tax region (England/Scotland) and employment status."
        />
        
        <FAQItem 
          question="Is my data secure?"
          answer="Yes! We use bank-grade encryption and secure storage. Your data is stored in Supabase with industry-standard security."
        />
        
        <FAQItem 
          question="Can I export my data?"
          answer="Yes! Open the menu and select 'Export Data' to download your transactions as a CSV file."
        />
        
        <FAQItem 
          question="What is the VAT calculator for?"
          answer="Calculate VAT amounts and create VAT-compliant invoices for your clients."
        />
        
        <FAQItem 
          question="How do I track mileage?"
          answer="Use the Mileage feature to log business trips. The app calculates deductions at 45p per mile."
        />

        {/* Contact Section */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Need More Help?</Text>
        
        <TouchableOpacity 
          style={[styles.contactCard, { backgroundColor: colors.primary }]}
          onPress={handleContactSupport}
        >
          <Text style={styles.contactIcon}>💬</Text>
          <Text style={styles.contactText}>Chat with Support</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.contactCard, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
          onPress={() => Linking.openURL('https://tradetax.app/help')}
        >
          <Text style={[styles.contactIcon, { color: colors.text }]}>📚</Text>
          <Text style={[styles.contactText, { color: colors.text }]}>View Documentation</Text>
        </TouchableOpacity>

        {/* Quick Links */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Quick Links</Text>
        
        <View style={styles.quickLinks}>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
            <Text style={[styles.quickLink, { color: colors.primary }]}>→ Account Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Reports')}>
            <Text style={[styles.quickLink, { color: colors.primary }]}>→ View Reports</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('TaxCalc')}>
            <Text style={[styles.quickLink, { color: colors.primary }]}>→ Tax Calculator</Text>
          </TouchableOpacity>
        </View>

        {/* Version */}
        <Text style={[styles.version, { color: colors.secondary }]}>TradeTax v1.0.0</Text>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  faqItem: {
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  faqQuestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  faqQuestionText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    paddingRight: 12,
  },
  faqIcon: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  faqAnswer: {
    fontSize: 14,
    paddingHorizontal: 16,
    paddingBottom: 16,
    lineHeight: 20,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
  },
  contactIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  contactText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  quickLinks: {
    marginTop: 8,
  },
  quickLink: {
    fontSize: 15,
    paddingVertical: 10,
  },
  version: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
});
