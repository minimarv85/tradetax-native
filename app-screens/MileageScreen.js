import React, { useState, useContext, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, FlatList } from 'react-native';
import { AuthContext } from '../App';
import { supabase } from '../app-lib/supabase';

const mileageRates = [
  { name: 'Cars (first 10,000 miles)', rate: 0.45 },
  { name: 'Cars (over 10,000 miles)', rate: 0.25 },
  { name: 'Motorcycles', rate: 0.24 },
  { name: 'Bicycles', rate: 0.20 },
];

export default function MileageScreen({ navigation }) {
  const authContext = useContext(AuthContext);
  const { session, colors } = authContext || {};
  const [trips, setTrips] = useState([]);
  const [distance, setDistance] = useState('');
  const [purpose, setPurpose] = useState('');
  const [vehicleType, setVehicleType] = useState('Cars (first 10,000 miles)');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    if (!session?.user?.id) return;
    
    const { data } = await supabase
      .from('mileage_trips')
      .select('*')
      .eq('user_id', session.user.id)
      .order('date', { ascending: false });
    
    if (data) setTrips(data);
  };

  const calculateDeduction = (distance, vehicleType) => {
    const rate = mileageRates.find(r => r.name === vehicleType)?.rate || 0.45;
    return distance * rate;
  };

  const handleSaveTrip = async () => {
    if (!distance || !purpose) {
      Alert.alert('Error', 'Please fill in distance and purpose');
      return;
    }

    setLoading(true);
    const deduction = calculateDeduction(parseFloat(distance), vehicleType);

    const { error } = await supabase
      .from('mileage_trips')
      .insert([{
        user_id: session.user.id,
        distance: parseFloat(distance),
        purpose,
        vehicle_type: vehicleType,
        rate: mileageRates.find(r => r.name === vehicleType)?.rate,
        deduction,
        date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString()
      }]);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', `Trip saved! Tax deduction: £${deduction.toFixed(2)}`, [
        { text: 'OK', onPress: () => {
          setDistance('');
          setPurpose('');
          fetchTrips();
        }}
      ]);
    }
    setLoading(false);
  };

  const totalDeduction = trips.reduce((sum, trip) => sum + (trip.deduction || 0), 0);
  const totalMiles = trips.reduce((sum, trip) => sum + (trip.distance || 0), 0);

  const renderTripItem = ({ item }) => (
    <View style={[styles.tripCard, { backgroundColor: colors.card }]}>
      <View style={styles.tripRow}>
        <Text style={[styles.tripDate, { color: colors.secondary }]}>{item.date}</Text>
        <Text style={[styles.tripAmount, { color: colors.success }]}>-£{parseFloat(item.deduction || 0).toFixed(2)}</Text>
      </View>
      <Text style={[styles.tripPurpose, { color: colors.text }]}>{item.purpose}</Text>
      <Text style={[styles.tripDetails, { color: colors.secondary }]}>
        {item.distance} miles • {item.vehicle_type}
      </Text>
    </View>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Mileage Tracker</Text>

        {/* Summary */}
        <View style={[styles.summaryCard, { backgroundColor: colors.primary }]}>
          <Text style={styles.summaryLabel}>Total Deduction</Text>
          <Text style={styles.summaryValue}>£{totalDeduction.toFixed(2)}</Text>
          <Text style={[styles.summarySub, { color: 'rgba(255,255,255,0.8)' }]}>
            {totalMiles.toFixed(1)} miles claimed
          </Text>
        </View>

        {/* Add Trip */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Log a Trip</Text>
          
          <Text style={[styles.label, { color: colors.text }]}>Distance (miles)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            value={distance}
            onChangeText={setDistance}
            placeholder="0.0"
            placeholderTextColor={colors.secondary}
            keyboardType="decimal-pad"
          />

          <Text style={[styles.label, { color: colors.text }]}>Purpose</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            value={purpose}
            onChangeText={setPurpose}
            placeholder="Client visit, site visit, etc."
            placeholderTextColor={colors.secondary}
          />

          <Text style={[styles.label, { color: colors.text }]}>Vehicle Type</Text>
          <View style={styles.rateList}>
            {mileageRates.map((rate) => (
              <TouchableOpacity
                key={rate.name}
                style={[
                  styles.rateItem,
                  vehicleType === rate.name && { backgroundColor: colors.primary }
                ]}
                onPress={() => setVehicleType(rate.name)}
              >
                <Text style={[
                  styles.rateText,
                  vehicleType === rate.name && { color: '#FFFFFF' }
                ]}>
                  {rate.name}: £{rate.rate}/mile
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.deductionPreview, { color: colors.success }]}>
            Tax deduction: £{calculateDeduction(parseFloat(distance || 0), vehicleType).toFixed(2)}
          </Text>

          <TouchableOpacity 
            style={[styles.button, { backgroundColor: colors.success }]}
            onPress={handleSaveTrip}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Saving...' : 'Save Trip'}</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Trips */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Trips</Text>
        {trips.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.secondary }]}>No trips logged yet</Text>
        ) : (
          <FlatList
            data={trips}
            renderItem={renderTripItem}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  summaryCard: { borderRadius: 12, padding: 20, alignItems: 'center', marginBottom: 16 },
  summaryLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  summaryValue: { color: '#FFFFFF', fontSize: 32, fontWeight: 'bold', marginVertical: 8 },
  summarySub: { fontSize: 12 },
  card: { borderRadius: 12, padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 12 },
  rateList: { marginBottom: 12 },
  rateItem: { padding: 10, borderRadius: 8, marginBottom: 8, backgroundColor: '#F3F4F6' },
  rateText: { fontSize: 14, color: '#1F2937' },
  deductionPreview: { fontSize: 16, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  button: { borderRadius: 8, padding: 16, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, marginTop: 8 },
  tripCard: { borderRadius: 12, padding: 12, marginBottom: 8 },
  tripRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  tripDate: { fontSize: 12 },
  tripAmount: { fontSize: 16, fontWeight: 'bold' },
  tripPurpose: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  tripDetails: { fontSize: 12 },
  emptyText: { fontSize: 14, textAlign: 'center', padding: 20 },
});
