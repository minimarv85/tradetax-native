import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../app-lib/supabase';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    SecureStore.getItemAsync('theme').then(savedTheme => {
      if (savedTheme) setTheme(savedTheme);
    });
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    const refreshToken = await SecureStore.getItemAsync('refreshToken');
    if (refreshToken) {
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });
      
      if (!error && data.session) {
        navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
      } else {
        await SecureStore.deleteItemAsync('refreshToken');
      }
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      Alert.alert('Login Failed', error.message);
      setLoading(false);
      return;
    }

    if (rememberMe && data.session?.refresh_token) {
      await SecureStore.setItemAsync('refreshToken', data.session.refresh_token);
      await SecureStore.setItemAsync('rememberMe', 'true');
    }

    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    setLoading(false);
  };

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#0F172A' : '#FFFFFF';
  const cardBg = isDark ? '#1E293B' : '#FFFFFF';
  const textColor = isDark ? '#F1F5F9' : '#1E293B';
  const secondaryColor = isDark ? '#94A3B8' : '#64748B';
  const borderColor = isDark ? '#334155' : '#E2E8F0';
  const primaryColor = isDark ? '#7D9B76' : '#5C7A5C';

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: bgColor }]}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: textColor }]}>TradeTax</Text>
        <Text style={[styles.subtitle, { color: secondaryColor }]}>UK Sole Trader Tax Tracker</Text>

        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <Text style={[styles.label, { color: textColor }]}>Email</Text>
          <TextInput
            style={[styles.input, { backgroundColor: isDark ? '#1E293B' : '#F3F4F6', color: textColor, borderColor: borderColor }]}
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            placeholderTextColor={secondaryColor}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={[styles.label, { color: textColor }]}>Password</Text>
          <TextInput
            style={[styles.input, { backgroundColor: isDark ? '#1E293B' : '#F3F4F6', color: textColor, borderColor: borderColor }]}
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            placeholderTextColor={secondaryColor}
            secureTextEntry
          />

          <View style={styles.rememberMeContainer}>
            <View style={styles.switchContainer}>
              <Switch
                value={rememberMe}
                onValueChange={setRememberMe}
                trackColor={{ false: '#767577', true: '#4CAF50' }}
                thumbColor={rememberMe ? '#fff' : '#f4f3f4'}
              />
              <Text style={[styles.rememberMeText, { color: textColor }]}>
                Remember Me
              </Text>
            </View>
            <Text style={[styles.rememberMeSubtext, { color: secondaryColor }]}>
              Stays logged in securely
            </Text>
          </View>

          <TouchableOpacity 
            style={[styles.button, { backgroundColor: primaryColor }]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.linkButton}
            onPress={() => navigation.navigate('Signup')}
          >
            <Text style={[styles.linkText, { color: primaryColor }]}>
              Don't have an account? Sign Up
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.securityInfo}>
          <Text style={[styles.securityIcon, { color: primaryColor }]}>🔒</Text>
          <Text style={[styles.securityText, { color: secondaryColor }]}>
            End-to-end encryption with secure enclave storage.
          </Text>
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
    fontSize: 36,
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
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  rememberMeContainer: {
    flexDirection: 'column',
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 8,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rememberMeText: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 12,
  },
  rememberMeSubtext: {
    fontSize: 12,
    marginLeft: 44,
    marginTop: 2,
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
  linkButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  securityIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  securityText: {
    fontSize: 12,
    textAlign: 'center',
  },
});
