import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { AuthContext } from '../App';
import { supabase } from '../app-lib/supabase';

const incomeCategories = ['Client Payment', 'Freelance Work', 'Consulting', 'Product Sales', 'Other Income'];
const expenseCategories = ['Equipment', 'Software', 'Travel', 'Office Supplies', 'Marketing', 'Utilities', 'Professional Services', 'Other'];

export default function IncomeScreen({ navigation }) {
  const authContext = useContext(AuthContext);
  const { session, colors } = authContext || {};
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCategories, setShowCategories] = useState(false);

  const handleSave = async () => {
    if (!amount || !description || !category) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('transactions')
      .insert([{
        user_id: session.user.id,
        type: 'income',
        amount: parseFloat(amount),
        description,
        category,
        date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString()
      }]);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', 'Income added successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    }
    setLoading(false);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Add Income</Text>

        <Text style={[styles.label, { color: colors.text }]}>Amount (£)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          placeholderTextColor={colors.secondary}
          keyboardType="decimal-pad"
        />

        <Text style={[styles.label, { color: colors.text }]}>Description</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          value={description}
          onChangeText={setDescription}
          placeholder="Client payment, freelance work, etc."
          placeholderTextColor={colors.secondary}
        />

        <Text style={[styles.label, { color: colors.text }]}>Category</Text>
        <TouchableOpacity 
          style={[styles.picker, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setShowCategories(true)}
        >
          <Text style={{ color: category ? colors.text : colors.secondary }}>
            {category || 'Select category'}
          </Text>
        </TouchableOpacity>

        {showCategories && (
          <View style={[styles.categoryList, { backgroundColor: colors.card }]}>
            {incomeCategories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={styles.categoryItem}
                onPress={() => {
                  setCategory(cat);
                  setShowCategories(false);
                }}
              >
                <Text style={[styles.categoryText, { color: colors.text }]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity 
          style={[styles.saveButton, { backgroundColor: colors.success }]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? 'Saving...' : 'Add Income'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  picker: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  categoryList: {
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  categoryItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  categoryText: {
    fontSize: 16,
  },
  saveButton: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
