import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, Keyboard, Text, Dimensions } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../utils/supabase';

const { width } = Dimensions.get('window');

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchedPlace, setSearchedPlace] = useState<{ lat: number; lng: number; name: string } | null>(null);
  
  const [showOptionsCard, setShowOptionsCard] = useState(false);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    Keyboard.dismiss();
    setSearching(true);
    setShowOptionsCard(false); 

    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant location permissions to search.');
        setSearching(false);
        return;
      }

      const geocodedLocation = await Location.geocodeAsync(searchQuery);

      if (geocodedLocation && geocodedLocation.length > 0) {
        const { latitude, longitude } = geocodedLocation[0];
        
        const newPlace = {
          lat: latitude,
          lng: longitude,
          name: searchQuery, 
        };

        setSearchedPlace(newPlace);

        mapRef.current?.animateToRegion({
          latitude,
          longitude,
          latitudeDelta: 0.05, 
          longitudeDelta: 0.05,
        }, 1000); 

      } else {
        Alert.alert('Not Found', 'Could not find that location.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Something went wrong while searching.');
    } finally {
      setSearching(false);
    }
  };

  const syncPlaceToDatabase = async () => {
    if (!searchedPlace) return null;
    
    const { data: existingPlace } = await supabase
      .from('places')
      .select('id')
      .eq('title', searchedPlace.name)
      .single();

    if (existingPlace) {
      return existingPlace.id;
    }

    const { data: newPlace, error } = await supabase
      .from('places')
      .insert({
        title: searchedPlace.name,
        location: `${searchedPlace.lat.toFixed(2)}, ${searchedPlace.lng.toFixed(2)}`, 
        image_url: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80', 
      })
      .select('id')
      .single();

    if (error) {
      console.error("Sync Error:", error);
      return null;
    }
    return newPlace.id;
  };

  const handleVisited = async () => {
    if (!session) return router.push('/login');
    
    setProcessingAction('visited');
    const placeId = await syncPlaceToDatabase();
    setProcessingAction(null);

    if (placeId) {
      router.push({ pathname: '/review', params: { placeId } });
    } else {
      Alert.alert('Error', 'Could not process this location.');
    }
  };

  const handleToVisit = async () => {
    if (!session) return router.push('/login');

    setProcessingAction('tovisit');
    const placeId = await syncPlaceToDatabase();
    
    if (placeId) {
      const { error } = await supabase
        .from('bookmarks')
        .insert({ user_id: session.user.id, place_id: placeId });

      if (error && error.code === '23505') {
        Alert.alert('Already Saved', 'This is already in your To Visit list!');
      } else if (error) {
        Alert.alert('Error', 'Could not save bookmark.');
      } else {
        Alert.alert('Saved!', `${searchedPlace?.name} added to your To Visit list.`);
        setShowOptionsCard(false); // Hide the card after successful save
      }
    }
    setProcessingAction(null);
  };

  const handleAddToList = () => {
    Alert.alert('Coming Soon', 'Custom lists feature will be added shortly!');
  };

  return (
    <View style={styles.container}>
      <MapView 
        ref={mapRef}
        style={styles.map} 
        initialRegion={{
          latitude: 20.2961, 
          longitude: 85.8245,
          latitudeDelta: 5.0,
          longitudeDelta: 5.0,
        }}
        userInterfaceStyle="dark" 
        onPress={() => setShowOptionsCard(false)} 
      >
        {searchedPlace && (
          <Marker 
            coordinate={{ latitude: searchedPlace.lat, longitude: searchedPlace.lng }}
            pinColor="red"
            onPress={(e) => {
              e.stopPropagation(); // Stops the map from doing weird native selections
              setShowOptionsCard(true); // Shows our custom card
            }}
          >
            {/* THIS IS THE FIX: Completely hides the tiny white native box */}
            <Callout tooltip={true}>
              <View /> 
            </Callout>
          </Marker>
        )}
      </MapView>

      <View style={[styles.searchContainer, { top: insets.top + 10 }]}>
        <View style={styles.searchBox}>
          <FontAwesome name="search" size={18} color="#a0a0a0" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for any place..."
            placeholderTextColor="#a0a0a0"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searching ? (
            <ActivityIndicator size="small" color="#a7a6ff" style={styles.searchActionBtn} />
          ) : (
            <TouchableOpacity onPress={handleSearch} style={styles.searchActionBtn}>
              <Text style={styles.goText}>Go</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* CUSTOM BOTTOM CARD */}
      {showOptionsCard && searchedPlace && (
        <View style={styles.bottomCard}>
          <Text style={styles.cardTitle}>{searchedPlace.name}</Text>
          <Text style={styles.cardSubtitle}>What would you like to do?</Text>

          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#a7a6ff' }]} onPress={handleVisited} disabled={processingAction !== null}>
              {processingAction === 'visited' ? (
                <ActivityIndicator size="small" color="#1c1c1c" />
              ) : (
                <>
                  <FontAwesome name="check-circle" size={16} color="#1c1c1c" style={{ marginRight: 6 }} />
                  <Text style={[styles.actionBtnText, { color: '#1c1c1c' }]}>Visited</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={handleToVisit} disabled={processingAction !== null}>
              {processingAction === 'tovisit' ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <FontAwesome name="bookmark-o" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.actionBtnText}>To Visit</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={handleAddToList}>
              <FontAwesome name="list-ul" size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.actionBtnText}>+ List</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#333333' },
  map: { width: '100%', height: '100%' },
  
  searchContainer: { position: 'absolute', width: '100%', paddingHorizontal: 20, zIndex: 10 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#434343', borderRadius: 25, paddingHorizontal: 15, height: 50, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: '#ffffff', fontSize: 16 },
  searchActionBtn: { padding: 5, paddingLeft: 15 },
  goText: { color: '#a7a6ff', fontWeight: 'bold', fontSize: 16 },

  bottomCard: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    width: width - 40,
    backgroundColor: '#1c1c1c',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#434343'
  },
  cardTitle: { color: '#ffffff', fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  cardSubtitle: { color: '#a0a0a0', fontSize: 14, marginBottom: 20 },
  
  actionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  actionBtn: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#434343', 
    paddingVertical: 12, 
    borderRadius: 12,
    marginHorizontal: 4
  },
  actionBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
});