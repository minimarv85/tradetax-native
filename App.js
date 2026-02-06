import React, { useState, useEffect, createContext, useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View, StyleSheet, Text, Appearance } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { supabase } from './app-lib/supabase';

// Screens
import LoginScreen from './app-screens/LoginScreen';
import SignupScreen from './app-screens/SignupScreen';
import HomeScreen from './app-screens/HomeScreen';
import IncomeScreen from './app-screens/IncomeScreen';
import ExpensesScreen from './app-screens/ExpensesScreen';
import ReceiptScannerScreen from './app-screens/ReceiptScannerScreen';
import InvoiceScreen from './app-screens/InvoiceScreen';
import VATScreen from './app-screens/VATScreen';
import MileageScreen from './app-screens/MileageScreen';
import TaxCalcScreen from './app-screens/TaxCalcScreen';
import ReportsScreen from './app-screens/ReportsScreen';
import SettingsScreen from './app-screens/SettingsScreen';

const Stack = createStackNavigator();
export const AuthContext = createContext(null);

// Theme colors
const lightTheme = {
  background: '#FFFFFF',
  card: '#F3F4F6',
  text: '#1F2937',
  primary: '#3B82F6',
  secondary: '#6B7280',
  accent: '#F59E0B',
  success: '#10B981',
  danger: '#EF4444',
  border: '#E5E7EB',
};

const darkTheme = {
  background: '#111827',
  card: '#1F2937',
  text: '#F9FAFB',
  primary: '#3B82F6',
  secondary: '#9CA3AF',
  accent: '#FACC15',
  success: '#10B981',
  danger: '#EF4444',
  border: '#374151',
};

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    // Get theme preference
    SecureStore.getItemAsync('theme').then(savedTheme => {
      if (savedTheme) setTheme(savedTheme);
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    SecureStore.setItemAsync('theme', newTheme);
  };

  const colors = theme === 'dark' ? darkTheme : lightTheme;

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading TradeTax...</Text>
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ session, theme, colors, toggleTheme }}>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: colors.primary },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: { fontWeight: 'bold' },
            cardStyle: { backgroundColor: colors.background },
          }}
        >
          {!session ? (
            <>
              <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
              <Stack.Screen name="Signup" component={SignupScreen} options={{ headerShown: false }} />
            </>
          ) : (
            <>
              <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'TradeTax' }} />
              <Stack.Screen name="Income" component={IncomeScreen} options={{ title: 'Income' }} />
              <Stack.Screen name="Expenses" component={ExpensesScreen} options={{ title: 'Expenses' }} />
              <Stack.Screen name="Receipt" component={ReceiptScannerScreen} options={{ title: 'Receipt Scanner' }} />
              <Stack.Screen name="Invoice" component={InvoiceScreen} options={{ title: 'Create Invoice' }} />
              <Stack.Screen name="VAT" component={VATScreen} options={{ title: 'VAT Calculator' }} />
              <Stack.Screen name="Mileage" component={MileageScreen} options={{ title: 'Mileage Tracker' }} />
              <Stack.Screen name="TaxCalc" component={TaxCalcScreen} options={{ title: 'Tax Calculator' }} />
              <Stack.Screen name="Reports" component={ReportsScreen} options={{ title: 'Reports' }} />
              <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </AuthContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
  },
});
