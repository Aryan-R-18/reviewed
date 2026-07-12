import { FontAwesome } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Dimensions, Keyboard, ScrollView,
  StyleSheet, Switch, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { supabase } from '../../utils/supabase';

const { width } = Dimensions.get('window');

type Place = { lat: number; lng: number; name: string };

// Leaflet HTML — full map with OSM tiles, no API key needed
function buildLeafletHTML(lat: number, lng: number, zoom: number, markerLat?: number, markerLng?: number) {
  const markerScript = (markerLat !== undefined && markerLng !== undefined) ? `
    var marker = L.marker([${markerLat}, ${markerLng}], {
      icon: L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
      })
    }).addTo(map);
    marker.on('click', function() {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerClick' }));
    });
  ` : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; background: #1c1c1c; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: true, attributionControl: false }).setView([${lat}, ${lng}], ${zoom});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);
    map.on('click', function() {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapClick' }));
    });
    ${markerScript}
  </script>
</body>
</html>`;
}

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<any>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchedPlace, setSearchedPlace] = useState<Place | null>(null);
  const [showOptionsCard, setShowOptionsCard] = useState(false);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [cardStep, setCardStep] = useState<'main' | 'select_list' | 'list_options'>('main');
  const [userLists, setUserLists] = useState<any[]>([]);
  const [selectedList, setSelectedList] = useState<any>(null);
  const [listStatus, setListStatus] = useState<'VISITED' | 'TO VISIT'>('VISITED');
  const [addToProfile, setAddToProfile] = useState(false);

  // Initial map center — world view
  const [mapHtml, setMapHtml] = useState(() => buildLeafletHTML(20, 0, 2));

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
  }, []);

  const flyToLocation = (lat: number, lng: number, name: string) => {
    const html = buildLeafletHTML(lat, lng, 13, lat, lng);
    setMapHtml(html);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    Keyboard.dismiss();
    setSearching(true);
    resetCard();
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant location permissions.');
        setSearching(false);
        return;
      }
      const results = await Location.geocodeAsync(searchQuery);
      if (results?.length > 0) {
        const { latitude, longitude } = results[0];
        const place: Place = { lat: latitude, lng: longitude, name: searchQuery };
        setSearchedPlace(place);
        flyToLocation(latitude, longitude, searchQuery);
      } else {
        Alert.alert('Not Found', 'Could not find that location.');
      }
    } catch (e) {
      Alert.alert('Error', 'Something went wrong while searching.');
    } finally {
      setSearching(false);
    }
  };

  const resetCard = () => {
    setShowOptionsCard(false);
    setCardStep('main');
    setSelectedList(null);
    setListStatus('VISITED');
    setAddToProfile(false);
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'markerClick' && searchedPlace) {
        setShowOptionsCard(true);
      } else if (data.type === 'mapClick') {
        resetCard();
      }
    } catch (_) {}
  };

  const syncPlaceToDatabase = async () => {
    if (!searchedPlace) return null;
    const { data: existing } = await supabase.from('places').select('id').eq('title', searchedPlace.name).single();
    if (existing) return existing.id;
    const { data: newPlace, error } = await supabase.from('places').insert({
      title: searchedPlace.name,
      location: `${searchedPlace.lat.toFixed(2)}, ${searchedPlace.lng.toFixed(2)}`,
      image_url: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80',
    }).select('id').single();
    if (error) { console.error('Sync Error:', error); return null; }
    return newPlace.id;
  };

  const handleVisited = async () => {
    if (!session) return router.push('/login');
    setProcessingAction('visited');
    const placeId = await syncPlaceToDatabase();
    setProcessingAction(null);
    if (placeId) { router.push({ pathname: '/review', params: { placeId, actionType: 'visited' } }); resetCard(); }
    else Alert.alert('Error', 'Could not process this location.');
  };

  const handleToVisit = async () => {
    if (!session) return router.push('/login');
    setProcessingAction('tovisit');
    const placeId = await syncPlaceToDatabase();
    setProcessingAction(null);
    if (placeId) { router.push({ pathname: '/review', params: { placeId, actionType: 'tovisit' } }); resetCard(); }
    else Alert.alert('Error', 'Could not process this location.');
  };

  const startListFlow = async () => {
    if (!session) return router.push('/login');
    setCardStep('select_list');
    const { data } = await supabase.from('custom_lists').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
    if (data) setUserLists(data);
  };

  const handleContinueWithList = async () => {
    setProcessingAction('list');
    const placeId = await syncPlaceToDatabase();
    setProcessingAction(null);
    if (placeId) {
      router.push({ pathname: '/review', params: { placeId, actionType: 'list', listId: selectedList?.id, listStatus, addToProfile: addToProfile ? 'true' : 'false' } });
      resetCard();
    } else Alert.alert('Error', 'Could not process this location.');
  };

  return (
    <View style={styles.container}>
      {/* Leaflet Map via WebView */}
      <WebView
        ref={webViewRef}
        source={{ html: mapHtml }}
        style={styles.map}
        onMessage={handleWebViewMessage}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        scrollEnabled={false}
      />

      {/* Search Bar */}
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
          {searching
            ? <ActivityIndicator size="small" color="#a7a6ff" style={styles.searchActionBtn} />
            : <TouchableOpacity onPress={handleSearch} style={styles.searchActionBtn}><Text style={styles.goText}>Go</Text></TouchableOpacity>
          }
        </View>
      </View>

      {/* Bottom Action Card */}
      {showOptionsCard && searchedPlace && (
        <View style={styles.bottomCard}>

          {cardStep === 'main' && (
            <View>
              <Text style={styles.cardTitle}>{searchedPlace.name}</Text>
              <Text style={styles.cardSubtitle}>What would you like to do?</Text>
              <View style={styles.actionRow}>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#a7a6ff' }]} onPress={handleVisited} disabled={processingAction !== null}>
                  {processingAction === 'visited'
                    ? <ActivityIndicator size="small" color="#1c1c1c" />
                    : <><FontAwesome name="check-circle" size={16} color="#1c1c1c" style={{ marginRight: 6 }} /><Text style={[styles.actionBtnText, { color: '#1c1c1c' }]}>Visited</Text></>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={handleToVisit} disabled={processingAction !== null}>
                  {processingAction === 'tovisit'
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <><FontAwesome name="bookmark-o" size={16} color="#fff" style={{ marginRight: 6 }} /><Text style={styles.actionBtnText}>To Visit</Text></>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={startListFlow}>
                  <FontAwesome name="list-ul" size={16} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.actionBtnText}>+ List</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {cardStep === 'select_list' && (
            <View>
              <View style={styles.cardHeaderRow}>
                <TouchableOpacity onPress={() => setCardStep('main')} style={styles.backArrow}><FontAwesome name="arrow-left" size={18} color="#a0a0a0" /></TouchableOpacity>
                <Text style={styles.cardTitleSmall}>Select a Folder</Text>
              </View>
              <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
                {userLists.map((list) => (
                  <TouchableOpacity key={list.id} style={styles.listItemBtn} onPress={() => { setSelectedList(list); setCardStep('list_options'); }}>
                    <FontAwesome name="folder" size={16} color="#a7a6ff" style={{ marginRight: 10 }} />
                    <Text style={styles.listItemText}>{list.name}</Text>
                    <FontAwesome name="angle-right" size={16} color="#666" />
                  </TouchableOpacity>
                ))}
                {userLists.length === 0 && <Text style={styles.emptyListText}>No lists found. Create one in your Profile!</Text>}
              </ScrollView>
            </View>
          )}

          {cardStep === 'list_options' && selectedList && (
            <View>
              <View style={styles.cardHeaderRow}>
                <TouchableOpacity onPress={() => setCardStep('select_list')} style={styles.backArrow}><FontAwesome name="arrow-left" size={18} color="#a0a0a0" /></TouchableOpacity>
                <Text style={styles.cardTitleSmall}>Adding to {selectedList.name}</Text>
              </View>
              <Text style={styles.optionLabel}>Status in this folder:</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity style={[styles.toggleBtn, listStatus === 'VISITED' && styles.toggleBtnActive]} onPress={() => setListStatus('VISITED')}>
                  <Text style={[styles.toggleBtnText, listStatus === 'VISITED' && { color: '#1c1c1c' }]}>Visited</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.toggleBtn, listStatus === 'TO VISIT' && styles.toggleBtnActive]} onPress={() => setListStatus('TO VISIT')}>
                  <Text style={[styles.toggleBtnText, listStatus === 'TO VISIT' && { color: '#1c1c1c' }]}>To Visit</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.switchLabel}>Add to main profile?</Text>
                  <Text style={styles.switchSub}>Also saves to your main {listStatus.toLowerCase()} tab.</Text>
                </View>
                <Switch value={addToProfile} onValueChange={setAddToProfile} trackColor={{ false: '#333333', true: '#a7a6ff' }} thumbColor="#ffffff" />
              </View>
              <TouchableOpacity style={styles.continueListBtn} onPress={handleContinueWithList} disabled={processingAction !== null}>
                {processingAction === 'list'
                  ? <ActivityIndicator size="small" color="#1c1c1c" />
                  : <Text style={styles.continueListBtnText}>Continue to Photo</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1c1c1c' },
  map: { flex: 1 },
  searchContainer: { position: 'absolute', width: '100%', paddingHorizontal: 20, zIndex: 10 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#434343', borderRadius: 25, paddingHorizontal: 15, height: 50, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: '#ffffff', fontSize: 16 },
  searchActionBtn: { padding: 5, paddingLeft: 15 },
  goText: { color: '#a7a6ff', fontWeight: 'bold', fontSize: 16 },
  bottomCard: { position: 'absolute', bottom: 30, alignSelf: 'center', width: width - 40, backgroundColor: '#1c1c1c', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 15, elevation: 10, borderWidth: 1, borderColor: '#434343' },
  cardTitle: { color: '#ffffff', fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  cardSubtitle: { color: '#a0a0a0', fontSize: 14, marginBottom: 20 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#434343', paddingVertical: 12, borderRadius: 12, marginHorizontal: 4 },
  actionBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  backArrow: { padding: 5, marginRight: 10 },
  cardTitleSmall: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  listItemBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#434343', padding: 15, borderRadius: 12, marginBottom: 10 },
  listItemText: { flex: 1, color: '#ffffff', fontSize: 16, fontWeight: '500' },
  emptyListText: { color: '#a0a0a0', textAlign: 'center', padding: 20, fontStyle: 'italic' },
  optionLabel: { color: '#a0a0a0', fontSize: 14, marginBottom: 10 },
  toggleRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  toggleBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#434343', alignItems: 'center' },
  toggleBtnActive: { backgroundColor: '#a7a6ff' },
  toggleBtnText: { color: '#ffffff', fontWeight: 'bold' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#333333', padding: 15, borderRadius: 12, marginBottom: 20 },
  switchLabel: { color: '#ffffff', fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  switchSub: { color: '#a0a0a0', fontSize: 11 },
  continueListBtn: { backgroundColor: '#a7a6ff', padding: 15, borderRadius: 12, alignItems: 'center' },
  continueListBtnText: { color: '#1c1c1c', fontWeight: 'bold', fontSize: 16 },
});
