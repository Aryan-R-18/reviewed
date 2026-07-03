import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';

// Simple log data mimicking your exact examples
const activityLogs = [
  {
    id: '1',
    action: 'visited',
    text: 'Visited Morocco',
    date: 'June 2026',
    icon: 'plane',
  },
  {
    id: '2',
    action: 'rated',
    text: 'Rated Sambalpur 4.2 stars',
    date: 'May 2026',
    icon: 'star',
  },
  {
    id: '3',
    action: 'saved',
    text: 'Saved Brazil to "To Visit"',
    date: 'April 2026',
    icon: 'bookmark',
  },
  {
    id: '4',
    action: 'listed',
    text: 'Added Paris in "Romantic Places" list',
    date: 'March 2026',
    icon: 'list-ul',
  },
  {
    id: '5',
    action: 'review',
    text: 'Wrote a review for Kyoto Bamboo Forest',
    date: 'January 2026',
    icon: 'pencil',
  }
];

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Activity Log</Text>
        <TouchableOpacity style={styles.filterButton}>
          <FontAwesome name="filter" size={18} color="#a7a6ff" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {activityLogs.map((log, index) => {
          const isLast = index === activityLogs.length - 1;

          return (
            <View key={log.id} style={styles.logRow}>
              
              {/* Left Side: Minimal Timeline Graphic */}
              <View style={styles.timelineGraphic}>
                <View style={styles.dot} />
                {!isLast && <View style={styles.line} />}
              </View>

              {/* Right Side: Quick Action Log */}
              <View style={styles.logCard}>
                <View style={styles.iconBox}>
                  <FontAwesome name={log.icon as any} size={16} color="#a7a6ff" />
                </View>
                
                <View style={styles.logTextContainer}>
                  <Text style={styles.logText}>{log.text}</Text>
                  <Text style={styles.logDate}>{log.date}</Text>
                </View>
              </View>

            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#434343' },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 25 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#ffffff' },
  filterButton: { width: 40, height: 40, backgroundColor: '#333333', borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#434343' },
  
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  
  logRow: { flexDirection: 'row', minHeight: 70 },
  
  // Timeline Line & Dot
  timelineGraphic: { width: 30, alignItems: 'center', marginRight: 10 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#a7a6ff', zIndex: 1, marginTop: 20 },
  line: { width: 2, backgroundColor: '#666666', flex: 1, position: 'absolute', top: 25, bottom: -20 },
  
  // The Log Entry
  logCard: { flex: 1, backgroundColor: '#333333', borderRadius: 12, padding: 15, marginBottom: 15, flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(167, 166, 255, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  
  logTextContainer: { flex: 1, justifyContent: 'center' },
  logText: { fontSize: 15, fontWeight: '600', color: '#ffffff', marginBottom: 4, lineHeight: 20 },
  logDate: { fontSize: 12, color: '#a7a6ff' },
});