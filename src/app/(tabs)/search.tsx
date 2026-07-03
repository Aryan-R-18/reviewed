// import React from 'react';
// import { View, Text, StyleSheet, TextInput, ScrollView, Image, Dimensions, TouchableOpacity } from 'react-native';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';
// import { FontAwesome } from '@expo/vector-icons'; // Using the icons we installed earlier!

// const { height } = Dimensions.get('window');

// // Mock data for the bottom sheet
// const nearbyPlaces = [
//   { id: '1', title: 'Grand Canyon', distance: '12 km away', type: 'Nature', rating: '4.9' },
//   { id: '2', title: 'Neon Museum', distance: '15 km away', type: 'Historical', rating: '4.7' },
//   { id: '3', title: 'Secret Coffee House', distance: '2 km away', type: 'Cafe', rating: '4.8' },
// ];

// export default function SearchScreen() {
//   const insets = useSafeAreaInsets();

//   return (
//     <View style={styles.container}>
      
//       {/* 1. Fake Map Background (Dark Map Aesthetic) */}
//       <Image 
//         source={{ uri: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&q=80' }} 
//         style={[StyleSheet.absoluteFillObject, styles.mapImage]}
//         blurRadius={3} 
//       />
//       {/* Dark overlay to blend the map into your #434343 theme */}
//       <View style={styles.mapOverlay} />

//       {/* 2. Floating Search Bar */}
//       <View style={[styles.searchBox, { top: insets.top + 15 }]}>
//         <FontAwesome name="search" size={18} color="#a7a6ff" />
//         <TextInput 
//           placeholder="Where to next?"
//           placeholderTextColor="#a0a0a0"
//           style={styles.searchInput}
//         />
//         <FontAwesome name="sliders" size={18} color="#d3d3d3" />
//       </View>

//       {/* 3. Floating Action Buttons (Map Controls) */}
//       <View style={styles.mapControls}>
//         <TouchableOpacity style={styles.controlButton}>
//           <FontAwesome name="location-arrow" size={20} color="#a7a6ff" />
//         </TouchableOpacity>
//         <TouchableOpacity style={styles.controlButton}>
//           <FontAwesome name="map" size={16} color="#d3d3d3" />
//         </TouchableOpacity>
//       </View>

//       {/* 4. The Bottom Sheet Modal */}
//       <View style={styles.bottomSheet}>
//         {/* Little drag handle at the top of the sheet */}
//         <View style={styles.dragHandle} />
        
//         <View style={styles.sheetHeader}>
//           <Text style={styles.sheetTitle}>Explore Nearby</Text>
//           <Text style={styles.sheetSubtitle}>12 places found</Text>
//         </View>

//         <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
//           {nearbyPlaces.map((place) => (
//             <TouchableOpacity key={place.id} style={styles.listItem}>
              
//               <View style={styles.itemIconBox}>
//                 <FontAwesome 
//                   name={place.type === 'Nature' ? 'tree' : place.type === 'Cafe' ? 'coffee' : 'building'} 
//                   size={20} 
//                   color="#a7a6ff" 
//                 />
//               </View>

//               <View style={styles.itemDetails}>
//                 <Text style={styles.itemTitle}>{place.title}</Text>
//                 <Text style={styles.itemSubtitle}>{place.type} • {place.distance}</Text>
//               </View>

//               <View style={styles.ratingBox}>
//                 <FontAwesome name="star" size={12} color="#a7a6ff" />
//                 <Text style={styles.ratingText}>{place.rating}</Text>
//               </View>

//             </TouchableOpacity>
//           ))}
//           <View style={{ height: 40 }} />
//         </ScrollView>
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#434343' },
  
//   // Map Background
//   mapImage: { width: '100%', height: '100%', opacity: 0.6 },
//   mapOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(67, 67, 67, 0.6)' }, // Mixes the map with your grey

//   // Floating Search Bar
//   searchBox: {
//     position: 'absolute',
//     left: 20,
//     right: 20,
//     backgroundColor: '#333333',
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 15,
//     height: 50,
//     borderRadius: 25,
//     borderWidth: 1,
//     borderColor: '#434343',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.3,
//     shadowRadius: 5,
//     elevation: 5, // for Android shadow
//   },
//   searchInput: { flex: 1, marginLeft: 12, color: '#ffffff', fontSize: 16 },

//   // Floating Map Controls (Right side)
//   mapControls: { position: 'absolute', right: 20, bottom: height * 0.45 },
//   controlButton: {
//     width: 45,
//     height: 45,
//     backgroundColor: '#333333',
//     borderRadius: 25,
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginBottom: 10,
//     borderWidth: 1,
//     borderColor: '#434343',
//   },

//   // Bottom Sheet Modal
//   bottomSheet: {
//     position: 'absolute',
//     bottom: 0,
//     left: 0,
//     right: 0,
//     height: height * 0.4, // Takes up bottom 40% of the screen
//     backgroundColor: '#333333', // Darker grey for the modal
//     borderTopLeftRadius: 30,
//     borderTopRightRadius: 30,
//     paddingHorizontal: 20,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: -5 },
//     shadowOpacity: 0.3,
//     shadowRadius: 10,
//     elevation: 10,
//   },
//   dragHandle: { width: 40, height: 5, backgroundColor: '#666666', borderRadius: 3, alignSelf: 'center', marginTop: 12, marginBottom: 20 },
//   sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 },
//   sheetTitle: { fontSize: 22, fontWeight: 'bold', color: '#ffffff' },
//   sheetSubtitle: { fontSize: 13, color: '#a7a6ff', fontWeight: '600' },
  
//   // List Items inside Bottom Sheet
//   listContent: { paddingBottom: 20 },
//   listItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#434343', padding: 12, borderRadius: 15, marginBottom: 12 },
//   itemIconBox: { width: 45, height: 45, borderRadius: 12, backgroundColor: 'rgba(167, 166, 255, 0.1)', justifyContent: 'center', alignItems: 'center' },
//   itemDetails: { flex: 1, marginLeft: 12 },
//   itemTitle: { fontSize: 16, fontWeight: 'bold', color: '#ffffff', marginBottom: 4 },
//   itemSubtitle: { fontSize: 12, color: '#d3d3d3' },
//   ratingBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#333333', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
//   ratingText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold', marginLeft: 4 },
// });