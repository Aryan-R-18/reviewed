import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function SearchScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Search coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#333333', justifyContent: 'center', alignItems: 'center' },
  text: { color: '#a0a0a0', fontSize: 16 },
});
