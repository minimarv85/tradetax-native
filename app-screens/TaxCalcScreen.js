import React, { useState, useContext, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { AuthContext } from '../App';
import { supabase } from '../app-lib/supabase';

// UK Tax Bands 2024/25 (England, Wales, NI)
const TAX_BANDS_UK = [
  { name: 'Personal Allowance', rate: 0, max: 12570 },
  { name: 'Basic Rate (20%)', rate: 0.20, max: 50270 },
  { name: 'Higher Rate (40%)', rate: 0.40, max: 125140 },
  { name: 'Additional Rate (45%)', rate: 0.45, max: null },
];

// Scottish Tax Bands 2024/25
const TAX_BANDS_SCOTLAND = [
  { name: 'Starter Rate (19%)', rate: 0.19, max: 14732 },
  { name: 'Scottish Basic (20%)', rate: 0.20, max: 25656 },
  { name: 'Scottish Intermediate (21%)', rate: 0.21, max: 43662 },
  { name: 'Scottish Higher (42%)', rate: 0.42, max: 125140 },
  { name: 'Scottish Top (48%)', rate: 0.48, max: null },
];

// National Insurance 2024/25
const NIC_RATES = {
  class2: { weekly: 3.45, threshold: 6725 }, // £3.45/week if profit over £6,725/year
  class4: { lowerRate: 0.09, lowerThreshold: 12570, upperThreshold: 50270, upperRate: 0.02 },
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

  const calculateTax = () => {
    const salary = parseFloat(annualSalary) || 0;
    const profit = parseFloat(selfEmploymentProfit) || 0;
    const total = salary + profit;
    
    setTotalIncome(total);

    const taxBands = taxRegion === 'scotland' ? TAX_BANDS_SCOTLAND : TAX_BANDS_UK;
    
    // Calculate total tax on combined income
    let remainingIncome = total;
    let previousMax = 0;
    let totalTaxAmount = 0;
    let breakdown = [];
    
    // Personal Allowance
    let personalAllowance = 12570;
    
    // If employed and income over £100K, reduce personal allowance
    if (salary > 100000) {
      const reduction = Math.floor((salary - 100000) / 2);
      personalAllowance = Math.max(0, personalAllowance - reduction);
    }
    
    // Calculate tax by band
    taxBands.forEach((band) => {
      if (remainingIncome <= 0) return;
      
      const bandWidth = band.max ? (band.max - previousMax) : Infinity;
      const taxableInBand = Math.min(remainingIncome, bandWidth);
      
      let taxableAmount = taxableInBand;
      
      // Apply personal allowance to first band
      if (band.rate === 0 && personalAllowance > 0) {
        taxableAmount = Math.min(taxableInBand, personalAllowance);
        remainingIncome = Math.max(0, remainingIncome - personalAllowance);
        personalAllowance = 0;
      }
      
      if (taxableAmount > 0) {
        const tax = taxableAmount * band.rate;
        totalTaxAmount += tax;
        breakdown.push({
          name: band.name,
          rate: (band.rate * 100).toFixed(0) + '%',
          amount: taxableAmount,
          tax: tax,
        });
        remainingIncome -= taxableAmount;
        previousMax = band.max || previousMax + bandWidth;
      }
    });

    setTaxBreakdown(breakdown);
    setTotalTax(totalTaxAmount);

    // Calculate National Insurance (self-employment only)
    let nicTotal = 0;
    let nicItems = [];

    // Class 2 NIC: £3.45/week if profit over £6,725
    if (profit >= NIC_RATES.class2.threshold) {
      const class2 = NIC_RATES.class2.weekly * 52;
      nicTotal += class2;
      nicItems.push({ name: 'Class 2 NIC', desc: '£3.45 × 52 weeks', amount: class2 });
    }

    // Class 4 NIC on self-employment profit
    if (profit > NIC_RATES.class4.lowerThreshold) {
      const upperLimit = Math.min(profit, NIC_RATES.class4.upperThreshold);
      const basic = (upperLimit - NIC_RATES.class4.lowerThreshold) * NIC_RATES.class4.lowerRate;
      nicTotal += basic;
      nicItems.push({ 
        name: 'Class 4 NIC (Basic)', 
        desc: '9% on £12,570 - £50,270', 
        amount: basic 
      });

      if (profit > NIC_RATES.class4.upperThreshold) {
        const higher = (profit - NIC_RATES.class4.upperThreshold) * NIC_RATES.class4.upperRate;
        nicTotal += higher;
        nicItems.push({ 
          name: 'Class 4 NIC (Higher)', 
          desc: '2% over £50,270', 
          amount: higher 
        });
      }
    }

    setNicBreakdown(nicItems);
    setTotalNic(nicTotal);

    // Calculate what's already paid via PAYE
    let paid = 0;
    if (salary > 0) {
      // Tax already paid on employment
      const employedTax = calculateEmploymentTax(salary, personalAllowance);
      paid += employedTax;
      
      // Class 1 NIC already deducted (8% on £12,570 - £50,270, 2% above)
      const class1Basic = Math.min(Math.max(salary - 12570, 0), 50270 - 12570) * 0.08;
      const class1Higher = Math.max(0, salary - 50270) * 0.02;
      paid += class1Basic + class1Higher;
    }
    setAlreadyPaid(paid);

    // Self Assessment = Total Tax + NIC - Already Paid
    const selfAssessment = totalTaxAmount + nicTotal - paid;
    setSelfAssessmentDue(Math.max(0, selfAssessment));

    // Take home
    setTakeHome(total - totalTaxAmount - nicTotal);
  };

  const calculateEmploymentTax = (salary, remainingPA) => {
    let tax = 0;
    let remaining = salary;
    let pa = remainingPA;
    
    // Personal Allowance
    if (remaining > 0 && pa > 0) {
      const paUsed = Math.min(remaining, pa);
      remaining -= paUsed;
      pa -= paUsed;
    }
    
    // Basic Rate
    if (remaining > 0) {
      const basic = Math.min(remaining, 50270 - (12570 - pa));
      tax += basic * 0.20;
      remaining -= basic;
    }
    
    // Higher Rate
    if (remaining > 0) {
      tax += remaining * 0.40;
    }
    
    return tax;
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
          <Text style={styles.sectionTitle}>Income Tax ({taxRegion === 'scotland' ? 'Scotland' : 'England/NI/Wales'})</Text>
          
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
          <Text style={styles.sectionTitle}>National Insurance</Text>
          
          {nicBreakdown.map((item, index) => (
            <View key={index} style={styles.breakdownRow}>
              <View style={styles.breakdownLeft}>
                <Text style={styles.breakdownName}>{item.name}</Text>
                <Text style={styles.breakdownRate}>{item.desc}</Text>
              </View>
              <Text style={[styles.breakdownTax, { color: '#EF4444' }]}>
                -{formatCurrency(item.amount)}
              </Text>
            </View>
          ))}
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total NIC:</Text>
            <Text style={[styles.totalValue, { color: '#EF4444' }]}>{formatCurrency(totalNic)}</Text>
          </View>
        </View>

        {/* Summary */}
        <View style={[styles.card, styles.summaryCard]}>
          <Text style={styles.sectionTitle}>Summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Tax on All Income:</Text>
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
});
