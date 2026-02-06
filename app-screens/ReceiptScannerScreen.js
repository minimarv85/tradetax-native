import React, { useState, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Image, ScrollView, TextInput } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../App';
import { supabase } from '../app-lib/supabase';

export default function ReceiptScannerScreen({ navigation }) {
  const authContext = useContext(AuthContext);
  const { session, colors } = authContext || {};
  const [photoUri, setPhotoUri] = useState(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow camera access to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      // Check if result has assets array
      if (result && result.assets && Array.isArray(result.assets) && result.assets.length > 0) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const handleSaveReceipt = async () => {
    if (!amount || !description) {
      Alert.alert('Error', 'Please enter amount and description');
      return;
    }

    setLoading(true);
    
    let photoUrl = null;
    if (photoUri) {
      try {
        const filename = `receipts/${session.user.id}/${Date.now()}.jpg`;
        const response = await fetch(photoUri);
        const blob = await response.blob();
        
        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(filename, blob);

        if (!uploadError) {
          const { data } = supabase.storage.from('receipts').getPublicUrl(filename);
          photoUrl = data.publicUrl;
        }
      } catch (e) {
        console.log('Upload error:', e);
      }
    }

    const { error } = await supabase
      .from('transactions')
      .insert([{
        user_id: session.user.id,
        type: 'expense',
        amount: parseFloat(amount),
        description,
        category: 'Receipt Scan',
        receipt_url: photoUrl,
        date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString()
      }]);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', 'Receipt saved!', [
        { text: 'OK', onPress: () => {
          setPhotoUri(null);
          setAmount('');
          setDescription('');
          navigation.goBack();
        }}
      ]);
    }
    setLoading(false);
  };

  const retake = () => {
    setPhotoUri(null);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Receipt Scanner</Text>
        
        {!photoUri ? (
          <View style={styles.cameraContainer}>
            <TouchableOpacity 
              style={[styles.captureButton, { backgroundColor: colors.primary }]}
              onPress={takePhoto}
            >
              <Text style={styles.captureText}>📷 Take Photo</Text>
            </TouchableOpacity>
            <Text style={[styles.instruction, { color: colors.secondary }]}>
              Take a photo of your receipt
            </Text>
          </View>
        ) : (
          <View style={styles.resultContainer}>
            <Image source={{ uri: photoUri }} style={styles.previewImage} />
            
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
              placeholder="What was this purchase?"
              placeholderTextColor={colors.secondary}
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={[styles.button, { backgroundColor: colors.secondary }]}
                onPress={retake}
              >
                <Text style={styles.buttonText}>Retake</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, { backgroundColor: colors.primary }]}
                onPress={handleSaveReceipt}
                disabled={loading}
              >
                <Text style={styles.buttonText}>{loading ? 'Saving...' : 'Save Receipt'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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
  cameraContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 300,
    borderRadius: 16,
    backgroundColor: '#1F2937',
    marginBottom: 16,
  },
  captureButton: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  captureText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  instruction: {
    fontSize: 14,
    textAlign: 'center',
  },
  resultContainer: {
    marginTop: 16,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
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
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  button: {
    flex: 1,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
