import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { AuthContext } from '../App';

export default function VATScreen({ navigation }) {
  const { colors } = useContext(AuthContext);
  const [amount, setAmount] = useState('');
  const [vatRate, setVatRate] = useState('20');
  const [mode, setMode] = useState('add'); // add or remove

  const calculateVAT = () => {
    const numAmount = parseFloat(amount) || 0;
    const numRate = parseFloat(vatRate) || 0;
    
    if (mode === 'add') {
      // Adding VAT
      const vat = numAmount * (numRate / 100);
      return {
        net: numAmount,
        vat: vat,
        gross: numAmount + vat
      };
    } else {
      // Removing VAT (gross to net)
      const net = numAmount / (1 + (numRate / 100));
      const vat = numAmount - net;
      return {
        net: net,
        vat: vat,
        gross: numAmount
      };
    }
  };

  const result = calculateVAT();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>VAT Calculator</Text>

        <View style={styles.modeToggle}>
          <TouchableOpacity 
            style={[styles.modeButton, mode === 'add' && { backgroundColor: colors.primary }]}
            onPress={() => setMode('add')}
          >
            <Text style={[styles.modeText, mode === 'add' && { color: '#FFFFFF' }]}>Add VAT</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.modeButton, mode === 'remove' && { backgroundColor: colors.primary }]}
            onPress={() => setMode('remove')}
          >
            <Text style={[styles.modeText, mode === 'remove' && { color: '#FFFFFF' }]}>Remove VAT</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.label, { color: colors.text }]}>
          {mode === 'add' ? 'Net Amount (£)' : 'Gross Amount (£)'}
        </Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          placeholderTextColor={colors.secondary}
          keyboardType="decimal-pad"
        />

        <Text style={[styles.label, { color: colors.text }]}>VAT Rate (%)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          value={vatRate}
          onChangeText={setVatRate}
          placeholder="20"
          placeholderTextColor={colors.secondary}
          keyboardType="decimal-pad"
        />

        <View style={[styles.resultCard, { backgroundColor: colors.card }]}>
          <View style={styles.resultRow}>
            <Text style={[styles.resultLabel, { color: colors.secondary }]}>
              {mode === 'add' ? 'Net' : 'Net (after VAT removed)'}
            </Text>
            <Text style={[styles.resultValue, { color: colors.text }]}>£{result.net.toFixed(2)}</Text>
          </View>
          <View style={styles.resultRow}>
            <Text style={[styles.resultLabel, { color: colors.secondary }]}>VAT ({vatRate}%)</Text>
            <Text style={[styles.resultValue, { color: colors.danger }]}>£{result.vat.toFixed(2)}</Text>
          </View>
          <View style={[styles.resultRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 10 }]}>
            <Text style={[styles.resultTotal, { color: colors.primary }]}>
              {mode === 'add' ? 'Gross (inc. VAT)' : 'Gross'}
            </Text>
            <Text style={[styles.resultTotal, { color: colors.primary }]}>£{result.gross.toFixed(2)}</Text>
          </View>
        </View>

        <Text style={[styles.infoText, { color: colors.secondary }]}>
          💡 Use this calculator to check VAT amounts on invoices and expenses.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24 },
  modeToggle: { flexDirection: 'row', marginBottom: 20 },
  modeButton: { flex: 1, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#3B82F6', marginHorizontal: 4 },
  modeText: { fontSize: 14, fontWeight: '600', color: '#3B82F6' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 16 },
  resultCard: { borderRadius: 12, padding: 16, marginBottom: 16 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  resultLabel: { fontSize: 14 },
  resultValue: { fontSize: 16, fontWeight: '600' },
  resultTotal: { fontSize: 20, fontWeight: 'bold' },
  infoText: { fontSize: 12, textAlign: 'center', fontStyle: 'italic' },
});
