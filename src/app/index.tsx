import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';

export default function InitialLoader() {
  useEffect(() => {
    // This simulates the app loading initial data (like the top cafes).
    // After 1.5 seconds, it automatically sends the user to the Home screen.
    const timer = setTimeout(() => {
      router.replace('/(tabs)');
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#000000" />
      <Text style={styles.text}>Preparing your world...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#ffffff' 
  },
  text: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
    fontWeight: '500'
  }
});