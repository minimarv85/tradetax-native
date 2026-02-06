import React, { useState, useEffect, createContext, useContext } from 'react';
import { NavigationContainer, CommonActions } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';
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

// Professional corporate colour scheme - Sage Green
const lightTheme = {
  background: '#FAFAFA',
  card: '#FFFFFF',
  text: '#1E293B',
  primary: '#5C7A5C',
  secondary: '#64748B',
  accent: '#FACC15',
  success: '#059669',
  danger: '#DC2626',
  border: '#E2E8F0',
  quickAction: '#6B8E6B',
  headerBackground: '#FFFFFF',
  headerText: '#5C7A5C',
  netProfit: '#1E3A5F',
};

const darkTheme = {
  background: '#0F172A',
  card: '#1E293B',
  text: '#F1F5F9',
  primary: '#7D9B76',
  secondary: '#94A3B8',
  accent: '#FACC15',
  success: '#10B981',
  danger: '#EF4444',
  border: '#334155',
  quickAction: 'rgba(123, 155, 118, 0.85)',
  headerBackground: '#1E293B',
  headerText: '#7D9B76',
  netProfit: '#60A5FA',
};

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('dark');
  const navigationRef = React.createRef();

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

  const resetNavigation = (routeName) => {
    navigationRef.current.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: routeName }],
      })
    );
  };

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
    <AuthContext.Provider value={{ session, theme, colors, toggleTheme, resetNavigation }}>
      <NavigationContainer ref={navigationRef}>
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