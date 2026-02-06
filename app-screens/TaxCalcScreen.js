import React, { useState, useContext, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { AuthContext } from '../App';
import { supabase } from '../app-lib/supabase';

// UK Tax Bands 2024/25 (England, Wales, NI) - AFTER Personal Allowance
const TAX_BANDS_UK = [
  { name: 'Personal Allowance', rate: 0, max: 12570 },
  { name: 'Basic Rate (20%)', rate: 0.20, max: 50270 },
  { name: 'Higher Rate (40%)', rate: 0.40, max: 125140 },
  { name: 'Additional Rate (45%)', rate: 0.45, max: null },
];

// Scottish Tax Bands 2024/25 - AFTER Personal Allowance
// Source: https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past
const TAX_BANDS_SCOTLAND = [
  { name: 'Personal Allowance', rate: 0, max: 12570 },
  { name: 'Starter Rate (19%)', rate: 0.19, max: 14876 },
  { name: 'Basic Rate (20%)', rate: 0.20, max: 26561 },
  { name: 'Intermediate Rate (21%)', rate: 0.21, max: 43662 },
  { name: 'Higher Rate (42%)', rate: 0.42, max: 75000 },
  { name: 'Advanced Rate (45%)', rate: 0.45, max: 125140 },
  { name: 'Top Rate (48%)', rate: 0.48, max: null },
];

// National Insurance 2024/25 - Source: https://www.gov.uk/self-employed-national-insurance-rates
const NIC_RATES = {
  class2: { weekly: 3.50, threshold: 6725 }, // £3.50/week if profit over £6,725
  class4: { lowerRate: 0.06, lowerThreshold: 12570, upperThreshold: 50270, upperRate: 0.02 },
};

export default function TaxCalcScreen() {
  const { session, colors } = useContext(AuthContext);
  const [taxRegion, setTaxRegion] = useState('england');
  const [employmentStatus, setEmploymentStatus] = useState('self_employed');
  const [annualSalary, setAnnualSalary] = useState('');
  const [selfEmploymentProfit, setSelfEmploymentProfit] = useState('');
  
  // Calculated values
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalTax, setTotalTax] = useState(0);
  const [taxBreakdown, setTaxBreakdown] = useState([]);
  const [totalNic, setTotalNic] = useState(0);
  const [nicBreakdown, setNicBreakdown] = useState([]);
  const [alreadyPaid, setAlreadyPaid] = useState(0);
  const [selfAssessmentDue, setSelfAssessmentDue] = useState(0);
  const [takeHome, setTakeHome] = useState(0);

  useEffect(() => {
    loadUserSettings();
  }, [session]);

  const loadUserSettings = async () => {
    if (!session?.user?.id) return;

    const { data } = await supabase
      .from('profiles')
      .select('tax_region, employment_status, annual_salary')
      .eq('id', session.user.id)
      .single();

    if (data) {
      setTaxRegion(data.tax_region || 'england');
      setEmploymentStatus(data.employment_status || 'self_employed');
      if (data.annual_salary) {
        setAnnualSalary(data.annual_salary.toString());
      }
    }
  };

  useEffect(() => {
    calculateTax();
  }, [taxRegion, employmentStatus, annualSalary, selfEmploymentProfit]);

  /**
   * Calculate income tax based on HMRC 2024/25 rates
   * Source: https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past
   */
  const calculateIncomeTax = (totalIncome, region) => {
    const taxBands = region === 'scotland' ? TAX_BANDS_SCOTLAND : TAX_BANDS_UK;
    
    // Personal Allowance reduces by £1 for every £2 above £100,000
    let personalAllowance = 12570;
    if (totalIncome > 100000) {
      const reduction = Math.floor((totalIncome - 100000) / 2);
      personalAllowance = Math.max(0, personalAllowance - reduction);
    }
    
    const taxableIncome = Math.max(0, totalIncome - personalAllowance);
    
    let totalTax = 0;
    let breakdown = [];
    let remainingIncome = taxableIncome;
    let previousMax = 0;
    
    // Calculate tax by band
    for (const band of taxBands) {
      if (remainingIncome <= 0) break;
      
      const bandStart = previousMax;
      const bandWidth = band.max ? (band.max - previousMax) : Infinity;
      const taxableInBand = Math.min(remainingIncome, bandWidth);
      
      const tax = taxableInBand * band.rate;
      totalTax += tax;
      
      breakdown.push({
        name: band.name,
        rate: (band.rate * 100).toFixed(0) + '%',
        amount: taxableInBand,
        tax: tax,
      });
      
      remainingIncome -= taxableInBand;
      previousMax = band.max || bandWidth + previousMax;
    }
    
    return { totalTax, breakdown };
  };

  /**
   * Calculate National Insurance contributions
   * Source: https://www.gov.uk/self-employed-national-insurance-rates
   */
  const calculateNationalInsurance = (profit) => {
    let nicTotal = 0;
    let nicItems = [];
    
    // Class 2 NIC: £3.50/week if profit over £6,725
    if (profit >= NIC_RATES.class2.threshold) {
      const class2 = NIC_RATES.class2.weekly * 52;
      nicTotal += class2;
      nicItems.push({ 
        name: 'Class 2 NIC', 
        desc: `£${NIC_RATES.class2.weekly}/week × 52 weeks`,
        amount: class2 
      });
    }
    
    // Class 4 NIC on self-employment profit
    if (profit > NIC_RATES.class4.lowerThreshold) {
      const lowerAmount = Math.min(profit, NIC_RATES.class4.upperThreshold) - NIC_RATES.class4.lowerThreshold;
      const basic = lowerAmount * NIC_RATES.class4.lowerRate;
      nicTotal += basic;
      nicItems.push({ 
        name: 'Class 4 NIC (6%)', 
        desc: `On profits £12,571 - £50,270`,
        amount: basic 
      });
      
      if (profit > NIC_RATES.class4.upperThreshold) {
        const upper = (profit - NIC_RATES.class4.upperThreshold) * NIC_RATES.class4.upperRate;
        nicTotal += upper;
        nicItems.push({ 
          name: 'Class 4 NIC (2%)', 
          desc: `On profits over £50,270`,
          amount: upper 
        });
      }
    }
    
    return { nicTotal, nicItems };
  };

  /**
   * Calculate Class 1 NIC already paid via PAYE on employment income
   */
  const calculateClass1NIC = (salary) => {
    if (salary <= 12570) return 0;
    
    const mainAmount = Math.min(salary, 50270) - 12570;
    const mainNIC = mainAmount * 0.08;
    
    const upperAmount = Math.max(0, salary - 50270);
    const upperNIC = upperAmount * 0.02;
    
    return mainNIC + upperNIC;
  };

  const calculateTax = () => {
    const salary = parseFloat(annualSalary) || 0;
    const profit = parseFloat(selfEmploymentProfit) || 0;
    const total = salary + profit;
    
    setTotalIncome(total);
    
    // Calculate total income tax on combined income
    const { totalTax, breakdown } = calculateIncomeTax(total, taxRegion);
    setTaxBreakdown(breakdown);
    setTotalTax(totalTax);
    
    // Calculate National Insurance on self-employment profit only
    const { nicTotal, nicItems } = calculateNationalInsurance(profit);
    setNicBreakdown(nicItems);
    setTotalNic(nicTotal);
    
    // Calculate what's already paid via PAYE
    let paid = 0;
    if (salary > 0) {
      // Income tax already paid on employment
      const { totalTax: employedTax } = calculateIncomeTax(salary, taxRegion);
      paid += employedTax;
      
      // Class 1 NIC already deducted
      paid += calculateClass1NIC(salary);
    }
    setAlreadyPaid(paid);
    
    // Self Assessment = Total Tax + NIC - Already Paid
    const selfAssessment = totalTax + nicTotal - paid;
    setSelfAssessmentDue(Math.max(0, selfAssessment));
    
    // Take home
    setTakeHome(total - totalTax - nicTotal);
  };

  const formatCurrency = (amount) => {
    return '£' + (amount || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={styles.headerTitle}>Tax Calculator</Text>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        
        {/* Income Inputs */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Your Income</Text>
          
          <Text style={styles.label}>Employment Income (PAYE)</Text>
          <TextInput
            style={styles.input}
            value={annualSalary}
            onChangeText={setAnnualSalary}
            placeholder="0.00"
            placeholderTextColor="#9CA3AF"
            keyboardType="decimal-pad"
          />
          
          <Text style={styles.label}>Self-Employment Profit</Text>
          <TextInput
            style={styles.input}
            value={selfEmploymentProfit}
            onChangeText={setSelfEmploymentProfit}
            placeholder="0.00"
            placeholderTextColor="#9CA3AF"
            keyboardType="decimal-pad"
          />
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Income:</Text>
            <Text style={styles.totalValue}>{formatCurrency(totalIncome)}</Text>
          </View>
        </View>

        {/* Tax Breakdown */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Income Tax ({taxRegion === 'scotland' ? 'Scotland' : 'England/NI/Wales'})
          </Text>
          
          {taxBreakdown.map((item, index) => (
            <View key={index} style={styles.breakdownRow}>
              <View style={styles.breakdownLeft}>
                <Text style={styles.breakdownName}>{item.name}</Text>
                <Text style={styles.breakdownRate}>{item.rate}</Text>
              </View>
              <View style={styles.breakdownRight}>
                <Text style={styles.breakdownAmount}>{formatCurrency(item.amount)}</Text>
                <Text style={[styles.breakdownTax, { color: item.tax > 0 ? '#EF4444' : '#10B981' }]}>
                  {item.tax > 0 ? '-' : ''}{formatCurrency(item.tax)}
                </Text>
              </View>
            </View>
          ))}
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Income Tax:</Text>
            <Text style={[styles.totalValue, { color: '#EF4444' }]}>{formatCurrency(totalTax)}</Text>
          </View>
        </View>

        {/* National Insurance */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>National Insurance (Self-Employment)</Text>
          
          {nicBreakdown.length === 0 ? (
            <Text style={styles.noData}>No NIC due on this profit</Text>
          ) : (
            nicBreakdown.map((item, index) => (
              <View key={index} style={styles.breakdownRow}>
                <View style={styles.breakdownLeft}>
                  <Text style={styles.breakdownName}>{item.name}</Text>
                  <Text style={styles.breakdownRate}>{item.desc}</Text>
                </View>
                <Text style={[styles.breakdownTax, { color: '#EF4444' }]}>
                  -{formatCurrency(item.amount)}
                </Text>
              </View>
            ))
          )}
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total NIC:</Text>
            <Text style={[styles.totalValue, { color: '#EF4444' }]}>{formatCurrency(totalNic)}</Text>
          </View>
        </View>

        {/* Summary */}
        <View style={[styles.card, styles.summaryCard]}>
          <Text style={styles.sectionTitle}>Summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Tax + NIC:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalTax + totalNic)}</Text>
          </View>
          
          <View style={[styles.summaryRow, { marginTop: 8 }]}>
            <Text style={styles.summaryLabel}>Already Paid (PAYE):</Text>
            <Text style={[styles.summaryValue, { color: '#10B981' }]}>{formatCurrency(alreadyPaid)}</Text>
          </View>
          
          <View style={[styles.summaryRow, styles.owingRow]}>
            <Text style={styles.summaryLabel}>Self Assessment Due:</Text>
            <Text style={[styles.summaryValue, { color: '#EF4444', fontSize: 24 }]}>
              {formatCurrency(selfAssessmentDue)}
            </Text>
          </View>
          
          <View style={[styles.summaryRow, { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' }]}>
            <Text style={[styles.summaryLabel, { fontSize: 18 }]}>Take Home Pay:</Text>
            <Text style={[styles.summaryValue, { color: '#10B981', fontSize: 20 }]}>
              {formatCurrency(takeHome)}
            </Text>
          </View>
        </View>

        {/* Rates Info */}
        <View style={[styles.card, styles.infoCard]}>
          <Text style={styles.infoTitle}>2024/25 Tax Rates (HMRC)</Text>
          <Text style={styles.infoText}>
            PA: £12,570 | Basic: 20% | Higher: 40% | Additional: 45%
          </Text>
          <Text style={styles.infoText}>
            Scotland: Starter 19% | Basic 20% | Intermediate 21% | Higher 42%
          </Text>
          <Text style={styles.infoText}>
            NIC: Class 2 £3.50/week | Class 4 6% + 2%
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    color: '#1F2937',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  breakdownLeft: {
    flex: 1,
  },
  breakdownName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  breakdownRate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  breakdownRight: {
    alignItems: 'flex-end',
  },
  breakdownAmount: {
    fontSize: 12,
    color: '#6B7280',
  },
  breakdownTax: {
    fontSize: 14,
    fontWeight: '600',
  },
  noData: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    padding: 10,
  },
  summaryCard: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  owingRow: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#3B82F6',
  },
  summaryLabel: {
    fontSize: 16,
    color: '#374151',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  infoCard: {
    backgroundColor: '#F3F4F6',
    borderWidth: 0,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
});
