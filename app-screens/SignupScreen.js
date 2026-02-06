import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, Modal, TouchableWithoutFeedback, ScrollView } from 'react-native';
import { supabase } from '../app-lib/supabase';
import { AuthContext } from '../App';

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

const Dropdown = ({ label, selectedValue, options, onValueChange, containerStyle }) => {
  const [showModal, setShowModal] = useState(false);
  const selectedOption = options.find(opt => opt.value === selectedValue);

  return (
    <View style={containerStyle}>
      <Text style={[styles.label, { color: '#1F2937' }]}>{label}</Text>
      <TouchableOpacity 
        style={[styles.dropdown, { backgroundColor: '#E5E7EB', borderColor: '#D1D5DB' }]}
        onPress={() => setShowModal(true)}
      >
        <Text style={[styles.dropdownText, { color: '#374151' }]}>{selectedOption?.label || 'Select...'}</Text>
        <Text style={styles.dropdownArrow}>â–¼</Text>
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
                  {option.value === selectedValue && <Text style={styles.checkmark}>âœ“</Text>}
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

export default function SignupScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [taxRegion, setTaxRegion] = useState('england');
  const [employmentStatus, setEmploymentStatus] = useState('self_employed');
  const [annualSalary, setAnnualSalary] = useState('');
  const [taxCode, setTaxCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!email || !password || !name) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      Alert.alert('Signup Failed', error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const salary = parseFloat(annualSalary) || 0;
      
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{ 
          id: data.user.id, 
          email: email,
          full_name: name,
          tax_region: taxRegion,
          employment_status: employmentStatus,
          annual_salary: salary,
          tax_code: taxCode || null,
          created_at: new Date().toISOString()
        }]);

      if (profileError) {
        console.log('Profile creation error:', profileError);
      }
    }

    Alert.alert(
      'Account Created!',
      'Please check your email to confirm your account.',
      [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
    );
    
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join TradeTax today</Text>

          <View style={styles.card}>
            <Text style={[styles.label, { color: '#1F2937' }]}>Full Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#F9FAFB', color: '#1F2937', borderColor: '#D1D5DB' }]}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={[styles.label, { color: '#1F2937' }]}>Email *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#F9FAFB', color: '#1F2937', borderColor: '#D1D5DB' }]}
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={[styles.label, { color: '#1F2937' }]}>Password *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#F9FAFB', color: '#1F2937', borderColor: '#D1D5DB' }]}
              value={password}
              onChangeText={setPassword}
              placeholder="Create password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
            />

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>Tax Information</Text>

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
                <Text style={[styles.label, { color: '#1F2937' }]}>Annual Salary (Â£)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: '#F9FAFB', color: '#1F2937', borderColor: '#D1D5DB' }]}
                  value={annualSalary}
                  onChangeText={setAnnualSalary}
                  placeholder="0.00"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                />

                <Text style={[styles.label, { color: '#1F2937' }]}>Tax Code (optional)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: '#F9FAFB', color: '#1F2937', borderColor: '#D1D5DB' }]}
                  value={taxCode}
                  onChangeText={setTaxCode}
                  placeholder="e.g., 1257L"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="characters"
                />
              </>
            )}

            <TouchableOpacity 
              style={[styles.button, { backgroundColor: '#3B82F6' }]}
              onPress={handleSignup}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Creating...' : 'Create Account'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.linkButton}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={[styles.linkText, { color: '#3B82F6' }]}>
                Already have an account? Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    color: '#6B7280',
  },
  card: {
    borderRadius: 16,
    padding: 24,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
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
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1F2937',
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
    marginTop: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
  },
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
});
