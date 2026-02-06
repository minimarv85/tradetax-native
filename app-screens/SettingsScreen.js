import React, { useState, useContext, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, TouchableWithoutFeedback, Modal } from 'react-native';
import { AuthContext } from '../App';
import { supabase } from '../app-lib/supabase';
import { clearSession } from '../app-lib/auth';

const Dropdown = ({ label, selectedValue, options, onValueChange, containerStyle }) => {
  const [showModal, setShowModal] = useState(false);
  const selectedOption = options.find(opt => opt.value === selectedValue);

  return (
    <View style={containerStyle}>
      <Text style={[styles.label, { color: '#1F2937' }]}>{label}</Text>
      <TouchableOpacity 
        style={[styles.dropdown, { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB' }]}
        onPress={() => setShowModal(true)}
      >
        <Text style={[styles.dropdownText, { color: '#374151' }]}>{selectedOption?.label || 'Select...'}</Text>
        <Text style={styles.dropdownArrow}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={[styles.modalTitle, { color: '#1F2937' }]}>{label}</Text>
              {options.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={styles.modalOption}
                  onPress={() => {
                    onValueChange(option.value);
                    setShowModal(false);
                  }}
                >
                  <Text style={[
                    styles.modalOptionText,
                    { color: option.value === selectedValue ? '#3B82F6' : '#374151' }
                  ]}>
                    {option.label}
                  </Text>
                  {option.value === selectedValue && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              ))}
              <TouchableOpacity 
                style={[styles.modalCancel, { backgroundColor: '#EF4444' }]}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const TAX_REGIONS = [
  { label: 'England & Northern Ireland', value: 'england' },
  { label: 'Scotland', value: 'scotland' },
  { label: 'Wales', value: 'wales' },
];

const EMPLOYMENT_STATUSES = [
  { label: 'Self-employed only', value: 'self_employed' },
  { label: 'Employed + Self-employed', value: 'employed_self' },
  { label: 'Full-time employed only', value: 'employed' },
];

export default function SettingsScreen({ navigation }) {
  const { session, colors } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [taxRegion, setTaxRegion] = useState('england');
  const [employmentStatus, setEmploymentStatus] = useState('self_employed');
  const [annualSalary, setAnnualSalary] = useState('');

  useEffect(() => {
    fetchProfile();
  }, [session]);

  const fetchProfile = async () => {
    if (!session?.user?.id) return;

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (data) {
      setFullName(data.full_name || '');
      setTaxRegion(data.tax_region || 'england');
      setEmploymentStatus(data.employment_status || 'self_employed');
      setAnnualSalary(data.annual_salary?.toString() || '');
    }
  };

  const handleSave = async () => {
    if (!session?.user?.id) return;

    setLoading(true);

    const updates = {
      id: session.user.id,
      email: session.user.email,
      full_name: fullName,
      tax_region: taxRegion,
      employment_status: employmentStatus,
      annual_salary: parseFloat(annualSalary) || 0,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('profiles')
      .upsert(updates);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', 'Settings saved!');
    }

    setLoading(false);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            await clearSession(); // Clear secure tokens
            // Navigate to login
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <Text style={[styles.label, { color: '#1F2937' }]}>Full Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: '#F3F4F6', color: '#1F2937', borderColor: '#D1D5DB' }]}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Your name"
            placeholderTextColor="#9CA3AF"
          />

          <Text style={[styles.label, { color: '#6B7280', fontSize: 12, marginTop: -8, marginBottom: 16 }]}>
            This name will appear on your welcome screen
          </Text>

          <Dropdown
            label="Tax Region"
            selectedValue={taxRegion}
            options={TAX_REGIONS}
            onValueChange={setTaxRegion}
            containerStyle={{ marginBottom: 16 }}
          />

          <Text style={[styles.infoText, { color: '#6B7280' }]}>
            Scotland has different income tax bands
          </Text>

          <Dropdown
            label="Employment Status"
            selectedValue={employmentStatus}
            options={EMPLOYMENT_STATUSES}
            onValueChange={setEmploymentStatus}
            containerStyle={{ marginBottom: 16 }}
          />

          {employmentStatus !== 'self_employed' && (
            <>
              <Text style={[styles.label, { color: '#1F2937' }]}>Annual Salary (£)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: '#F3F4F6', color: '#1F2937', borderColor: '#D1D5DB' }]}
                value={annualSalary}
                onChangeText={setAnnualSalary}
                placeholder="0.00"
                placeholderTextColor="#9CA3AF"
                keyboardType="decimal-pad"
              />
            </>
          )}

          <TouchableOpacity 
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Saving...' : 'Save Settings'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Account Info */}
        <View style={[styles.card, { marginTop: 16 }]}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Text style={[styles.label, { color: '#6B7280' }]}>Email</Text>
          <Text style={[styles.value, { color: '#1F2937' }]}>{session?.user?.email}</Text>
          
          <TouchableOpacity 
            style={[styles.logoutButton, { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]}
            onPress={handleLogout}
          >
            <Text style={[styles.logoutButtonText, { color: '#EF4444' }]}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={[styles.card, { marginTop: 16, marginBottom: 40 }]}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={[styles.label, { color: '#6B7280' }]}>Version</Text>
          <Text style={[styles.value, { color: '#1F2937' }]}>1.0.0</Text>
        </View>
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
    paddingTop: 10,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1F2937',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  value: {
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  dropdownText: {
    fontSize: 16,
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#6B7280',
  },
  infoText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 16,
  },
  button: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalOptionText: {
    fontSize: 16,
  },
  checkmark: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalCancel: {
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  modalCancelText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Logout button
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    marginTop: 16,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
