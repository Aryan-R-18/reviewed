import { FontAwesome } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../utils/supabase';

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<any[]>([]);

  // Fetch Session
  useFocusEffect(
    useCallback(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        if (session?.user?.id) {
          fetchActivities(session.user.id);
        } else {
          setLoading(false);
        }
      });
    }, [])
  );

  const fetchActivities = async (userId: string) => {
    setLoading(true);
    try {
      let allActivities: any[] = [];

      // 1. Fetch Visited Places (Reviews)
      const { data: reviews } = await supabase
        .from('reviews')
        .select(`id, created_at, rating, places ( title, image_url )`)
        .eq('user_id', userId);

      if (reviews) {
        const reviewLogs = reviews.map((r: any) => ({
          id: `review_${r.id}`,
          type: 'visited',
          title: `You visited ${r.places?.title}`,
          subtitle: `Rated it ${r.rating} ${r.rating === 1 ? 'star' : 'stars'}`,
          date: r.created_at,
          image: r.places?.image_url,
          icon: 'check-circle',
          color: '#a7a6ff'
        }));
        allActivities = [...allActivities, ...reviewLogs];
      }

      // 2. Fetch To-Visit Places (Bookmarks)
      const { data: bookmarks } = await supabase
        .from('bookmarks')
        .select(`id, created_at, places ( title, image_url )`)
        .eq('user_id', userId);

      if (bookmarks) {
        const bookmarkLogs = bookmarks.map((b: any) => ({
          id: `bookmark_${b.id}`,
          type: 'tovisit',
          title: `Added ${b.places?.title}`,
          subtitle: 'Saved to your To-Visit list',
          date: b.created_at,
          image: b.places?.image_url,
          icon: 'bookmark',
          color: '#ff9f43'
        }));
        allActivities = [...allActivities, ...bookmarkLogs];
      }

      // 3. Fetch List Additions
      // First, get the user's custom lists to get their names and IDs
      const { data: lists } = await supabase
        .from('custom_lists')
        .select('id, name')
        .eq('user_id', userId);

      if (lists && lists.length > 0) {
        const listIds = lists.map(l => l.id);
        
        // Then get all items inside those lists
        const { data: listItems } = await supabase
          .from('list_items')
          .select(`id, list_id, status, created_at, place:places ( title, image_url )`)
          .in('list_id', listIds);

        if (listItems) {
          const listLogs = listItems.map((item: any) => {
            const folderName = lists.find(l => l.id === item.list_id)?.name || 'a folder';
            return {
              id: `listitem_${item.id}`,
              type: 'list',
              title: `Added ${item.place?.title} to '${folderName}'`,
              subtitle: `Marked as ${item.status}`,
              date: item.created_at,
              image: item.place?.image_url,
              icon: 'folder',
              color: '#4db8ff'
            };
          });
          allActivities = [...allActivities, ...listLogs];
        }
      }

      // 4. Sort everything by Date (Newest first)
      allActivities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setActivities(allActivities);
    } catch (error) {
      console.error("Error fetching activities:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderActivityItem = ({ item }: { item: any }) => (
    <View style={styles.activityCard}>
      {/* Left Icon */}
      <View style={[styles.iconContainer, { backgroundColor: `${item.color}20` }]}>
        <FontAwesome name={item.icon} size={20} color={item.color} />
      </View>
      
      {/* Middle Text */}
      <View style={styles.textContainer}>
        <Text style={styles.activityTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.activitySubtitle}>{item.subtitle}</Text>
        <Text style={styles.activityDate}>{formatDate(item.date)}</Text>
      </View>

      {/* Right Image */}
      <Image source={{ uri: item.image }} style={styles.activityImage} />
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <Image source={require('../../../assets/loader.gif')} style={{ width: 80, height: 80 }} />
      </View>
    );
  }
  
  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Activity</Text>
      </View>

      {!session ? (
        <View style={styles.guestState}>
          <Text style={styles.guestText}>Log in to see your travel history.</Text>
          <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/login')}>
            <Text style={styles.loginButtonText}>Log In / Sign Up</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={activities}
          renderItem={renderActivityItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.guestState}>
              <Text style={styles.guestText}>No activities yet. Start mapping your journey!</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#333333' },
  center: { justifyContent: 'center', alignItems: 'center' },
  
  header: { paddingHorizontal: 20, marginBottom: 20 },
  headerTitle: { fontSize: 32, fontWeight: '900', color: '#a7a6ff' },

  listContent: { paddingHorizontal: 20, paddingBottom: 40 },

  activityCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#434343', 
    borderRadius: 16, 
    padding: 15, 
    marginBottom: 15 
  },
  
  iconContainer: { 
    width: 46, 
    height: 46, 
    borderRadius: 23, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginRight: 15 
  },
  
  textContainer: { flex: 1, marginRight: 10 },
  activityTitle: { color: '#ffffff', fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  activitySubtitle: { color: '#d3d3d3', fontSize: 13, marginBottom: 6 },
  activityDate: { color: '#a0a0a0', fontSize: 11, fontWeight: '600' },
  
  activityImage: { 
    width: 60, 
    height: 60, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#555'
  },

  guestState: { alignItems: 'center', justifyContent: 'center', marginTop: 80, padding: 20 },
  guestText: { color: '#a0a0a0', fontSize: 16, marginBottom: 20, textAlign: 'center' },
  loginButton: { backgroundColor: '#a7a6ff', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  loginButtonText: { color: '#1c1c1c', fontWeight: 'bold', fontSize: 16 },
});