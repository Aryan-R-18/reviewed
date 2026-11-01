import { FontAwesome } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../utils/supabase';

// --- CLOUDINARY CREDENTIALS ---
const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const apiKey = process.env.EXPO_PUBLIC_CLOUDINARY_API_KEY!;
const apiSecret = process.env.EXPO_PUBLIC_CLOUDINARY_API_SECRET!;

export default function ReviewScreen() {
  const insets = useSafeAreaInsets();

  // Grab ALL the parameters passed from the Map/Profile screen
  const { placeId, actionType = 'visited', listId, listStatus, addToProfile, reviewId } = useLocalSearchParams();

  const isEditMode = actionType === 'edit';

  const [place, setPlace] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  // Tracks only newly-picked images. In edit mode, if empty we keep the existing place image.
  const [images, setImages] = useState<{ uri: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [session, setSession] = useState<any>(null);

  // Dynamic checks to adjust the UI and validation
  const isToVisitOnly = actionType === 'tovisit';
  const isListFlow = actionType === 'list';
  const requiresRating = actionType === 'visited' || isEditMode || (isListFlow && listStatus === 'VISITED');

  const pageTitle = isEditMode
    ? 'Edit Review'
    : isListFlow
    ? 'Add to Custom List'
    : isToVisitOnly
    ? 'Add to Bucket List'
    : 'Add Review';

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const fetchData = async () => {
      if (!placeId) {
        setLoading(false);
        return;
      }

      // Always fetch place details (for cover image, title, location)
      const { data: placeData } = await supabase
        .from('places')
        .select('*')
        .eq('id', placeId)
        .single();
      if (placeData) setPlace(placeData);

      // In edit mode, pre-fill existing review data
      if (isEditMode && reviewId) {
        const { data: reviewData } = await supabase
          .from('reviews')
          .select('rating, diary_entry')
          .eq('id', reviewId)
          .single();
        if (reviewData) {
          setRating(reviewData.rating ?? 0);
          setReviewText(reviewData.diary_entry ?? '');
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [placeId, reviewId]);

  const pickImage = async () => {
    if (images.length >= 2) {
      Alert.alert('Limit Reached', 'You can only upload up to 2 images.');
      return;
    }

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('Permission to access camera roll is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled) {
      setImages(prev => [...prev, { uri: result.assets[0].uri }]);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  // --- SIGNED CLOUDINARY UPLOAD LOGIC ---
  const uploadToCloudinary = async (imageUri: string) => {
    const timestamp = Math.round(new Date().getTime() / 1000).toString();
    const stringToSign = `timestamp=${timestamp}${apiSecret}`;

    const signature = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA1,
      stringToSign
    );

    const data = new FormData();
    data.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: `upload_${Date.now()}.jpg`,
    } as any);
    data.append('api_key', apiKey);
    data.append('timestamp', timestamp);
    data.append('signature', signature);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: data,
    });

    const result = await response.json();
    if (result.secure_url) {
      return result.secure_url;
    } else {
      throw new Error(result.error?.message || 'Cloudinary upload failed');
    }
  };

  const handleSubmit = async () => {
    if (!session) return router.push('/login');

    // 1. Validation
    if (requiresRating && rating === 0) {
      return Alert.alert('Hold on!', 'Please give this place a rating (1-5 stars).');
    }

    // Photo is required only when the place has NO existing image yet (true first-time add).
    // If a place already has a cover photo (image_url), the user can skip uploading —
    // the existing image is kept. This covers both edit mode and list-item updates.
    const placeAlreadyHasImage = !!place?.image_url;
    if (!placeAlreadyHasImage && images.length === 0) {
      return Alert.alert('Photo Required', 'This place has no photo yet. Please upload at least 1 photo.');
    }

    setSubmitting(true);

    try {
      // 2. Only upload a new image if the user actually picked one
      let finalImageUrl: string | null = null;
      if (images.length > 0) {
        finalImageUrl = await uploadToCloudinary(images[0].uri);

        // Update the place's cover photo only when a new image is uploaded
        const { error: updateError } = await supabase
          .from('places')
          .update({ image_url: finalImageUrl })
          .eq('id', placeId);
        if (updateError) throw updateError;
      }

      // 3. Route logic
      if (isEditMode && reviewId) {
        // --- EDIT: update existing review ---
        const { error: editError } = await supabase
          .from('reviews')
          .update({
            rating,
            diary_entry: reviewText,
          })
          .eq('id', reviewId);
        if (editError) throw editError;

      } else if (actionType === 'visited') {
        // SAVING AS VISITED
        const { error: reviewError } = await supabase.from('reviews').insert({
          user_id: session.user.id,
          place_id: placeId,
          rating,
          diary_entry: reviewText,
        });
        if (reviewError) throw reviewError;

      } else if (actionType === 'tovisit') {
        // SAVING TO BUCKET LIST
        const { error: bookmarkError } = await supabase.from('bookmarks').insert({
          user_id: session.user.id,
          place_id: placeId,
        });
        if (bookmarkError && bookmarkError.code !== '23505') throw bookmarkError;

      } else if (actionType === 'list') {
        // SAVING TO A SPECIFIC CUSTOM FOLDER
        const { error: listError } = await supabase.from('list_items').insert({
          list_id: listId,
          place_id: placeId,
          status: listStatus, // 'VISITED' or 'TO VISIT'
        });
        if (listError) throw listError;

        // If they checked "Add to main profile?", save it there too!
        if (addToProfile === 'true') {
          if (listStatus === 'VISITED') {
            await supabase.from('reviews').insert({
              user_id: session.user.id,
              place_id: placeId,
              rating,
              diary_entry: reviewText,
            });
          } else {
            const { error: bkErr } = await supabase.from('bookmarks').insert({
              user_id: session.user.id,
              place_id: placeId,
            });
            if (bkErr && bkErr.code !== '23505') throw bkErr;
          }
        }
      }

      Alert.alert('Success!', isEditMode ? 'Your review has been updated.' : 'Your place has been saved to your profile.');
      router.back();

    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#a7a6ff" /></View>;
  if (!place) return <View style={styles.center}><Text style={{ color: 'white' }}>Place not found.</Text></View>;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.header, { marginTop: Platform.OS === 'android' ? insets.top + 10 : 20 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <FontAwesome name="times" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{pageTitle}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        <View style={styles.placeCard}>
          <Image source={{ uri: place.image_url }} style={styles.placeImage} />
          <View style={styles.placeDetails}>
            <Text style={styles.placeTitle} numberOfLines={2}>{place.title}</Text>
            <View style={styles.locationBadge}>
              <FontAwesome name="map-marker" size={12} color="#a7a6ff" />
              <Text style={styles.locationText} numberOfLines={1}>{place.location}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.inputLabel}>
          How was your experience? {requiresRating ? '*' : '(Optional)'}
        </Text>
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => setRating(star)} style={styles.starBtn}>
              <FontAwesome name={rating >= star ? 'star' : 'star-o'} size={36} color={rating >= star ? '#a7a6ff' : '#666666'} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Label adapts: optional when place already has a photo, required only for brand-new places */}
        <Text style={styles.inputLabel}>
          {place?.image_url
            ? isEditMode
              ? 'Change Photo (Optional — keeps existing if skipped)'
              : 'Update Photo (Optional — keeps existing if skipped)'
            : 'Upload Photo (Required — first time adding this place) *'}
        </Text>
        <View style={styles.imageUploadContainer}>
          {/* Show existing cover photo as a "Current" thumbnail whenever the place already has one and no new image picked */}
          {place?.image_url && images.length === 0 && (
            <View style={styles.imagePreviewWrapper}>
              <Image source={{ uri: place.image_url }} style={[styles.imagePreview, styles.existingImagePreview]} />
              <View style={styles.existingBadge}>
                <Text style={styles.existingBadgeText}>Current</Text>
              </View>
            </View>
          )}

          {images.map((img, index) => (
            <View key={index} style={styles.imagePreviewWrapper}>
              <Image source={{ uri: img.uri }} style={styles.imagePreview} />
              <TouchableOpacity style={styles.removeImageBtn} onPress={() => removeImage(index)}>
                <FontAwesome name="times" size={12} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}

          {images.length < 2 && !(place?.image_url && images.length === 0) && (
            <TouchableOpacity style={styles.addImageBtn} onPress={pickImage}>
              <FontAwesome name="camera" size={24} color="#a7a6ff" />
              <Text style={styles.addImageText}>Add Photo</Text>
            </TouchableOpacity>
          )}

          {/* When an existing image is shown as "Current", offer a Change button next to it */}
          {place?.image_url && images.length === 0 && (
            <TouchableOpacity style={styles.addImageBtn} onPress={pickImage}>
              <FontAwesome name="camera" size={24} color="#a7a6ff" />
              <Text style={styles.addImageText}>Change</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.inputLabel}>Write your notes (Optional)</Text>
        <View style={styles.textAreaBox}>
          <TextInput
            style={styles.textArea}
            placeholder={isToVisitOnly ? 'Why do you want to visit this place?' : 'What did you love about this place?'}
            placeholderTextColor="#666666"
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            value={reviewText}
            onChangeText={setReviewText}
          />
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator size="small" color="#1c1c1c" />
          ) : (
            <Text style={styles.submitBtnText}>{isEditMode ? 'Update Review' : 'Save to Profile'}</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#333333' },
  center: { flex: 1, backgroundColor: '#333333', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#434343' },
  closeBtn: { padding: 5, width: 40 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#ffffff' },
  content: { padding: 25 },

  placeCard: { flexDirection: 'row', backgroundColor: '#434343', borderRadius: 20, padding: 15, marginBottom: 30, alignItems: 'center' },
  placeImage: { width: 80, height: 80, borderRadius: 15, marginRight: 15 },
  placeDetails: { flex: 1, justifyContent: 'center' },
  placeTitle: { fontSize: 18, fontWeight: 'bold', color: '#ffffff', marginBottom: 6 },
  locationBadge: { flexDirection: 'row', alignItems: 'center' },
  locationText: { color: '#d3d3d3', fontSize: 13, marginLeft: 6 },

  inputLabel: { fontSize: 16, fontWeight: 'bold', color: '#ffffff', marginBottom: 15, textAlign: 'center' },
  starsContainer: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 35 },
  starBtn: { padding: 5 },

  imageUploadContainer: { flexDirection: 'row', justifyContent: 'center', gap: 15, marginBottom: 35, flexWrap: 'wrap' },
  addImageBtn: { width: 100, height: 100, borderRadius: 15, backgroundColor: '#434343', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#a7a6ff', borderStyle: 'dashed' },
  addImageText: { color: '#a7a6ff', fontSize: 12, marginTop: 8, fontWeight: 'bold' },
  imagePreviewWrapper: { width: 100, height: 100, borderRadius: 15, position: 'relative' },
  imagePreview: { width: '100%', height: '100%', borderRadius: 15 },
  existingImagePreview: { opacity: 0.75 },
  existingBadge: { position: 'absolute', bottom: 4, left: 0, right: 0, alignItems: 'center' },
  existingBadgeText: { fontSize: 9, fontWeight: '900', color: '#ffffff', backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  removeImageBtn: { position: 'absolute', top: -5, right: -5, backgroundColor: '#ff4444', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#333' },

  textAreaBox: { backgroundColor: '#434343', borderRadius: 20, padding: 15, minHeight: 120, marginBottom: 30 },
  textArea: { color: '#ffffff', fontSize: 16, lineHeight: 24 },
  submitBtn: { backgroundColor: '#a7a6ff', height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  submitBtnText: { color: '#1c1c1c', fontWeight: 'bold', fontSize: 18 },
});
