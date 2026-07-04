import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../utils/supabase';

const { width } = Dimensions.get('window');
// Made the cards smaller: 45% of the screen width
const CARD_WIDTH = width * 0.45; 
const GEOAPIFY_API_KEY = process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY!;

const CATEGORY_IMAGES = {
  visited: [
    'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800&q=80',
    'https://images.unsplash.com/photo-1668524475551-96a74f88cdf3?w=600&q=80',
    'https://images.unsplash.com/photo-1554444699-2603e75b7b44?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8dG9wJTIwdmlzaXRlZCUyMHBsYWNlc3xlbnwwfHwwfHx8MA%3D%3D',
    'https://images.unsplash.com/photo-1605036687969-9c2878c7395b?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTB8fHRvcCUyMHZpc2l0ZWQlMjBwbGFjZXN8ZW58MHx8MHx8fDA%3D',
  ],
  historical: [
    'https://plus.unsplash.com/premium_photo-1661963952208-2db3512ef3de?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8Y29sb3NzZW98ZW58MHx8MHx8fDA%3D',
    'https://plus.unsplash.com/premium_photo-1700828949362-b7c4900551fe?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8YmFzaWxpY2ElMjBkaSUyMHNhbnxlbnwwfHwwfHx8MA%3D%3D',
    'https://images.unsplash.com/photo-1542820229-081e0c12af0b?w=800&q=80',
    'https://plus.unsplash.com/premium_photo-1676391399721-87078f87da25?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8cGFudGhlb258ZW58MHx8MHx8fDA%3D',
    'https://images.unsplash.com/photo-1557741999-ff7ded52cde5?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8Y2FzdGVsJTIwc2FudCUyMGFuZ2Vsb3xlbnwwfHwwfHx8MA%3D%3D',
    'https://images.unsplash.com/photo-1666727803564-74533995629e?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8cGFvbG8lMjBmdW9yaXxlbnwwfHwwfHx8MA%3D%3D',
    'https://images.unsplash.com/photo-1739874729849-2039afb19389?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8cGlhenolMjBkaSUyMHNwYWduYXxlbnwwfHwwfHx8MA%3D%3D',
    'https://images.unsplash.com/photo-1704215000884-c1f36ba716c8?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8cm9tZSUyMGhpc3RvcmljYWwlMjBwbGFjZXxlbnwwfHwwfHx8MA%3D%3D',
  ],
  beaches: [
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
    'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&q=80',
    'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800&q=80',
    'https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=800&q=80',
  ],
  romantic: [
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR9oIEO44Rv4cN73mLkZpl7oHgXCAmyV1tZPGl7AzyBSQ&s=10',
    'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=800&q=80',
    'https://images.unsplash.com/photo-1529154036614-a60975f5c760?w=800&q=80',
    'https://images.unsplash.com/photo-1532453288672-3a27e9be9efd?w=800&q=80',
  ]
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [firstName, setFirstName] = useState('Explorer');
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  const [visitedPlaces, setVisitedPlaces] = useState<any[]>([]);
  const [historicalPlaces, setHistoricalPlaces] = useState<any[]>([]);
  const [beachPlaces, setBeachPlaces] = useState<any[]>([]);
  const [romanticPlaces, setRomanticPlaces] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.user_metadata?.full_name) {
        setFirstName(session.user.user_metadata.full_name.split(' ')[0]);
      }
    });
    
    fetchAllCategories();
  }, []);

  const fetchCategoryData = async (category: string, lat: number, lon: number, imageKey: keyof typeof CATEGORY_IMAGES) => {
    try {
      const url = `https://api.geoapify.com/v2/places?categories=${category}&filter=circle:${lon},${lat},10000&limit=8&apiKey=${GEOAPIFY_API_KEY}`;
      const response = await fetch(url);
      const result = await response.json();

      if (result.features) {
        return result.features.map((item: any, index: number) => ({
          id: item.properties.place_id,
          rank: index + 1,
          title: item.properties.name || 'Hidden Gem',
          location: item.properties.city || item.properties.country || 'Global Destination',
          image_url: CATEGORY_IMAGES[imageKey][index % CATEGORY_IMAGES[imageKey].length],
          is_api: true
        })).filter((item: any) => item.title !== 'Hidden Gem');
      }
      return [];
    } catch (error) {
      console.error(`Fetch Error for ${category}:`, error);
      return [];
    }
  };

  const fetchAllCategories = async () => {
    setLoading(true);
    const [visited, historical, beaches, romantic] = await Promise.all([
      fetchCategoryData('tourism.sights', 48.85, 2.35, 'visited'), 
      fetchCategoryData('heritage', 41.89, 12.49, 'historical'), 
      fetchCategoryData('beach', -8.72, 115.18, 'beaches'), 
      fetchCategoryData('tourism.sights', 45.43, 10.33, 'romantic'), 
    ]);

    setVisitedPlaces(visited);
    setHistoricalPlaces(historical);
    setBeachPlaces(beaches);
    setRomanticPlaces(romantic);
    setLoading(false);
  };

  const handlePlaceClick = async (place: any) => {
    if (!session) {
      Alert.alert('Login Required', 'Please log in to review places.');
      router.push('/login');
      return;
    }

    setProcessingId(place.id);
    let finalPlaceId = place.id;

    try {
      const { data: existingPlace } = await supabase
        .from('places')
        .select('id')
        .eq('title', place.title)
        .single();

      if (existingPlace) {
        finalPlaceId = existingPlace.id; 
      } else {
        const { data: newPlace, error } = await supabase
          .from('places')
          .insert({
            title: place.title,
            location: place.location,
            image_url: place.image_url,
          })
          .select('id')
          .single();

        if (error) throw error;
        if (newPlace) finalPlaceId = newPlace.id; 
      }

      router.push({ pathname: '/review', params: { placeId: finalPlaceId } });
    } catch (error) {
      console.error("Error syncing place:", error);
      Alert.alert('Error', 'Could not open this location.');
    } finally {
      setProcessingId(null);
    }
  };

  const renderPlaceCard = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.cardContainer} 
      activeOpacity={0.9}
      onPress={() => handlePlaceClick(item)}
      disabled={processingId === item.id}
    >
      <ImageBackground source={{ uri: item.image_url }} style={styles.cardImage} imageStyle={{ borderRadius: 20 }}>
        
        {/* Netflix-Style Rank Number */}
        <Text style={styles.netflixRankText}>{item.rank}</Text>

        <View style={styles.cardOverlay}>
          <View style={styles.cardTopRow}>
            {processingId === item.id && (
              <View style={styles.syncLoader}>
                <ActivityIndicator size="small" color="#ffffff" />
              </View>
            )}
          </View>
          
          <View style={styles.cardBottomInfo}>
            <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
            <View style={styles.locationBadge}>
              <FontAwesome name="map-marker" size={10} color="#a7a6ff" />
              <Text style={styles.locationText} numberOfLines={1}>{item.location}</Text>
            </View>
          </View>
          
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );

  const renderSection = (title: string, subtitle: string, data: any[]) => {
    if (data.length === 0) return null; 
    return (
      <View style={styles.sectionWrapper}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        </View>
        <FlatList
          data={data}
          renderItem={renderPlaceCard}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH + 15}
          decelerationRate="fast"
          contentContainerStyle={styles.horizontalList}
        />
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      
      <View style={styles.header}>
        <View>
          <Text style={styles.greetingText}>Welcome,</Text>
          <Text style={styles.headerTitle}>{firstName}</Text>
        </View>
        <TouchableOpacity style={styles.searchIcon}>
          <FontAwesome name="search" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#a7a6ff" />
          <Text style={styles.loaderText}>Discovering the world...</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {renderSection("Top Visited Places", "Trending globally this week", visitedPlaces)}
          {renderSection("Historical Sights", "Step back in time", historicalPlaces)}
          {renderSection("Top Beaches", "Sun, sand, and sea", beachPlaces)}
          {renderSection("Romantic Getaways", "Perfect for couples", romanticPlaces)}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#333333' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
  greetingText: { fontSize: 16, color: '#a0a0a0', marginBottom: 2 },
  headerTitle: { fontSize: 32, fontWeight: '900', color: '#a7a6ff' },
  searchIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#434343', justifyContent: 'center', alignItems: 'center' },
  
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  loaderText: { color: '#a0a0a0', marginTop: 15, fontSize: 16, fontWeight: '500' },

  sectionWrapper: { marginBottom: 35 },
  sectionHeader: { paddingHorizontal: 20, marginBottom: 15 },
  sectionTitle: { fontSize: 22, fontWeight: 'bold', color: '#ffffff' },
  sectionSubtitle: { fontSize: 13, color: '#a0a0a0', marginTop: 4 },
  
  horizontalList: { paddingHorizontal: 20 },
  
  // Updated smaller card dimensions
  cardContainer: { width: CARD_WIDTH, height: 260, marginRight: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },
  cardImage: { flex: 1, justifyContent: 'flex-end' },
  cardOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 20, padding: 12, justifyContent: 'space-between' },
  
  // Netflix Ranking Style
  netflixRankText: {
    position: 'absolute',
    top: 5,
    right: 10,
    fontSize: 65,
    fontWeight: '900',
    color: '#a7a6ff', // Dark solid base inside
    // Purple Stroke Effect using text shadow
    textShadowColor: '#1c1c1c',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 2,
    zIndex: 10, 
  },

  cardTopRow: { flexDirection: 'row', justifyContent: 'flex-start' },
  syncLoader: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', marginTop: 5 },
  
  cardBottomInfo: { width: '100%' },
  // Adjusted text sizes slightly to fit the new narrower cards
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#ffffff', marginBottom: 4, textShadowColor: 'rgba(0, 0, 0, 0.75)', textShadowOffset: { width: -1, height: 1 }, textShadowRadius: 10 },
  locationBadge: { flexDirection: 'row', alignItems: 'center' },
  locationText: { color: '#e0e0e0', fontSize: 12, fontWeight: '600', marginLeft: 4, textShadowColor: 'rgba(0, 0, 0, 0.75)', textShadowOffset: { width: -1, height: 1 }, textShadowRadius: 5 },
});