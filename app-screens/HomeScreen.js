import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Alert, Modal, TouchableWithoutFeedback } from 'react-native';
import { AuthContext } from '../App';
import { supabase } from '../app-lib/supabase';

// UK Tax Bands 2024/25 (England, Wales, NI)
const TAX_BANDS_UK = [
  { name: 'Personal Allowance', rate: 0, max: 12570 },
  { name: 'Basic Rate (20%)', rate: 0.2, max: 50270 },
  { name: 'Higher Rate (40%)', rate: 0.4, max: 125140 },
  { name: 'Additional Rate (45%)', rate: 0.45, max: null },
];

// Scottish Tax Bands 2024/25
const TAX_BANDS_SCOTLAND = [
  { name: 'Starter Rate (19%)', rate: 0.19, max: 14732 },
  { name: 'Scottish Basic (20%)', rate: 0.2, max: 25656 },
  { name: 'Scottish Intermediate (21%)', rate: 0.21, max: 43662 },
  { name: 'Scottish Higher (42%)', rate: 0.42, max: 125140 },
  { name: 'Scottish Top (48%)', rate: 0.48, max: null },
];

// Calculate UK tax based on region and salary
const calculateUKTax = (income, expenses, taxRegion, employmentStatus, annualSalary) => {
  const profit = Math.max(0, income - expenses);
  
  const taxBands = taxRegion === 'scotland' ? TAX_BANDS_SCOTLAND : TAX_BANDS_UK;
  
  let personalAllowance = 12570;
  if (employmentStatus === 'employed_self' || employmentStatus === 'employed') {
    personalAllowance = Math.max(0, 12570 - (annualSalary * 0.1));
  }
  
  let remainingProfit = profit;
  let totalTax = 0;
  let previousMax = 0;

  taxBands.forEach((band) => {
    if (remainingProfit <= 0) return;
    
    const bandWidth = band.max ? (band.max - previousMax) : Infinity;
    const taxableInBand = Math.min(remainingProfit, bandWidth);
    
    let taxableAmount = taxableInBand;
    if (band.rate === 0 && personalAllowance > 0) {
      taxableAmount = Math.min(taxableInBand, personalAllowance);
      remainingProfit = Math.max(0, remainingProfit - personalAllowance);
    }
    
    if (taxableAmount > 0) {
      totalTax += taxableAmount * band.rate;
      remainingProfit -= taxableAmount;
      previousMax = band.max || bandWidth + previousMax;
    }
  });

  return { profit, tax: totalTax };
};

