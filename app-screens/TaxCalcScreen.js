import React, { useState, useContext, useEffect, useCallback } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity, Alert, Share } from 'react-native';
import { AuthContext } from '../App';
import { supabase } from '../app-lib/supabase';

// UK Tax Bands 2024/25
const TAX_BANDS = [
  { name: 'Personal Allowance', rate: 0, max: 12570 },
  { name: 'Basic Rate (20%)', rate: 0.2, max: 50270 },
  { name: 'Higher Rate (40%)', rate: 0.4, max: 125140 },
  { name: 'Additional Rate (45%)', rate: 0.45, max: null },
];

// UK National Insurance 2024/25
const NIC_RATES = {
  class2: { rate: 3.45, threshold: 6725 }, // £3.45/week if profit over £6,725
  class4: { lowerRate: 0.09, lowerThreshold: 12570, upperThreshold: 50270, upperRate: 0.02 },
};

export default function TaxCalcScreen({ navigation }) {
  const { session, colors } = useContext(AuthContext);
  const [totalIncome, setTotalIncome] = useState('');
  const [totalExpenses, setTotalExpenses] = useState('');
  const [profit, setProfit] = useState(0);
  const [taxBreakdown, setTaxBreakdown] = useState([]);
  const [estimatedTax, setEstimatedTax] = useState(0);
  const [nicBreakdown, setNicBreakdown] = useState([]);
  const [totalNic, setTotalNic] = useState(0);
  const [afterTaxProfit, setAfterTaxProfit] = useState(0);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Calculate tax and NIC based on current inputs
  const calculateTaxAndNic = useCallback(() => {
    const income = parseFloat(totalIncome) || 0;
    const expenses = parseFloat(totalExpenses) || 0;
    const yearlyProfit = Math.max(0, income - expenses);
    
    setProfit(yearlyProfit);

    // Calculate income tax by bands (UK tax system)
    let remainingProfit = yearlyProfit;
    let totalTax = 0;
    let taxBreakdownArr = [];
    let previousMax = 0;

    TAX_BANDS.forEach((band) => {
      if (remainingProfit <= 0) return;
      
      const bandWidth = band.max ? (band.max - previousMax) : Infinity;
      const taxableInBand = Math.min(remainingProfit, bandWidth);
      
      if (taxableInBand > 0) {
        const tax = taxableInBand * band.rate;
        totalTax += tax;
        taxBreakdownArr.push({
          name: band.name,
          rate: band.rate * 100,
          amount: taxableInBand,
          tax: tax,
        });
        remainingProfit -= taxableInBand;
        previousMax = band.max || bandWidth + previousMax;
      }
    });

    setTaxBreakdown(taxBreakdownArr);
    setEstimatedTax(totalTax);

    // Calculate National Insurance
    let totalNicAmount = 0;
    let nicBreakdownArr = [];

    // Class 2 NIC: £3.45/week if profit over £6,725
    if (yearlyProfit >= NIC_RATES.class2.threshold) {
      const class2Amount = NIC_RATES.class2.rate * 52; // 52 weeks
      totalNicAmount += class2Amount;
      nicBreakdownArr.push({
        name: 'Class 2 NIC',
        description: '£3.45 × 52 weeks',
        amount: class2Amount,
      });
    }

    // Class 4 NIC
    if (yearlyProfit > NIC_RATES.class4.lowerThreshold) {
      const upperLimit = Math.min(yearlyProfit, NIC_RATES.class4.upperThreshold);
      const basicNic = (upperLimit - NIC_RATES.class4.lowerThreshold) * NIC_RATES.class4.lowerRate;
      totalNicAmount += basicNic;
      nicBreakdownArr.push({
        name: 'Class 4 NIC (Basic)',
        description: `${((NIC_RATES.class4.lowerRate * 100).toFixed(0))}% on profits £12,570 - £50,270`,
        amount: basicNic,
      });

      if (yearlyProfit > NIC_RATES.class4.upperThreshold) {
        const additionalNic = (yearlyProfit - NIC_RATES.class4.upperThreshold) * NIC_RATES.class4.upperRate;
        totalNicAmount += additionalNic;
        nicBreakdownArr.push({
          name: 'Class 4 NIC (Higher)',
          description: `${((NIC_RATES.class4.upperRate * 100).toFixed(0))}% on profits over £50,270`,
          amount: additionalNic,
        });
      }
    }

    setNicBreakdown(nicBreakdownArr);
    setTotalNic(totalNicAmount);
    setAfterTaxProfit(yearlyProfit - totalTax - totalNicAmount);
  }, [totalIncome, totalExpenses]);

  // Fetch real data from Supabase
  const fetchYearData = async () => {
    if (!session?.user?.id || dataLoaded) return;

    // Get current tax year (UK tax year: April 6th to April 5th)
    const now = new Date();
    let startYear = now.getFullYear();
    
    // If before April 6th, use previous tax year
    if (now.getMonth() < 3 || (now.getMonth() === 3 && now.getDate() < 6)) {
      startYear -= 1;
    }
    
    const startDate = `${startYear}-04-06`;
    const endDate = `${startYear + 1}-04-05`;

    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount, type')
      .eq('user_id', session.user.id)
      .gte('date', startDate)
      .lte('date', endDate);

    if (transactions && transactions.length > 0) {
      let income = 0, expenses = 0;
      transactions.forEach(t => {
        if (t.type === 'income') income += parseFloat(t.amount) || 0;
        else expenses += parseFloat(t.amount) || 0;
      });
      
      setTotalIncome(income.toFixed(2));
      setTotalExpenses(expenses.toFixed(2));
      setDataLoaded(true);
    }
  };

  // Calculate when inputs change
  useEffect(() => {
    calculateTaxAndNic();
  }, [calculateTaxAndNic]);

  // Fetch data on mount and screen focus
  useEffect(() => {
    if (session?.user?.id && !dataLoaded) {
      fetchYearData();
    }
  }, [session, dataLoaded]);

  // Refresh when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (session?.user?.id && !dataLoaded) {
        fetchYearData();
      }
    });
    return unsubscribe;
  }, [session, dataLoaded]);

  const formatCurrency = (amount) => {
    return '£' + parseFloat(amount || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const generateReport = () => {
    const report = `
═══════════════════════════════
     UK TAX SUMMARY 2024/25
═══════════════════════════════

📊 INCOME & EXPENSES
   Total Income:        ${formatCurrency(totalIncome)}
   Total Expenses:     -${formatCurrency(totalExpenses)}
   ─────────────────────────────
   Taxable Profit:     ${formatCurrency(profit)}

💰 INCOME TAX BREAKDOWN
${taxBreakdown.map(b => `   ${b.name}:        ${formatCurrency(b.tax)}`).join('\n')}
   ─────────────────────────────
   TOTAL INCOME TAX:  -${formatCurrency(estimatedTax)}

🇬🇧 NATIONAL INSURANCE
${nicBreakdown.map(n => `   ${n.name}:      ${formatCurrency(n.amount)}`).join('\n')}
   ─────────────────────────────
   TOTAL NIC:         -${formatCurrency(totalNic)}

═══════════════════════════════
   TOTAL TAX & NIC:  -${formatCurrency(estimatedTax + totalNic)}
   ─────────────────────────────
   AFTER-TAX PROFIT: ${formatCurrency(afterTaxProfit)}
═══════════════════════════════
    Generated by TradeTax UK
`;
    return report;
  };

  const exportReport = async () => {
    const report = generateReport();
    
    try {
      await Share.share({
        message: report,
        title: 'Tax Summary 2024/25',
      });
    } catch (error) {
      Alert.alert('Success', 'Tax summary ready to share!');
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>UK Tax Calculator</Text>

        {/* Income/Expenses Inputs (Read Only) */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Your Numbers</Text>
          
          <Text style={[styles.label, { color: colors.text }]}>Total Income (£)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: '#E5E7EB', color: '#374151', borderColor: colors.border }]}
            value={totalIncome}
            editable={false}
            pointerEvents="none"
          />

          <Text style={[styles.label, { color: colors.text }]}>Total Expenses (£)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: '#E5E7EB', color: '#374151', borderColor: colors.border }]}
            value={totalExpenses}
            editable={false}
            pointerEvents="none"
          />
        </View>

        {/* Main Tax Display */}
        <View style={[styles.mainDisplay, { backgroundColor: '#FACC15' }]}>
          <Text style={styles.mainLabel}>TOTAL TAX & NI</Text>
          <Text style={styles.mainValue}>{formatCurrency(estimatedTax + totalNic)}</Text>
          <View style={styles.mainDivider} />
          <View style={styles.mainRow}>
            <View style={styles.mainItem}>
              <Text style={styles.mainSmallLabel}>Profit</Text>
              <Text style={styles.mainSmallValue}>{formatCurrency(profit)}</Text>
            </View>
            <View style={styles.mainItem}>
              <Text style={styles.mainSmallLabel}>After-Tax</Text>
              <Text style={styles.mainSmallValueSuccess}>{formatCurrency(afterTaxProfit)}</Text>
            </View>
          </View>
        </View>

        {/* Income Tax Breakdown */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>💰 Income Tax</Text>
        {taxBreakdown.map((band, index) => (
          <View key={index} style={[styles.bandCard, { backgroundColor: colors.card }]}>
            <View style={styles.bandHeader}>
              <Text style={[styles.bandName, { color: colors.text }]}>{band.name}</Text>
              <Text style={[styles.bandRate, { color: colors.accent }]}>{band.rate}%</Text>
            </View>
            <View style={styles.bandRow}>
              <Text style={[styles.bandAmount, { color: colors.secondary }]}>
                {formatCurrency(band.amount)}
              </Text>
              <Text style={[styles.bandTax, { color: colors.danger }]}>
                {formatCurrency(band.tax)}
              </Text>
            </View>
          </View>
        ))}

        {/* National Insurance Breakdown */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>🇬🇧 National Insurance</Text>
        {nicBreakdown.length === 0 ? (
          <View style={[styles.bandCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.bandName, { color: colors.text }]}>No NIC payable</Text>
            <Text style={[styles.bandTax, { color: colors.success }]}>£0.00</Text>
          </View>
        ) : (
          nicBreakdown.map((nic, index) => (
            <View key={index} style={[styles.bandCard, { backgroundColor: colors.card }]}>
              <View style={styles.bandHeader}>
                <Text style={[styles.bandName, { color: colors.text }]}>{nic.name}</Text>
                <Text style={[styles.bandTax, { color: colors.danger }]}>-{formatCurrency(nic.amount)}</Text>
              </View>
              <Text style={[styles.bandAmount, { color: colors.secondary }]}>
                {nic.description}
              </Text>
            </View>
          ))
        )}

        {/* Export Button */}
        <TouchableOpacity 
          style={[styles.exportButton, { backgroundColor: colors.success }]}
          onPress={exportReport}
        >
          <Text style={styles.exportText}>📤 Export / Share Tax Summary</Text>
        </TouchableOpacity>

        {/* Tax Bands Info */}
        <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.infoTitle, { color: colors.text }]}>💡 UK Tax & NI 2024/25</Text>
          <View style={styles.infoRow}>
            <Text style={[styles.infoBand, { color: colors.secondary }]}>Income Tax Bands</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoBand, { color: colors.secondary }]}>0% - £12,570</Text>
            <Text style={[styles.infoRate, { color: colors.secondary }]}>Personal Allowance</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoBand, { color: colors.secondary }]}>20% - £50,270</Text>
            <Text style={[styles.infoRate, { color: colors.secondary }]}>Basic Rate</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoBand, { color: colors.secondary }]}>40% - £125,140</Text>
            <Text style={[styles.infoRate, { color: colors.secondary }]}>Higher Rate</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoBand, { color: colors.secondary }]}>45% +</Text>
            <Text style={[styles.infoRate, { color: colors.secondary }]}>Additional Rate</Text>
          </View>
          <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
          <View style={styles.infoRow}>
            <Text style={[styles.infoBand, { color: colors.secondary }]}>National Insurance</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoBand, { color: colors.secondary }]}>Class 2</Text>
            <Text style={[styles.infoRate, { color: colors.secondary }]}>£3.45/week if profit > £6,725</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoBand, { color: colors.secondary }]}>Class 4</Text>
            <Text style={[styles.infoRate, { color: colors.secondary }]}>9% + 2% on profits</Text>
          </View>
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 16, color: '#1F2937' },
  card: { borderRadius: 12, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12, color: '#1F2937' },
  label: { fontSize: 18, fontWeight: '600', marginBottom: 8, color: '#1F2937' },
  input: { borderWidth: 1, borderRadius: 8, padding: 16, fontSize: 18, marginBottom: 12 },
  
  // Main Display
  mainDisplay: { borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 20 },
  mainLabel: { color: '#374151', fontSize: 16, fontWeight: '600', letterSpacing: 2 },
  mainValue: { color: '#1F2937', fontSize: 48, fontWeight: 'bold', marginVertical: 12 },
  mainDivider: { width: '100%', height: 1, backgroundColor: 'rgba(0,0,0,0.1)', marginVertical: 16 },
  mainRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
  mainItem: { alignItems: 'center' },
  mainSmallLabel: { color: '#374151', fontSize: 16 },
  mainSmallValue: { color: '#1F2937', fontSize: 22, fontWeight: 'bold' },
  mainSmallValueSuccess: { color: '#059669', fontSize: 22, fontWeight: 'bold' },
  
  sectionTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 12, marginTop: 16, color: '#1F2937' },
  bandCard: { borderRadius: 12, padding: 16, marginBottom: 8 },
  bandHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  bandName: { fontSize: 18, fontWeight: '600' },
  bandRate: { fontSize: 18, fontWeight: 'bold' },
  bandRow: { flexDirection: 'row', justifyContent: 'space-between' },
  bandAmount: { fontSize: 16 },
  bandTax: { fontSize: 18, fontWeight: 'bold' },
  
  exportButton: { borderRadius: 12, padding: 18, alignItems: 'center', marginVertical: 20 },
  exportText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  
  infoCard: { borderRadius: 12, padding: 16, marginTop: 16 },
  infoTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#1F2937' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  infoBand: { fontSize: 14 },
  infoRate: { fontSize: 14, fontWeight: '600' },
  infoDivider: { height: 1, marginVertical: 12 },
});
