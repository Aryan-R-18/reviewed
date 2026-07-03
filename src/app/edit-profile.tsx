import { FontAwesome } from '@expo/vector-icons';
import CryptoJS from 'crypto-js'; // We use this to sign the Cloudinary request!
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../utils/supabase';

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Load current user data when screen opens
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setFullName(user.user_metadata?.full_name || '');
        setCurrentAvatar(user.user_metadata?.avatar_url || null);
      }
    });
  }, []);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    let uploadedAvatarUrl = currentAvatar;

    try {
      // 1. Upload new image to Cloudinary using API Key & Secret
      if (imageUri) {
        // --- PUT YOUR CLOUDINARY CREDENTIALS HERE ---
        const cloudName = 'dl2wqsr7y'; 
        const apiKey = '966949323589765'; 
        const apiSecret = 'a4-TXmGam3zAKKQghUPtSnXdtN0'; 
        // --------------------------------------------

        // Create a signature using the current timestamp and your secret
        const timestamp = Math.round(new Date().getTime() / 1000).toString();
        const stringToSign = `timestamp=${timestamp}${apiSecret}`;
        const signature = CryptoJS.SHA1(stringToSign).toString();

        const data = new FormData();
        data.append('file', { uri: imageUri, type: 'image/jpeg', name: 'avatar.jpg' } as any);
        data.append('api_key', apiKey);
        data.append('timestamp', timestamp);
        data.append('signature', signature);

        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: data,
        });
        
        const cloudData = await response.json();
        
        if (cloudData.error) {
          throw new Error(cloudData.error.message);
        }
        
        uploadedAvatarUrl = cloudData.secure_url;
      }

      // 2. Prepare Supabase Updates
      const updates: any = {
        data: { full_name: fullName, avatar_url: uploadedAvatarUrl }
      };

      // Only update password if they typed a new one
      if (password.trim().length > 0) {
        if (password.length < 6) {
          Alert.alert('Weak Password', 'Password must be at least 6 characters.');
          setLoading(false);
          return;
        }
        updates.password = password;
      }

      // 3. Send to Supabase
      const { error } = await supabase.auth.updateUser(updates);

      if (error) throw error;

      Alert.alert('Success', 'Profile updated successfully!');
      router.back(); // Go back to profile screen

    } catch (error: any) {
      Alert.alert('Error updating profile', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.header, { marginTop: Platform.OS === 'android' ? insets.top + 10 : 20 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <FontAwesome name="angle-left" size={28} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 40 }} /> 
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        
        {/* Profile Photo Picker */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
            <Image 
              source={{ uri: imageUri || currentAvatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80' }} 
              style={styles.avatar} 
            />
            <View style={styles.editBadge}>
              <FontAwesome name="pencil" size={14} color="#ffffff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Tap to change photo</Text>
        </View>

        {/* Input Fields */}
        <Text style={styles.inputLabel}>Display Name</Text>
        <View style={styles.inputBox}>
          <FontAwesome name="user-o" size={18} color="#a0a0a0" style={styles.inputIcon} />
          <TextInput
            style={styles.textInput}
            placeholder="Your Name"
            placeholderTextColor="#666666"
            value={fullName}
            onChangeText={setFullName}
          />
        </View>

        <Text style={styles.inputLabel}>New Password (Optional)</Text>
        <View style={styles.inputBox}>
          <FontAwesome name="lock" size={18} color="#a0a0a0" style={styles.inputIcon} />
          <TextInput
            style={styles.textInput}
            placeholder="Leave blank to keep current"
            placeholderTextColor="#666666"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
          {loading ? (
             <ActivityIndicator size="small" color="#1c1c1c" />
          ) : (
             <Text style={styles.saveBtnText}>Save Changes</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#333333' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#434343' },
  closeBtn: { padding: 5, width: 40 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#ffffff' },
  content: { padding: 25 },
  
  avatarSection: { alignItems: 'center', marginBottom: 30 },
  avatarContainer: { position: 'relative' },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#a7a6ff' },
  editBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#a7a6ff', width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#333333' },
  avatarHint: { color: '#a0a0a0', fontSize: 12, marginTop: 10 },

  inputLabel: { fontSize: 14, fontWeight: 'bold', color: '#ffffff', marginBottom: 8, marginLeft: 5 },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#434343', borderRadius: 15, paddingHorizontal: 15, height: 55, marginBottom: 25 },
  inputIcon: { marginRight: 10, width: 20, textAlign: 'center' },
  textInput: { flex: 1, color: '#ffffff', fontSize: 16 },

  saveBtn: { backgroundColor: '#a7a6ff', height: 55, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: '#1c1c1c', fontWeight: 'bold', fontSize: 16 },
});