import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { AuthContext } from '../App';
import { supabase } from '../app-lib/supabase';

export default function InvoiceScreen({ navigation }) {
  const { session, colors } = useContext(AuthContext);
  const [clientName, setClientName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [vatRate, setVatRate] = useState('20');
  const [loading, setLoading] = useState(false);

  const calculateTotal = () => {
    const subtotal = parseFloat(amount) || 0;
    const vat = subtotal * (parseFloat(vatRate) || 0) / 100;
    return (subtotal + vat).toFixed(2);
  };

  const handleCreateInvoice = async () => {
    if (!clientName || !description || !amount) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    const subtotal = parseFloat(amount);
    const vat = subtotal * (parseFloat(vatRate) || 0) / 100;

    // Save as income transaction with invoice flag
    const { error } = await supabase
      .from('transactions')
      .insert([{
        user_id: session.user.id,
        type: 'income',
        amount: subtotal,
        description: `Invoice: ${clientName} - ${description}`,
        category: 'Invoice',
        vat_amount: vat,
        vat_rate: parseFloat(vatRate),
        date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString()
      }]);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', `Invoice created! Total: £${calculateTotal()}`, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    }
    setLoading(false);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Create Invoice</Text>

        <Text style={[styles.label, { color: colors.text }]}>Client Name *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          value={clientName}
          onChangeText={setClientName}
          placeholder="Client name"
          placeholderTextColor={colors.secondary}
        />

        <Text style={[styles.label, { color: colors.text }]}>Description *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          value={description}
          onChangeText={setDescription}
          placeholder="Work description"
          placeholderTextColor={colors.secondary}
        />

        <Text style={[styles.label, { color: colors.text }]}>Amount (£) *</Text>
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

        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.secondary }]}>Subtotal</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>£{parseFloat(amount || 0).toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.secondary }]}>VAT ({vatRate}%)</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>£{((parseFloat(amount || 0) * parseFloat(vatRate || 0)) / 100).toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 10 }]}>
            <Text style={[styles.summaryTotal, { color: colors.primary }]}>Total</Text>
            <Text style={[styles.summaryTotal, { color: colors.primary }]}>£{calculateTotal()}</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={handleCreateInvoice}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Creating...' : 'Create Invoice'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 16 },
  summaryCard: { borderRadius: 12, padding: 16, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 16, fontWeight: '600' },
  summaryTotal: { fontSize: 18, fontWeight: 'bold' },
  button: { borderRadius: 8, padding: 16, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
