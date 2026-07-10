import { FontAwesome } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Dimensions, Image, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../utils/supabase';

const { width } = Dimensions.get('window');
const FOLDER_WIDTH = (width - 60) / 2;

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  
  const [activeTab, setActiveTab] = useState('Account'); 
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Dynamic Data States
  const [visitedPlaces, setVisitedPlaces] = useState<any[]>([]);
  const [toVisitPlaces, setToVisitPlaces] = useState<any[]>([]);
  const [userLists, setUserLists] = useState<any[]>([]);
  const [selectedList, setSelectedList] = useState<any>(null);
  const [listItems, setListItems] = useState<any[]>([]);
  
  const [stats, setStats] = useState({ visited: 0, toVisit: 0, lists: 0 });

  // Android-Friendly Inline List Creation State
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async () => {
    if (!session?.user?.id) return;

    // 1. Fetch Visited Places
    const { data: vData } = await supabase
      .from('reviews')
      .select(`id, rating, diary_entry, created_at, places ( id, title, location, image_url )`)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (vData) setVisitedPlaces(vData);

    // 2. Fetch To Visit Places
    const { data: tData } = await supabase
      .from('bookmarks')
      .select(`id, created_at, places ( id, title, location, image_url )`)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
      
    if (tData) setToVisitPlaces(tData);

    // 3. Fetch Custom Lists
    const { data: lData } = await supabase
      .from('custom_lists')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
      
    if (lData) setUserLists(lData);

    // Update real stats
    setStats({
      visited: vData ? vData.length : 0,
      toVisit: tData ? tData.length : 0,
      lists: lData ? lData.length : 0
    });
  };

  useFocusEffect(
    useCallback(() => {
      if (session) {
        fetchUserData();
      }
    }, [session])
  );

  const fetchItemsForList = async (listId: string) => {
    const { data } = await supabase
      .from('list_items')
      .select(`id, status, created_at, place:places ( id, title, location, image_url )`)
      .eq('list_id', listId)
      .order('created_at', { ascending: false });
      
    if (data) setListItems(data);
  };

  // Inline List Creation Function
  const saveNewList = async () => {
    if (!newListName.trim()) {
      setIsCreatingList(false);
      return;
    }
    if (session?.user?.id) {
      const { data, error } = await supabase
        .from('custom_lists')
        .insert({ user_id: session.user.id, name: newListName.trim() })
        .select()
        .single();
        
      if (error) {
        Alert.alert('Error', 'Could not create list.');
      } else if (data) {
        setUserLists([data, ...userLists]);
        setStats(prev => ({ ...prev, lists: prev.lists + 1 }));
      }
    }
    setIsCreatingList(false);
    setNewListName('');
  };

  const handleOpenFolder = (list: any) => {
    setSelectedList(list);
    fetchItemsForList(list.id);
  };

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync('traveller.explorer.share.com');
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setActiveTab('Account');
    setVisitedPlaces([]); 
    setToVisitPlaces([]);
    setUserLists([]);
    setStats({ visited: 0, toVisit: 0, lists: 0 });
  };

  const renderStars = (count: number) => {
    return Array.from({ length: count }).map((_, i) => (
      <FontAwesome key={i} name="star" size={14} color="#a7a6ff" style={styles.starIcon} />
    ));
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Image source={require('../../../assets/loader.gif')} style={{ width: 80, height: 80 }} />
      </View>
    );
  }

  const user = session?.user;
  const fullName = user?.user_metadata?.full_name || 'Guest User';
  const avatarUrl = user?.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80'; 
  const joinDate = user ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Not joined yet';

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Profile</Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconCircle}>
              <FontAwesome name="upload" size={16} color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconCircle} onPress={() => router.push('/edit-profile')}>
              <FontAwesome name="cog" size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Pills */}
        <View style={styles.tabContainer}>
          <TouchableOpacity style={[styles.tabItem, activeTab === 'Visited' && styles.tabItemActive]} onPress={() => { setActiveTab('Visited'); setSelectedList(null); }}>
            <FontAwesome name="map-marker" size={14} color={activeTab === 'Visited' ? '#1c1c1c' : '#ffffff'} style={styles.tabIcon} />
            <Text style={activeTab === 'Visited' ? styles.tabTextActive : styles.tabText}>Visited</Text>
          </TouchableOpacity>
          <Text style={styles.tabDivider}>|</Text>
          
          <TouchableOpacity style={[styles.tabItem, activeTab === 'To Visit' && styles.tabItemActive]} onPress={() => { setActiveTab('To Visit'); setSelectedList(null); }}>
            <FontAwesome name="bookmark-o" size={14} color={activeTab === 'To Visit' ? '#1c1c1c' : '#ffffff'} style={styles.tabIcon} />
            <Text style={activeTab === 'To Visit' ? styles.tabTextActive : styles.tabText}>To Visit</Text>
          </TouchableOpacity>
          <Text style={styles.tabDivider}>|</Text>
          
          <TouchableOpacity style={[styles.tabItem, activeTab === 'List' && styles.tabItemActive]} onPress={() => setActiveTab('List')}>
            <FontAwesome name="list-ul" size={14} color={activeTab === 'List' ? '#1c1c1c' : '#ffffff'} style={styles.tabIcon} />
            <Text style={activeTab === 'List' ? styles.tabTextActive : styles.tabText}>List</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.tabItem, activeTab === 'Account' && styles.tabItemActive]} onPress={() => { setActiveTab('Account'); setSelectedList(null); }}>
            <FontAwesome name="user-o" size={14} color={activeTab === 'Account' ? '#1c1c1c' : '#ffffff'} style={styles.tabIcon} />
            <Text style={activeTab === 'Account' ? styles.tabTextActive : styles.tabText}>Account</Text>
          </TouchableOpacity>
        </View>

        {/* ======================================= */}
        {/* VISITED TAB CONTENT                     */}
        {/* ======================================= */}
        {activeTab === 'Visited' && (
          <View>
            {!session ? (
              <View style={styles.guestState}>
                <Text style={styles.guestText}>Log in to see your reviews.</Text>
                <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/login')}>
                  <Text style={styles.loginButtonText}>Log In / Sign Up</Text>
                </TouchableOpacity>
              </View>
            ) : visitedPlaces.length === 0 ? (
              <View style={styles.guestState}><Text style={styles.guestText}>You haven't logged any trips yet!</Text></View>
            ) : (
              visitedPlaces.map((review) => (
                <TouchableOpacity key={review.id} style={styles.placeCard}>
                  <Image source={{ uri: review.places?.image_url }} style={styles.placeImage} />
                  <View style={styles.placeDetails}>
                    <Text style={styles.placeTitle}>{review.places?.title}</Text>
                    <View style={styles.starsRow}>{renderStars(review.rating)}</View>
                    <Text style={styles.placeDesc} numberOfLines={2}>{review.diary_entry}</Text>
                    <Text style={styles.placeDate}>
                      {new Date(review.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* ======================================= */}
        {/* TO VISIT TAB CONTENT                    */}
        {/* ======================================= */}
        {activeTab === 'To Visit' && (
          <View>
            {!session ? (
              <View style={styles.guestState}>
                <Text style={styles.guestText}>Log in to see your bucket list.</Text>
                <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/login')}>
                  <Text style={styles.loginButtonText}>Log In / Sign Up</Text>
                </TouchableOpacity>
              </View>
            ) : toVisitPlaces.length === 0 ? (
              <View style={styles.guestState}><Text style={styles.guestText}>Your To-Visit list is empty!</Text></View>
            ) : (
              toVisitPlaces.map((bookmark) => (
                <TouchableOpacity key={bookmark.id} style={styles.placeCard}>
                  <Image source={{ uri: bookmark.places?.image_url }} style={styles.placeImage} />
                  <View style={styles.placeDetails}>
                    <Text style={styles.placeTitle}>{bookmark.places?.title}</Text>
                    <Text style={styles.placeDesc} numberOfLines={1}>{bookmark.places?.location}</Text>
                    <Text style={[styles.placeDate, { marginTop: 8 }]}>
                      Added {new Date(bookmark.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* ======================================= */}
        {/* LISTS TAB (FOLDERS) CONTENT             */}
        {/* ======================================= */}
        {activeTab === 'List' && !selectedList && (
          <View>
            {!session ? (
              <View style={styles.guestState}>
                <Text style={styles.guestText}>Log in to create custom lists.</Text>
                <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/login')}>
                  <Text style={styles.loginButtonText}>Log In / Sign Up</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                {/* INLINE LIST CREATION FOR ANDROID/IOS */}
                {isCreatingList ? (
                  <View style={styles.createListBox}>
                    <TextInput
                      style={styles.createListInput}
                      placeholder="Enter folder name (e.g., Euro Trip)"
                      placeholderTextColor="#a0a0a0"
                      value={newListName}
                      onChangeText={setNewListName}
                      autoFocus
                    />
                    <View style={styles.createListActions}>
                      <TouchableOpacity onPress={() => setIsCreatingList(false)} style={styles.cancelBtn}>
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={saveNewList} style={styles.saveBtn}>
                        <Text style={styles.saveBtnText}>Save</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.addListBtn} onPress={() => setIsCreatingList(true)}>
                    <FontAwesome name="plus" size={16} color="#1c1c1c" />
                    <Text style={styles.addListText}>Create New List</Text>
                  </TouchableOpacity>
                )}
                
                {userLists.length === 0 ? (
                  <View style={styles.guestState}><Text style={styles.guestText}>You haven't created any custom lists yet.</Text></View>
                ) : (
                  <View style={styles.folderGrid}>
                    {userLists.map((list) => (
                      <TouchableOpacity key={list.id} style={styles.folderContainer} onPress={() => handleOpenFolder(list)}>
                        <View style={styles.folderIconBox}>
                          <FontAwesome name="folder" size={40} color="#a7a6ff" />
                        </View>
                        <Text style={styles.folderTitle} numberOfLines={1}>{list.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* ======================================= */}
        {/* INSIDE A SPECIFIC LIST FOLDER           */}
        {/* ======================================= */}
        {activeTab === 'List' && selectedList && (
          <View>
            <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedList(null)}>
              <FontAwesome name="arrow-left" size={16} color="#a7a6ff" />
              <Text style={styles.backBtnText}>Back to Lists</Text>
            </TouchableOpacity>
            
            <Text style={styles.sectionTitle}>{selectedList.name}</Text>
            
            {listItems.length === 0 ? (
              <View style={styles.guestState}><Text style={styles.guestText}>This folder is empty.</Text></View>
            ) : (
              listItems.map((item) => (
                <TouchableOpacity key={item.id} style={styles.placeCard}>
                  <Image source={{ uri: item.place?.image_url }} style={styles.placeImage} />
                  
                  {/* Dynamic Status Badge */}
                  {item.status !== 'LISTED' && (
                    <View style={[styles.badge, { backgroundColor: item.status === 'VISITED' ? '#a7a6ff' : '#ff9f43' }]}>
                      <Text style={styles.badgeText}>{item.status}</Text>
                    </View>
                  )}

                  <View style={styles.placeDetails}>
                    <Text style={styles.placeTitle}>{item.place?.title}</Text>
                    <Text style={styles.placeDesc} numberOfLines={1}>{item.place?.location}</Text>
                    <Text style={[styles.placeDate, { marginTop: 8 }]}>
                      Added {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* ======================= */}
        {/* FULL ACCOUNT TAB CONTENT */}
        {/* ======================= */}
        {activeTab === 'Account' && (
          <View>
            <View style={styles.card}>
              <View style={styles.profileTopRow}>
                <View style={styles.avatarContainer}>
                  <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                  {session && (
                    <TouchableOpacity style={styles.cameraBadge} onPress={() => router.push('/edit-profile')}>
                      <FontAwesome name="pencil" size={10} color="#ffffff" />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.profileDetails}>
                  <Text style={styles.profileName}>{fullName}</Text>
                  <Text style={styles.profileBio}>{session ? 'Explorer & Traveller' : 'Welcome to the app!'}</Text>
                  <View style={styles.infoRow}>
                    <FontAwesome name="calendar" size={10} color="#a0a0a0" style={styles.infoIcon} />
                    <Text style={styles.infoText}>Joined {joinDate}</Text>
                  </View>
                </View>

                {session && (
                  <View style={styles.ratingBadge}>
                    <FontAwesome name="star" size={14} color="#a7a6ff" />
                    <Text style={styles.ratingText}>{stats.visited}</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity style={[styles.linkBox, isCopied && styles.linkBoxCopied]} onPress={handleCopyLink} activeOpacity={0.7}>
                <FontAwesome name={isCopied ? "check" : "link"} size={12} color={isCopied ? "#a7a6ff" : "#a0a0a0"} />
                <Text style={[styles.linkText, isCopied && { color: '#a7a6ff' }]}>
                  {isCopied ? 'Link Copied!' : 'traveller.explorer.share.com'}
                </Text>
                <FontAwesome name={isCopied ? "check" : "clone"} size={12} color={isCopied ? "#a7a6ff" : "#a0a0a0"} style={styles.copyIcon} />
              </TouchableOpacity>
            </View>

            {/* REAL STATS CARD */}
            {session && (
              <View style={styles.card}>
                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{stats.visited}</Text>
                    <Text style={styles.statLabel}>Visited</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{stats.toVisit}</Text>
                    <Text style={styles.statLabel}>To Visit</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{stats.lists}</Text>
                    <Text style={styles.statLabel}>List</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Settings */}
            <View style={styles.card}>
              <Text style={styles.listHeader}>Account & Preferences</Text>

              <View style={styles.listItem}>
                <View style={styles.listIconBox}><FontAwesome name="moon-o" size={16} color="#a7a6ff" /></View>
                <View style={styles.listTextContent}>
                  <Text style={styles.listTitle}>Appearance</Text>
                  <Text style={styles.listSubtitle}>Choose light or dark mode</Text>
                </View>
                <Switch value={isDarkMode} onValueChange={setIsDarkMode} trackColor={{ false: '#333333', true: '#a7a6ff' }} thumbColor="#ffffff" />
              </View>

              {session && (
                <TouchableOpacity style={styles.listItem} onPress={() => router.push('/edit-profile')}>
                  <View style={styles.listIconBox}><FontAwesome name="pencil-square-o" size={16} color="#a7a6ff" /></View>
                  <View style={styles.listTextContent}>
                    <Text style={styles.listTitle}>Edit Profile</Text>
                    <Text style={styles.listSubtitle}>Change your name, photo, or password</Text>
                  </View>
                  <FontAwesome name="angle-right" size={18} color="#a0a0a0" />
                </TouchableOpacity>
              )}

              {session ? (
                <TouchableOpacity style={[styles.listItem, { borderBottomWidth: 0 }]} onPress={handleLogout}>
                  <View style={styles.listIconBox}><FontAwesome name="sign-out" size={16} color="#ff6b6b" /></View>
                  <View style={styles.listTextContent}>
                    <Text style={styles.listTitle}>Log Out</Text>
                    <Text style={styles.listSubtitle}>Sign out from your account</Text>
                  </View>
                  <FontAwesome name="angle-right" size={18} color="#a0a0a0" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[styles.listItem, { borderBottomWidth: 0 }]} onPress={() => router.push('/login')}>
                  <View style={styles.listIconBox}><FontAwesome name="sign-in" size={16} color="#a7a6ff" /></View>
                  <View style={styles.listTextContent}>
                    <Text style={styles.listTitle}>Log In</Text>
                    <Text style={styles.listSubtitle}>Sign in to your account</Text>
                  </View>
                  <FontAwesome name="angle-right" size={18} color="#a0a0a0" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#333333' }, 
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  headerTitle: { fontSize: 32, fontWeight: '900', color: '#a7a6ff' },
  headerIcons: { flexDirection: 'row', gap: 10 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#434343', justifyContent: 'center', alignItems: 'center' },
  tabContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#434343', borderRadius: 25, padding: 5, marginBottom: 20 },
  tabItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20 },
  tabItemActive: { backgroundColor: '#a7a6ff' },
  tabIcon: { marginRight: 6 },
  tabText: { color: '#ffffff', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#1c1c1c', fontSize: 13, fontWeight: 'bold' },
  tabDivider: { color: '#666666', fontSize: 14 },
  
  guestState: { alignItems: 'center', justifyContent: 'center', marginTop: 40, padding: 20 },
  guestText: { color: '#a0a0a0', fontSize: 16, marginBottom: 20, textAlign: 'center' },
  loginButton: { backgroundColor: '#a7a6ff', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  loginButtonText: { color: '#1c1c1c', fontWeight: 'bold', fontSize: 16 },

  // List Item Cards (Used in Visited, To Visit, and Nested Lists)
  placeCard: { flexDirection: 'row', backgroundColor: '#434343', borderRadius: 15, padding: 12, marginBottom: 15, position: 'relative' },
  placeImage: { width: 90, height: 90, borderRadius: 10, marginRight: 15 },
  placeDetails: { flex: 1, justifyContent: 'center' },
  placeTitle: { fontSize: 18, fontWeight: 'bold', color: '#ffffff', marginBottom: 4 },
  starsRow: { flexDirection: 'row', marginBottom: 6 },
  starIcon: { marginRight: 4 },
  placeDesc: { fontSize: 12, color: '#d3d3d3', marginBottom: 6 },
  placeDate: { fontSize: 12, color: '#a7a6ff', fontWeight: 'bold' },

  // Badges for Nested Lists
  badge: { position: 'absolute', top: -5, right: -5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, zIndex: 10, borderWidth: 2, borderColor: '#333333' },
  badgeText: { fontSize: 10, fontWeight: '900', color: '#1c1c1c' },

  // Folder Grid & List Creation Styling
  addListBtn: { flexDirection: 'row', backgroundColor: '#a7a6ff', padding: 15, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  addListText: { color: '#1c1c1c', fontWeight: 'bold', fontSize: 16, marginLeft: 8 },
  
  createListBox: { backgroundColor: '#434343', borderRadius: 15, padding: 15, marginBottom: 20 },
  createListInput: { color: '#ffffff', fontSize: 16, borderBottomWidth: 1, borderBottomColor: '#a7a6ff', paddingBottom: 5, marginBottom: 15 },
  createListActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20 },
  cancelBtn: { paddingVertical: 5 },
  cancelBtnText: { color: '#a0a0a0', fontWeight: 'bold' },
  saveBtn: { paddingVertical: 5 },
  saveBtnText: { color: '#a7a6ff', fontWeight: 'bold' },

  folderGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  folderContainer: { width: FOLDER_WIDTH, height: 140, marginBottom: 20, backgroundColor: '#434343', borderRadius: 15, padding: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#555' },
  folderIconBox: { marginBottom: 10 },
  folderTitle: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },

  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  backBtnText: { color: '#a7a6ff', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  sectionTitle: { fontSize: 24, fontWeight: 'bold', color: '#ffffff', marginBottom: 20 },

  // Full Account Tab Styling restored
  card: { backgroundColor: '#434343', borderRadius: 20, padding: 20, marginBottom: 20 },
  profileTopRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  avatarContainer: { position: 'relative', marginRight: 15 },
  avatar: { width: 70, height: 70, borderRadius: 35, borderWidth: 2, borderColor: '#000000' },
  cameraBadge: { position: 'absolute', bottom: 0, right: -4, backgroundColor: '#a7a6ff', width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#434343' },
  profileDetails: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: 'bold', color: '#a7a6ff', marginBottom: 4 },
  profileBio: { fontSize: 12, color: '#ffffff', fontWeight: 'bold', marginBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  infoIcon: { width: 14, textAlign: 'center', marginRight: 6 },
  infoText: { fontSize: 11, color: '#ffffff', fontWeight: '500' },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#333333', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 15 },
  ratingText: { color: '#ffffff', fontSize: 14, fontWeight: 'bold', marginLeft: 4 },
  
  linkBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#333333', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 15 },
  linkBoxCopied: { backgroundColor: 'rgba(167, 166, 255, 0.1)', borderColor: '#a7a6ff', borderWidth: 1 },
  linkText: { color: '#ffffff', fontSize: 12, fontWeight: '500', marginLeft: 10, flex: 1 },
  copyIcon: { marginLeft: 10 },
  
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statItem: { alignItems: 'center', flex: 1 },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: '#a7a6ff', marginBottom: 4 },
  statLabel: { fontSize: 11, color: '#ffffff', fontWeight: '600' },
  
  listHeader: { fontSize: 14, fontWeight: 'bold', color: '#a7a6ff', marginBottom: 15 },
  listItem: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#333333', paddingVertical: 12 },
  listIconBox: { width: 32, alignItems: 'center', marginRight: 15 },
  listTextContent: { flex: 1 },
  listTitle: { fontSize: 14, fontWeight: 'bold', color: '#ffffff', marginBottom: 2 },
  listSubtitle: { fontSize: 11, color: '#a0a0a0' },
});