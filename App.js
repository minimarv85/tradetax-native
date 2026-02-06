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
import HelpSupportScreen from './app-screens/HelpSupportScreen';
import AboutScreen from './app-screens/AboutScreen';
import ExportScreen from './app-screens/ExportScreen';

const Stack = createStackNavigator();
export const AuthContext = createContext(null);

// Clean, polished colour scheme
const lightTheme = {
  background: '#FFFFFF',
  card: '#F5F5F5',
  text: '#1A1A1A',
  primary: '#2563EB',
  secondary: '#6B7280',
  accent: '#F59E0B',
  success: '#059669',
  danger: '#DC2626',
  border: '#E5E5E5',
};

const darkTheme = {
  background: '#0A0A0A',
  card: '#1A1A1A',
  text: '#FFFFFF',
  primary: '#3B82F6',
  secondary: '#9CA3AF',
  accent: '#FACC15',
  success: '#10B981',
  danger: '#EF4444',
  border: '#262626',
};

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    SecureStore.getItemAsync('theme').then(savedTheme => {
      if (savedTheme) setTheme(savedTheme);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

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
        <Text style={[styles.loadingText, { color: colors.text }]}>TradeTax</Text>
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
              <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'TradeTax', headerShown: false }} />
              <Stack.Screen name="Income" component={IncomeScreen} options={{ title: 'Income' }} />
              <Stack.Screen name="Expenses" component={ExpensesScreen} options={{ title: 'Expenses' }} />
              <Stack.Screen name="Receipt" component={ReceiptScannerScreen} options={{ title: 'Receipt Scanner' }} />
              <Stack.Screen name="Invoice" component={InvoiceScreen} options={{ title: 'Create Invoice' }} />
              <Stack.Screen name="VAT" component={VATScreen} options={{ title: 'VAT Calculator' }} />
              <Stack.Screen name="Mileage" component={MileageScreen} options={{ title: 'Mileage Tracker' }} />
              <Stack.Screen name="TaxCalc" component={TaxCalcScreen} options={{ title: 'Tax Calculator' }} />
              <Stack.Screen name="Reports" component={ReportsScreen} options={{ title: 'Reports' }} />
              <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
              <Stack.Screen name="HelpSupport" component={HelpSupportScreen} options={{ title: 'Help & Support' }} />
              <Stack.Screen name="About" component={AboutScreen} options={{ title: 'About' }} />
              <Stack.Screen name="Export" component={ExportScreen} options={{ title: 'Export Data' }} />
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
    fontWeight: '600',
  },
});
