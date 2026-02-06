import React, { useState, useContext } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { AuthContext } from '../App';
import { supabase } from '../app-lib/supabase';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export default function ExportScreen({ navigation }) {
  const { session, colors } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);

  const exportToCSV = async () => {
    if (!session?.user?.id) return;

    setLoading(true);

    try {
      // Fetch all transactions
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', session.user.id)
        .order('date', { ascending: false });

      if (error) {
        throw error;
      }

      if (!transactions || transactions.length === 0) {
        Alert.alert('No Data', 'You have no transactions to export.');
        setLoading(false);
        return;
      }

      // Create CSV content
      let csvContent = 'Date,Type,Description,Category,Amount\n';
      
      transactions.forEach(t => {
        const date = new Date(t.date).toLocaleDateString('en-GB');
        const type = t.type;
        const description = `"${(t.description || '').replace(/"/g, '""')}"`;
        const category = `"${(t.category || '').replace(/"/g, '""')}"`;
        const amount = t.amount;
        csvContent += `${date},${type},${description},${category},${amount}\n`;
      });

      // Add summary
      const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const totalExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const netProfit = totalIncome - totalExpenses;

      csvContent += '\n\nSUMMARY\n';
      csvContent += `Total Income,${totalIncome.toFixed(2)}\n`;
      csvContent += `Total Expenses,${totalExpenses.toFixed(2)}\n`;
      csvContent += `Net Profit,${netProfit.toFixed(2)}\n`;
      csvContent += `\nExported on,${new Date().toLocaleDateString('en-GB')}\n`;

      // Save to file
      const fileName = `tradetax_export_${new Date().toISOString().split('T')[0]}.csv`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(filePath, csvContent);

      // Share the file
      await Sharing.shareAsync(filePath);

      Alert.alert('Success', 'Your data has been exported successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to export data. Please try again.');
      console.log('Export error:', error);
    }

    setLoading(false);
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
        <Text style={styles.headerTitle}>Export Data</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.infoIcon, { color: colors.primary }]}>📤</Text>
          <Text style={[styles.infoTitle, { color: colors.text }]}>Export Your Data</Text>
          <Text style={[styles.infoDescription, { color: colors.secondary }]}>
            Download all your transactions as a CSV file. You can open it in Excel, Google Sheets, or any spreadsheet app.
          </Text>
        </View>

        {/* What's Included */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>What's Included</Text>
          <View style={styles.bulletList}>
            <Text style={[styles.bulletItem, { color: colors.secondary }]}>• All income transactions</Text>
            <Text style={[styles.bulletItem, { color: colors.secondary }]}>• All expense transactions</Text>
            <Text style={[styles.bulletItem, { color: colors.secondary }]}>• Categories and descriptions</Text>
            <Text style={[styles.bulletItem, { color: colors.secondary }]}>• Date of each transaction</Text>
            <Text style={[styles.bulletItem, { color: colors.secondary }]}>• Summary totals</Text>
          </View>
        </View>

        {/* Export Button */}
        <TouchableOpacity 
          style={[styles.exportButton, { backgroundColor: colors.primary }]}
          onPress={exportToCSV}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.exportIcon}>📊</Text>
              <Text style={styles.exportText}>Export as CSV</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Security Note */}
        <View style={styles.securityNote}>
          <Text style={[styles.securityIcon, { color: colors.success }]}>🔒</Text>
          <Text style={[styles.securityText, { color: colors.secondary }]}>
            Your data is exported directly to your device. No servers involved.
          </Text>
        </View>

        {/* Format Info */}
        <View style={[styles.formatCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.formatTitle, { color: colors.text }]}>File Format</Text>
          <Text style={[styles.formatText, { color: colors.secondary }]}>
            CSV (Comma Separated Values){'\n'}
            Compatible with: Microsoft Excel, Google Sheets, Apple Numbers, LibreOffice
          </Text>
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
  },
  infoCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  infoIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  bulletList: {
    marginTop: 8,
  },
  bulletItem: {
    fontSize: 14,
    marginBottom: 6,
    lineHeight: 20,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    padding: 18,
    marginTop: 8,
  },
  exportIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  exportText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  securityIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  securityText: {
    fontSize: 12,
    textAlign: 'center',
    flex: 1,
  },
  formatCard: {
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
  },
  formatTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  formatText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
