import React, { useState, useContext, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { AuthContext } from '../App';
import { supabase } from '../app-lib/supabase';

export default function ReportsScreen({ navigation }) {
  const authContext = useContext(AuthContext);
  const { session, colors } = authContext || {};
  const [transactions, setTransactions] = useState([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState({ income: {}, expenses: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    if (!session?.user?.id) return;

    setLoading(true);
    
    const { data: allTransactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', session.user.id)
      .order('date', { ascending: false });

    if (allTransactions) {
      setTransactions(allTransactions);
      
      // Calculate category breakdown
      const incomeCats = {};
      const expenseCats = {};
      
      allTransactions.forEach(t => {
        const amount = parseFloat(t.amount) || 0;
        const cat = t.category || 'Uncategorized';
        
        if (t.type === 'income') {
          incomeCats[cat] = (incomeCats[cat] || 0) + amount;
        } else {
          expenseCats[cat] = (expenseCats[cat] || 0) + amount;
        }
      });
      
      setCategoryBreakdown({ income: incomeCats, expenses: expenseCats });
    }
    
    setLoading(false);
  };

  const formatCurrency = (amount) => {
    return '£' + parseFloat(amount || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const calculateTotal = (cats) => Object.values(cats).reduce((sum, val) => sum + val, 0);

  const renderCategoryItem = (type, cat, amount, total) => {
    const percentage = total > 0 ? (amount / total) * 100 : 0;
    return (
      <View key={cat} style={styles.categoryRow}>
        <View style={styles.categoryInfo}>
          <Text style={[styles.categoryName, { color: colors.text }]}>{cat}</Text>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${percentage}%`,
                  backgroundColor: type === 'income' ? '#10B981' : '#EF4444' 
                }
              ]} 
            />
          </View>
        </View>
        <Text style={[styles.categoryAmount, { color: type === 'income' ? '#10B981' : '#EF4444' }]}>
          {formatCurrency(amount)}
        </Text>
      </View>
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Reports</Text>

        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, { backgroundColor: colors.success }]}>
            <Text style={styles.summaryLabel}>Total Income</Text>
            <Text style={styles.summaryValue}>{formatCurrency(calculateTotal(categoryBreakdown.income))}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.danger }]}>
            <Text style={styles.summaryLabel}>Total Expenses</Text>
            <Text style={styles.summaryValue}>{formatCurrency(calculateTotal(categoryBreakdown.expenses))}</Text>
          </View>
        </View>

        <View style={[styles.netCard, { backgroundColor: colors.primary }]}>
          <Text style={styles.netLabel}>Net Profit</Text>
          <Text style={styles.netValue}>
            {formatCurrency(calculateTotal(categoryBreakdown.income) - calculateTotal(categoryBreakdown.expenses))}
          </Text>
        </View>

        {/* Income Breakdown */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Income by Category</Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          {Object.keys(categoryBreakdown.income).length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.secondary }]}>No income recorded</Text>
          ) : (
            Object.entries(categoryBreakdown.income).map(([cat, amount]) => 
              renderCategoryItem('income', cat, amount, calculateTotal(categoryBreakdown.income))
            )
          )}
        </View>

        {/* Expenses Breakdown */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Expenses by Category</Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          {Object.keys(categoryBreakdown.expenses).length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.secondary }]}>No expenses recorded</Text>
          ) : (
            Object.entries(categoryBreakdown.expenses).map(([cat, amount]) => 
              renderCategoryItem('expenses', cat, amount, calculateTotal(categoryBreakdown.expenses))
            )
          )}
        </View>

        {/* Tax Summary */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Tax Summary</Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.taxRow}>
            <Text style={[styles.taxLabel, { color: colors.secondary }]}>Taxable Profit</Text>
            <Text style={[styles.taxValue, { color: colors.text }]}>
              {formatCurrency(Math.max(0, calculateTotal(categoryBreakdown.income) - calculateTotal(categoryBreakdown.expenses)))}
            </Text>
          </View>
          <View style={styles.taxRow}>
            <Text style={[styles.taxLabel, { color: colors.secondary }]}>Estimated Tax (20%)</Text>
            <Text style={[styles.taxValue, { color: colors.accent }]}>
              -£{formatCurrency(Math.max(0, (calculateTotal(categoryBreakdown.income) - calculateTotal(categoryBreakdown.expenses)) * 0.2))}
            </Text>
          </View>
        </View>

        {/* Recent Transactions */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>All Transactions</Text>
        {transactions.slice(0, 20).map((t) => (
          <View key={t.id} style={[styles.transactionCard, { backgroundColor: colors.card }]}>
            <View style={styles.transactionInfo}>
              <Text style={[styles.transactionDesc, { color: colors.text }]}>{t.description}</Text>
              <Text style={[styles.transactionMeta, { color: colors.secondary }]}>
                {t.category} • {new Date(t.date).toLocaleDateString('en-GB')}
              </Text>
            </View>
            <Text style={[
              styles.transactionAmount,
              { color: t.type === 'income' ? colors.success : colors.danger }
            ]}>
              {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  summaryGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  summaryCard: { width: '48%', borderRadius: 12, padding: 16, alignItems: 'center' },
  summaryLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  summaryValue: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', marginTop: 4 },
  netCard: { borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 20 },
  netLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  netValue: { color: '#FFFFFF', fontSize: 28, fontWeight: 'bold', marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, marginTop: 8 },
  card: { borderRadius: 12, padding: 16, marginBottom: 16 },
  categoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  categoryInfo: { flex: 1, marginRight: 12 },
  categoryName: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  progressBar: { height: 6, borderRadius: 3 },
  progressFill: { height: 6, borderRadius: 3 },
  categoryAmount: { fontSize: 14, fontWeight: 'bold' },
  taxRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  taxLabel: { fontSize: 14 },
  taxValue: { fontSize: 14, fontWeight: '600' },
  transactionCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 12, padding: 12, marginBottom: 8 },
  transactionInfo: { flex: 1 },
  transactionDesc: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  transactionMeta: { fontSize: 12 },
  transactionAmount: { fontSize: 16, fontWeight: 'bold' },
  emptyText: { fontSize: 14, textAlign: 'center', padding: 10 },
});
