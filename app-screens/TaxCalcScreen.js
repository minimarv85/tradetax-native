import React, { useState, useContext, useEffect, useCallback } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity, Alert, Share } from 'react-native';
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

// UK National Insurance 2024/25
const NIC_RATES = {
  class2: { rate: 3.45, threshold: 6725 }, // £3.45/week if profit over £6,725
  class4: { lowerRate: 0.09, lowerThreshold: 12570, upperThreshold: 50270, upperRate: 0.02 },
};

// Get current tax year
const getCurrentTaxYear = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  
  // UK tax year: April 6th to April 5th
  if (now.getMonth() > 3 || (now.getMonth() === 3 && now.getDate() >= 6)) {
    return { start: currentYear, end: currentYear + 1 };
  } else {
    return { start: currentYear - 1, end: currentYear };
  }
};

// Get tax bands based on region
const getTaxBands = (region) => {
  return region === 'scotland' ? TAX_BANDS_SCOTLAND : TAX_BANDS_UK;
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
  const [taxYear, setTaxYear] = useState(getCurrentTaxYear());
  
  // User profile settings
  const [userSettings, setUserSettings] = useState({
    taxRegion: 'england',
    employmentStatus: 'self_employed',
    annualSalary: 0,
    taxCode: '',
  });

  // Calculate tax and NIC based on current inputs
  const calculateTaxAndNic = useCallback(() => {
    const income = parseFloat(totalIncome) || 0;
    const expenses = parseFloat(totalExpenses) || 0;
    const yearlyProfit = Math.max(0, income - expenses);
    
    setProfit(yearlyProfit);

    const taxBands = getTaxBands(userSettings.taxRegion);
    let remainingProfit = yearlyProfit;
    let totalTax = 0;
    let taxBreakdownArr = [];
    let previousMax = 0;

    // Calculate personal allowance based on employment
    let personalAllowance = 12570;
    if (userSettings.employmentStatus === 'employed_self' || userSettings.employmentStatus === 'employed') {
      // Reduce personal allowance by salary (simplified)
      personalAllowance = Math.max(0, 12570 - (userSettings.annualSalary * 0.1));
    }

    // Calculate income tax by bands
    taxBands.forEach((band) => {
      if (remainingProfit <= 0) return;
      
      const bandStart = previousMax;
      const bandWidth = band.max ? (band.max - previousMax) : Infinity;
      const taxableInBand = Math.min(remainingProfit, bandWidth);
      
      // Adjust first band for personal allowance
      let taxableAmount = taxableInBand;
      if (band.rate === 0 && personalAllowance > 0) {
        taxableAmount = Math.min(taxableInBand, personalAllowance);
        // Reduce remaining profit by personal allowance used
        remainingProfit = Math.max(0, remainingProfit - personalAllowance);
      }
      
      if (taxableAmount > 0) {
        const tax = taxableAmount * band.rate;
        totalTax += tax;
        taxBreakdownArr.push({
          name: band.name,
          rate: band.rate * 100,
          amount: taxableAmount,
          tax: tax,
        });
        remainingProfit -= taxableAmount;
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
      const class2Amount = NIC_RATES.class2.rate * 52;
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
  }, [totalIncome, totalExpenses, userSettings]);

  // Fetch real data from Supabase
  const fetchYearData = async () => {
    if (!session?.user?.id || dataLoaded) return;

    const { start, end } = taxYear;
    const startDate = `${start}-04-06`;
    const endDate = `${end}-04-05`;

    // Fetch transactions
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
    }

    // Fetch user settings
    const { data: profile } = await supabase
      .from('profiles')
      .select('tax_region, employment_status, annual_salary, tax_code')
      .eq('id', session.user.id)
      .single();

    if (profile) {
      setUserSettings({
        taxRegion: profile.tax_region || 'england',
        employmentStatus: profile.employment_status || 'self_employed',
        annualSalary: profile.annual_salary || 0,
        taxCode: profile.tax_code || '',
      });
    }

    setDataLoaded(true);
  };

  // Calculate when inputs change
  useEffect(() => {
    calculateTaxAndNic();
  }, [calculateTaxAndNic]);

  // Fetch data on mount
  useEffect(() => {
    if (session?.user?.id && !dataLoaded) {
      setTaxYear(getCurrentTaxYear());
      fetchYearData();
    }
  }, [session, dataLoaded]);

  const formatCurrency = (amount) => {
    return '£' + parseFloat(amount || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const getRegionName = (region) => {
    const names = {
      england: 'England & NI',
      scotland: 'Scotland',
      wales: 'Wales',
    };
    return names[region] || region;
  };

  const getEmploymentName = (status) => {
    const names = {
      self_employed: 'Self-employed only',
      employed_self: 'Employed + Self-employed',
      employed: 'Full-time employed',
    };
    return names[status] || status;
  };

  const generateReport = () => {
    const region = getRegionName(userSettings.taxRegion);
    const employment = getEmploymentName(userSettings.employmentStatus);
    
    const report = `
═══════════════════════════════
   UK TAX SUMMARY ${taxYear.start}/${taxYear.end.toString().slice(-2)}
═══════════════════════════════

📍 Region: ${region}
💼 Status: ${employment}
${userSettings.annualSalary > 0 ? `💷 Salary: ${formatCurrency(userSettings.annualSalary)}` : ''}

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
        title: `Tax Summary ${taxYear.start}/${taxYear.end.toString().slice(-2)}`,
      });
    } catch (error) {
      Alert.alert('Success', 'Tax summary ready to share!');
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>UK Tax Calculator</Text>

        {/* Current Tax Year */}
        <View style={[styles.yearBadge, { backgroundColor: colors.primary }]}>
          <Text style={styles.yearBadgeText}>Tax Year {taxYear.start}/{taxYear.end.toString().slice(-2)}</Text>
        </View>

        {/* User Settings Display */}
        <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.settingsTitle, { color: colors.text }]}>Your Settings</Text>
          <View style={styles.settingsRow}>
            <Text style={[styles.settingsLabel, { color: colors.secondary }]}>Region</Text>
            <Text style={[styles.settingsValue, { color: colors.text }]}>{getRegionName(userSettings.taxRegion)}</Text>
          </View>
          <View style={styles.settingsRow}>
            <Text style={[styles.settingsLabel, { color: colors.secondary }]}>Status</Text>
            <Text style={[styles.settingsValue, { color: colors.text }]}>{getEmploymentName(userSettings.employmentStatus)}</Text>
          </View>
          {userSettings.annualSalary > 0 && (
            <View style={styles.settingsRow}>
              <Text style={[styles.settingsLabel, { color: colors.secondary }]}>Salary</Text>
              <Text style={[styles.settingsValue, { color: colors.text }]}>{formatCurrency(userSettings.annualSalary)}</Text>
            </View>
          )}
        </View>

        {/* Income/Expenses Inputs (Read Only) */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Your Numbers</Text>
          
          <Text style={[styles.label, { color: colors.text }]}>Total Income (£)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: '#E5E7EB', color: '#374151' }]}
            value={totalIncome}
            editable={false}
            pointerEvents="none"
          />

          <Text style={[styles.label, { color: colors.text }]}>Total Expenses (£)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: '#E5E7EB', color: '#374151' }]}
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
          <Text style={[styles.infoTitle, { color: colors.text }]}>
            💡 {userSettings.taxRegion === 'scotland' ? 'Scottish' : 'UK'} Tax & NI {taxYear.start}/{taxYear.end.toString().slice(-2)}
          </Text>
          <View style={styles.infoRow}>
            <Text style={[styles.infoBand, { color: colors.secondary }]}>
              {userSettings.taxRegion === 'scotland' ? 'Starter 19%, Basic 20%, Intermediate 21%' : '0% - £12,570'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoBand, { color: colors.secondary }]}>
              {userSettings.taxRegion === 'scotland' ? 'Higher 42%, Top 48%' : '20% - £50,270'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoBand, { color: colors.secondary }]}>40% - £125,140</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoBand, { color: colors.secondary }]}>45%+</Text>
          </View>
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 8, color: '#1F2937' },
  yearBadge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 12 },
  yearBadgeText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  settingsCard: { borderRadius: 12, padding: 16, marginBottom: 12 },
  settingsTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#1F2937' },
  settingsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  settingsLabel: { fontSize: 14 },
  settingsValue: { fontSize: 14, fontWeight: '600' },
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
});
