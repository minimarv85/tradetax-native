import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, Picker } from 'react-native';
import { supabase } from '../app-lib/supabase';
import { AuthContext } from '../App';

export default function SignupScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [taxRegion, setTaxRegion] = useState('england');
  const [employmentStatus, setEmploymentStatus] = useState('self_employed');
  const [annualSalary, setAnnualSalary] = useState('');
  const [taxCode, setTaxCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { colors } = useContext(AuthContext);

  const handleSignup = async () => {
    if (!email || !password || !name) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    
    // Sign up
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      Alert.alert('Signup Failed', error.message);
      setLoading(false);
      return;
    }

    // Create profile with tax settings
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
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
        <Text style={[styles.subtitle, { color: colors.secondary }]}>Join TradeTax today</Text>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.text }]}>Full Name *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={colors.secondary}
          />

          <Text style={[styles.label, { color: colors.text }]}>Email *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            placeholderTextColor={colors.secondary}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={[styles.label, { color: colors.text }]}>Password *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            value={password}
            onChangeText={setPassword}
            placeholder="Create password"
            placeholderTextColor={colors.secondary}
            secureTextEntry
          />

          <View style={styles.divider} />

          <Text style={[styles.sectionTitle, { color: colors.text }]}>Tax Information</Text>

          <Text style={[styles.label, { color: colors.text }]}>Tax Region</Text>
          <View style={[styles.pickerContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Picker
              selectedValue={taxRegion}
              onValueChange={(itemValue) => setTaxRegion(itemValue)}
              style={{ flex: 1, color: colors.text }}
            >
              <Picker.Item label="England & Northern Ireland" value="england" />
              <Picker.Item label="Scotland" value="scotland" />
              <Picker.Item label="Wales" value="wales" />
            </Picker>
          </View>

          <Text style={[styles.infoText, { color: colors.secondary }]}>
            Scotland has different income tax bands
          </Text>

          <Text style={[styles.label, { color: colors.text }]}>Employment Status</Text>
          <View style={[styles.pickerContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Picker
              selectedValue={employmentStatus}
              onValueChange={(itemValue) => setEmploymentStatus(itemValue)}
              style={{ flex: 1, color: colors.text }}
            >
              <Picker.Item label="Self-employed only" value="self_employed" />
              <Picker.Item label="Employed + Self-employed" value="employed_self" />
              <Picker.Item label="Full-time employed only" value="employed" />
            </Picker>
          </View>

          {employmentStatus !== 'self_employed' && (
            <>
              <Text style={[styles.label, { color: colors.text }]}>Annual Salary (£)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={annualSalary}
                onChangeText={setAnnualSalary}
                placeholder="0.00"
                placeholderTextColor={colors.secondary}
                keyboardType="decimal-pad"
              />

              <Text style={[styles.label, { color: colors.text }]}>Tax Code (optional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={taxCode}
                onChangeText={setTaxCode}
                placeholder="e.g., 1257L"
                placeholderTextColor={colors.secondary}
                autoCapitalize="characters"
              />
            </>
          )}

          <TouchableOpacity 
            style={[styles.button, { backgroundColor: colors.primary }]}
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
            <Text style={[styles.linkText, { color: colors.primary }]}>
              Already have an account? Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
  },
  card: {
    borderRadius: 16,
    padding: 24,
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
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
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
  },
  infoText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 12,
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
});
