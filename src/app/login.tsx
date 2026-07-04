import { FontAwesome } from '@expo/vector-icons';
import CryptoJS from 'crypto-js';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../utils/supabase';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        let uploadedAvatarUrl = 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80'; // Default avatar

        // 1. Upload image to Cloudinary using API Key & Secret
        if (imageUri) {
          const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME!;
          const apiKey = process.env.EXPO_PUBLIC_CLOUDINARY_API_KEY!;
          const apiSecret = process.env.CLOUDINARY_API_SECRET!;

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

        // 2. Sign Up with Supabase
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              avatar_url: uploadedAvatarUrl,
            },
          },
        });

        if (error) throw error;
        Alert.alert('Success!', 'Your account has been created.');
        router.back();

      } else {
        // Sign In
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        router.back();
      }
    } catch (error: any) {
      Alert.alert('Authentication Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.header, { marginTop: Platform.OS === 'android' ? insets.top + 10 : 20 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <FontAwesome name="times" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        
        <Text style={styles.title}>{isSignUp ? 'Create Account' : 'Welcome Back'}</Text>
        <Text style={styles.subtitle}>
          {isSignUp ? 'Sign up to start tracking your travels.' : 'Log in to see your travel lists.'}
        </Text>

        {isSignUp && (
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
              <Image 
                source={{ uri: imageUri || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80' }} 
                style={styles.avatar} 
              />
              <View style={styles.editBadge}>
                <FontAwesome name="camera" size={12} color="#ffffff" />
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarHint}>Add a profile photo</Text>
          </View>
        )}

        {isSignUp && (
          <View style={styles.inputBox}>
            <FontAwesome name="user-o" size={18} color="#a0a0a0" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder="Full Name"
              placeholderTextColor="#666666"
              value={fullName}
              onChangeText={setFullName}
            />
          </View>
        )}

        <View style={styles.inputBox}>
          <FontAwesome name="envelope-o" size={18} color="#a0a0a0" style={styles.inputIcon} />
          <TextInput
            style={styles.textInput}
            placeholder="Email Address"
            placeholderTextColor="#666666"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputBox}>
          <FontAwesome name="lock" size={18} color="#a0a0a0" style={styles.inputIcon} />
          <TextInput
            style={styles.textInput}
            placeholder="Password"
            placeholderTextColor="#666666"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity style={styles.authBtn} onPress={handleAuth} disabled={loading}>
          {loading ? (
             <ActivityIndicator size="small" color="#1c1c1c" />
          ) : (
             <Text style={styles.authBtnText}>{isSignUp ? 'Sign Up' : 'Log In'}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} style={styles.switchModeBtn}>
          <Text style={styles.switchModeText}>
            {isSignUp ? 'Already have an account? Log In' : 'Need an account? Sign Up'}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#333333' },
  header: { paddingHorizontal: 20, paddingBottom: 10 },
  closeBtn: { width: 40, height: 40, justifyContent: 'center' },
  content: { padding: 25 },
  title: { fontSize: 32, fontWeight: '900', color: '#a7a6ff', marginBottom: 5 },
  subtitle: { fontSize: 16, color: '#a0a0a0', marginBottom: 30 },
  
  avatarSection: { alignItems: 'center', marginBottom: 25 },
  avatarContainer: { position: 'relative' },
  avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 2, borderColor: '#a7a6ff' },
  editBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#a7a6ff', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#333333' },
  avatarHint: { color: '#a0a0a0', fontSize: 12, marginTop: 10 },

  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#434343', borderRadius: 15, paddingHorizontal: 15, height: 55, marginBottom: 20 },
  inputIcon: { marginRight: 10, width: 20, textAlign: 'center' },
  textInput: { flex: 1, color: '#ffffff', fontSize: 16 },

  authBtn: { backgroundColor: '#a7a6ff', height: 55, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  authBtnText: { color: '#1c1c1c', fontWeight: 'bold', fontSize: 16 },
  
  switchModeBtn: { marginTop: 25, alignItems: 'center' },
  switchModeText: { color: '#a0a0a0', fontSize: 14, fontWeight: '500' },
});