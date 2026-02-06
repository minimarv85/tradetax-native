import React, { useState, useContext, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Image, ScrollView } from 'react-native';
import { Camera } from 'expo-camera';
import { AuthContext } from '../App';
import { supabase } from '../app-lib/supabase';

export default function ReceiptScannerScreen({ navigation }) {
  const { session, colors } = useContext(AuthContext);
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [photoUri, setPhotoUri] = useState(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const takePhoto = async () => {
    if (scanned) return;
    
    try {
      const result = await Camera.takePictureAsync({
        quality: 0.8,
        base64: false,
      });
      
      setPhotoUri(result.uri);
      setScanned(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleSaveReceipt = async () => {
    if (!amount || !description) {
      Alert.alert('Error', 'Please enter amount and description');
      return;
    }

    setLoading(true);
    
    // Upload photo to Supabase Storage (if you have a bucket set up)
    let photoUrl = null;
    if (photoUri) {
      const filename = `receipts/${session.user.id}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filename, { uri: photoUri });

      if (!uploadError) {
        const { data } = supabase.storage.from('receipts').getPublicUrl(filename);
        photoUrl = data.publicUrl;
      }
    }

    // Save transaction
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
          setScanned(false);
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
    setScanned(false);
    setPhotoUri(null);
  };

  if (hasPermission === null) {
    return <View style={[styles.container, { backgroundColor: colors.background }]}><Text style={{ color: colors.text }}>Requesting camera permission...</Text></View>;
  }

  if (hasPermission === false) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.text, { color: colors.text }]}>No camera permission</Text>
        <Text style={[styles.subtext, { color: colors.secondary }]}>
          Please enable camera access in your device settings.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Receipt Scanner</Text>
        
        {!scanned ? (
          <View style={styles.cameraContainer}>
            <TouchableOpacity 
              style={[styles.captureButton, { backgroundColor: colors.primary }]}
              onPress={takePhoto}
            >
              <Text style={styles.captureText}>📷 Take Photo</Text>
            </TouchableOpacity>
            <Text style={[styles.instruction, { color: colors.secondary }]}>
              Position the receipt in the frame
            </Text>
          </View>
        ) : (
          <View style={styles.resultContainer}>
            {photoUri && (
              <Image source={{ uri: photoUri }} style={styles.previewImage} />
            )}
            
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
                style={[styles.button, { backgroundColor: colors.danger }]}
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
    height: 400,
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
  text: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 40,
  },
  subtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});
