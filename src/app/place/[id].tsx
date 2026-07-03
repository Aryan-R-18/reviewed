import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '../../utils/supabase'; // Pulls in our database!

const { height } = Dimensions.get('window');

export default function PlaceDetailsScreen() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  
  // State to track if the user is logged in
  const [session, setSession] = useState<any>(null);

  // When the screen loads, check if they are logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // This listens for when they successfully log in via the popup!
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Dummy data for the prototype
  const place = {
    title: 'The Alps',
    location: 'Switzerland',
    image: 'https://images.unsplash.com/photo-1531366936336-d63c646eb6e2?w=800&q=80',
    rating: '4.8',
    description: 'The Alps are the highest and most extensive mountain range system that lies entirely in Europe, stretching approximately 1,200 km across eight Alpine countries. A true paradise for hikers and skiers.',
  };

  // --- BUTTON LOGIC ---
  const handleVisited = () => {
    if (!session) {
      router.push('/login'); // Not logged in? Go to login!
    } else {
      router.push('/review'); // Logged in? Open the review modal!
    }
  };

  const handleToVisit = () => {
    if (!session) {
      router.push('/login');
    } else {
      // Future feature: Save to "To Visit" list in database
      alert('Added to your To Visit list!');
    }
  };

  const handleList = () => {
    if (!session) {
      router.push('/login');
    } else {
      // Future feature: Open list selector
      alert('Opening your custom lists...');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* Hero Image */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: place.image }} style={styles.heroImage} />
          
          <TouchableOpacity 
            style={[styles.backButton, { top: insets.top + 10 }]} 
            onPress={() => router.back()}
          >
            <FontAwesome name="angle-left" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Content Details */}
        <View style={styles.contentContainer}>
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.title}>{place.title}</Text>
              <Text style={styles.location}>
                <FontAwesome name="map-marker" size={14} color="#a7a6ff" /> {place.location}
              </Text>
            </View>
            <View style={styles.ratingBadge}>
              <FontAwesome name="star" size={16} color="#a7a6ff" />
              <Text style={styles.ratingText}>{place.rating}</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionButton} onPress={handleVisited}>
              <FontAwesome name="check-circle-o" size={20} color="#ffffff" style={styles.actionIcon} />
              <Text style={styles.actionText}>Visited</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton} onPress={handleToVisit}>
              <FontAwesome name="bookmark-o" size={20} color="#ffffff" style={styles.actionIcon} />
              <Text style={styles.actionText}>To Visit</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton} onPress={handleList}>
              <FontAwesome name="list-ul" size={20} color="#ffffff" style={styles.actionIcon} />
              <Text style={styles.actionText}>List</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.description}>{place.description}</Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#434343' },
  
  imageContainer: { width: '100%', height: height * 0.45, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  backButton: { position: 'absolute', left: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  
  contentContainer: { padding: 20, backgroundColor: '#434343', borderTopLeftRadius: 25, borderTopRightRadius: 25, marginTop: -25 },
  
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 25 },
  title: { fontSize: 32, fontWeight: '900', color: '#ffffff', marginBottom: 5 },
  location: { fontSize: 16, color: '#d3d3d3', fontWeight: '500' },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#333333', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#a7a6ff' },
  ratingText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', marginLeft: 6 },
  
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  actionButton: { flex: 1, backgroundColor: '#333333', marginHorizontal: 5, paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#666666' },
  actionIcon: { marginBottom: 5 },
  actionText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#a7a6ff', marginBottom: 10 },
  description: { fontSize: 15, color: '#d3d3d3', lineHeight: 24 },
});