export default function HomeScreen({ navigation }) {
  const { session, colors, toggleTheme } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('User');
  const [menuVisible, setMenuVisible] = useState(false);
  const [userSettings, setUserSettings] = useState({
    taxRegion: 'england',
    employmentStatus: 'self_employed',
    annualSalary: 0,
  });
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    netProfit: 0,
    estimatedTax: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState([]);

  const fetchData = async () => {
    if (!session?.user?.id) return;

    setLoading(true);
    
    try {
      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, tax_region, employment_status, annual_salary')
        .eq('id', session.user.id)
        .single();
      
      if (profileError) {
        console.log('Profile error:', profileError);
      }
      
      // Set user name from full_name or email - prioritize full_name
      let name = 'User';
      if (profile?.full_name && profile.full_name.trim() !== '') {
        name = profile.full_name.split(' ')[0];
      } else if (session?.user?.email) {
        name = session.user.email.split('@')[0];
      }
      setUserName(name);
      
      // Store user settings
      if (profile) {
        setUserSettings({
          taxRegion: profile.tax_region || 'england',
          employmentStatus: profile.employment_status || 'self_employed',
          annualSalary: profile.annual_salary || 0,
        });
      }
      
      // Get transactions
      const { data: transactions, error: transError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', session.user.id)
        .order('date', {ascending: false})
        .limit(10);

      if (transError) {
        console.log('Transactions error:', transError);
        setRecentTransactions([]);
      } else if (transactions) {
        let income = 0, expenses = 0;
        transactions.forEach(t => {
          if (t.type === 'income') income += parseFloat(t.amount);
          else expenses += parseFloat(t.amount);
        });
        
        const { profit, tax } = calculateUKTax(
          income, 
          expenses, 
          profile?.tax_region || 'england',
          profile?.employment_status || 'self_employed',
          profile?.annual_salary || 0
        );
        
        setStats({
          totalIncome: income,
          totalExpenses: expenses,
          netProfit: profit,
          estimatedTax: tax,
        });
        setRecentTransactions(transactions);
      }
    } catch (err) {
      console.log('Fetch data error:', err);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchData();
    });
    return unsubscribe;
  }, [session]);

  const formatCurrency = (amount) => {
    return '£' + parseFloat(amount || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const menuItems = [
    { label: 'Dashboard', onPress: () => { setMenuVisible(false); } },
    { label: 'Profile Settings', onPress: () => { setMenuVisible(false); navigation.navigate('Settings'); } },
    { label: 'Reports', onPress: () => { setMenuVisible(false); navigation.navigate('Reports'); } },
    { label: 'Export Data', onPress: () => { setMenuVisible(false); } },
    { label: 'Help & Support', onPress: () => { setMenuVisible(false); } },
    { label: 'About', onPress: () => { setMenuVisible(false); } },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header with Hamburger Menu */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity 
          style={styles.menuIcon}
          onPress={() => setMenuVisible(true)}
        >
          <Text style={styles.menuIconText}>☰</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>TradeTax</Text>
        </View>
        <TouchableOpacity 
          style={styles.settingsIcon}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.settingsIconText}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Side Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.menuContent, { backgroundColor: colors.card }]}>
              <View style={[styles.menuHeader, { backgroundColor: colors.primary }]}>
                <Text style={styles.menuWelcome}>Welcome</Text>
                <Text style={styles.menuName}>{userName}</Text>
              </View>
              
              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.menuItem, { borderBottomColor: colors.border }]}
                  onPress={item.onPress}
                >
                  <Text style={[styles.menuItemText, { color: colors.text }]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchData} />
        }
      >
        <View style={styles.content}>
          {/* Welcome Header */}
          <View style={[styles.welcomeCard, { backgroundColor: colors.primary }]}>
            <Text style={styles.welcomeText}>Welcome Back{userName && userName !== 'User' ? ', ' + userName : ''}!</Text>
            <Text style={styles.subWelcomeText}>Here's your tax summary</Text>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.statLabel, { color: colors.secondary }]}>Total Income</Text>
              <Text style={[styles.statValue, { color: colors.success }]}>{formatCurrency(stats.totalIncome)}</Text>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.statLabel, { color: colors.secondary }]}>Expenses</Text>
              <Text style={[styles.statValue, { color: colors.danger }]}>{formatCurrency(stats.totalExpenses)}</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.statLabel, { color: colors.secondary }]}>Net Profit</Text>
              <Text style={[styles.statValue, { color: colors.primary }]}>{formatCurrency(stats.netProfit)}</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.statLabel, { color: colors.secondary }]}>Est. Tax</Text>
              <Text style={[styles.statValue, { color: colors.accent }]}>{formatCurrency(stats.estimatedTax)}</Text>
            </View>
          </View>

          {/* Quick Actions */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: colors.success }]}
              onPress={() => navigation.navigate('Income')}
            >
              <Text style={styles.actionText}>+ Income</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: colors.danger }]}
              onPress={() => navigation.navigate('Expenses')}
            >
              <Text style={styles.actionText}>+ Expense</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('Receipt')}
            >
              <Text style={styles.actionText}>📷 Scan</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#8B5CF6' }]}
              onPress={() => navigation.navigate('Invoice')}
            >
              <Text style={styles.actionText}>📄 Invoice</Text>
            </TouchableOpacity>
          </View>

          {/* More Features */}
          <View style={styles.actionGrid}>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#10B981' }]}
              onPress={() => navigation.navigate('VAT')}
            >
              <Text style={styles.actionText}>💰 VAT</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#F59E0B' }]}
              onPress={() => navigation.navigate('Mileage')}
            >
              <Text style={styles.actionText}>🚗 Mileage</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#FACC15' }]}
              onPress={() => navigation.navigate('TaxCalc')}
            >
              <Text style={[styles.actionText, { color: '#000000' }]}>🧮 Tax Calc</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#EC4899' }]}
              onPress={() => navigation.navigate('Reports')}
            >
              <Text style={styles.actionText}>📊 Reports</Text>
            </TouchableOpacity>
          </View>

          {/* Recent Transactions */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Transactions</Text>
          {recentTransactions.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.secondary }]}>No transactions yet. Add your first one!</Text>
          ) : (
            recentTransactions.map((item) => (
              <View key={item.id} style={[styles.transactionCard, { backgroundColor: colors.card }]}>
                <View style={styles.transactionInfo}>
                  <Text style={[styles.transactionDesc, { color: colors.text }]}>{item.description}</Text>
                  <Text style={[styles.transactionDate, { color: colors.secondary }]}>
                    {new Date(item.date).toLocaleDateString('en-GB')}
                  </Text>
                </View>
                <Text style={[
                  styles.transactionAmount,
                  { color: item.type === 'income' ? colors.success : colors.danger }
                ]}>
                  {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
                </Text>
              </View>
            ))
          )}

          {/* Logout */}
          <TouchableOpacity 
            style={[styles.logoutButton, { backgroundColor: colors.danger }]}
            onPress={() => supabase.auth.signOut()}
          >
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
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
  menuIcon: {
    padding: 10,
  },
  menuIconText: {
    fontSize: 28,
    color: '#FFFFFF',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  settingsIcon: {
    padding: 10,
  },
  settingsIconText: {
    fontSize: 28,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    flexDirection: 'row',
  },
  menuContent: {
    width: '75%',
    height: '100%',
    paddingTop: 60,
  },
  menuHeader: {
    padding: 20,
    marginBottom: 10,
  },
  menuWelcome: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  menuName: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 5,
  },
  menuItem: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: 0,
  },
  welcomeCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  welcomeText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  subWelcomeText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 8,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  actionButton: {
    width: '48%',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  transactionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDesc: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
  },
  logoutButton: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
