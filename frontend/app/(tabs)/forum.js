// frontend/app/forum.js
import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView,
  Image,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Header from '../../components/Header';

// Pass the 'navigation' prop to enable routing to other screens
export default function ForumScreen() {
  const router = useRouter(); // Initialize router for navigation
  return (
    <SafeAreaView style={styles.safeArea}>
      
      {/* Header Section */}
      <Header title="Forum" />

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 20 }}>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Search discussions, modules, or peers"
            placeholderTextColor="#888"
          />
        </View>

        {/* Filter Categories (Horizontal Scroll) */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity style={[styles.filterChip, styles.filterChipActive]}>
            <Text style={styles.filterChipTextActive}>All Topics</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.filterChip}>
            <Text style={styles.filterChipText}>Study</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.filterChip}>
            <Text style={styles.filterChipText}>Campus
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.filterChip}>
            <Text style={styles.filterChipText}>Romance</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.filterChip}>
            <Text style={styles.filterChipText}>Job</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.filterChip}>
            <Text style={styles.filterChipText}>Others</Text>
          </TouchableOpacity>

        </ScrollView>

        {/* FORUM POST CARDS */}

        {/* Post 1 */}
        <View style={styles.postCard}>
          <View style={styles.postHeader}>
            <View style={styles.tagOrange}>
              <Text style={styles.tagTextWhite}>Study</Text>
            </View>
            <Text style={styles.timeText}>2h ago</Text>
          </View>
          
          <Text style={styles.postTitle}>CS2030S: JAVA is hard</Text>
          <Text style={styles.postSnippet} numberOfLines={2}>
            dynamic programming
          </Text>

          <View style={styles.postFooter}>
            <View style={styles.authorRow}>
              <Image source={{ uri: 'https://randomuser.me/api/portraits/men/60.jpg' }} style={styles.authorAvatar} />
              <Text style={styles.authorName}>Aron Tan</Text>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons name="thumbs-up-outline" size={18} color="#666" />
                <Text style={styles.statText}>24</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="chatbox-outline" size={18} color="#666" />
                <Text style={styles.statText}>12</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Post 2 */}
        <View style={styles.postCard}>
          <View style={styles.postHeader}>
            <View style={styles.tagDarkBlue}>
              <Text style={styles.tagTextWhite}>Others</Text>
            </View>
            <Text style={styles.timeText}>5h ago</Text>
          </View>
          
          <Text style={styles.postTitle}>Best places to study in UTown late at night?</Text>
          <Text style={styles.postSnippet} numberOfLines={2}>
            Aiken Dueet
          </Text>

          <View style={styles.postFooter}>
            <View style={styles.authorRow}>
              <Image source={{ uri: 'https://randomuser.me/api/portraits/women/65.jpg' }} style={styles.authorAvatar} />
              <Text style={styles.authorName}>Mathin Hen</Text>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons name="thumbs-up-outline" size={18} color="#666" />
                <Text style={styles.statText}>45</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="chatbox-outline" size={18} color="#666" />
                <Text style={styles.statText}>8</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Post 3 */}
        <View style={styles.postCard}>
          <View style={styles.postHeader}>
            <View style={styles.tagLightGrey}>
              <Text style={styles.tagTextDark}>Campus</Text>
            </View>
            <Text style={styles.timeText}>8h ago</Text>
          </View>
          
          <Text style={styles.postTitle}>SoC Freshmen Orientation Camp</Text>
          
          {/* Post Image */}
          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=800' }} 
            style={styles.postImage} 
          />

          <View style={styles.postFooter}>
            <View style={styles.authorRow}>
              {/* Custom Initial Avatar */}
              <View style={styles.initialAvatar}>
                <Text style={styles.initialText}>N</Text>
              </View>
              <Text style={styles.authorName}>NUS Computing Club</Text>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons name="heart-outline" size={18} color="#666" />
                <Text style={styles.statText}>102</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="chatbox-outline" size={18} color="#666" />
                <Text style={styles.statText}>15</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Post 4: Career Talk */}
        <View style={styles.postCard}>
          <View style={styles.postHeader}>
            <View style={styles.tagOrange}>
              <Text style={styles.tagTextWhite}>Job</Text>
            </View>
            <Text style={styles.timeText}>1d ago</Text>
          </View>
          
          <Text style={styles.postTitle}>Internship hunt</Text>
          <Text style={styles.postSnippet} numberOfLines={2}>
            Hello World!
          </Text>

          <View style={styles.postFooter}>
            <View style={styles.authorRow}>
              <Image source={{ uri: 'https://randomuser.me/api/portraits/men/41.jpg' }} style={styles.authorAvatar} />
              <Text style={styles.authorName}>Jason</Text>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons name="thumbs-up-outline" size={18} color="#666" />
                <Text style={styles.statText}>31</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="chatbox-outline" size={18} color="#666" />
                <Text style={styles.statText}>22</Text>
              </View>
            </View>
          </View>
        </View>

      </ScrollView>

      {/* Floating Action Button for Creating Post */}
      <TouchableOpacity style={styles.fab}>
        <Ionicons name="add" size={30} color="#FFF" />
      </TouchableOpacity>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#FAFAFA' 
  },
  container: { 
    flex: 1, 
    paddingHorizontal: 15,
  },
  
  /* Search Bar */
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 45,
    marginBottom: 15
  },
  searchIcon: {
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333'
  },

  /* Filter Categories */
  filterScroll: {
    marginBottom: 15,
    maxHeight: 40,
  },
  filterChip: {
    backgroundColor: '#E6E8EA',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    height: 35
  },
  filterChipActive: {
    backgroundColor: '#002D5B', // Dark Blue active state
  },
  filterChipText: {
    color: '#555',
    fontSize: 14,
    fontWeight: '500'
  },
  filterChipTextActive: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600'
  },

  /* Post Cards Shared Styles */
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  
  /* Post Tags */
  tagOrange: {
    backgroundColor: '#FF8C00',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  tagDarkBlue: {
    backgroundColor: '#002D5B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  tagLightGrey: {
    backgroundColor: '#E6E8EA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  tagTextWhite: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  tagTextDark: {
    color: '#333',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  timeText: {
    fontSize: 12,
    color: '#888'
  },

  /* Post Content */
  postTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#002D5B',
    marginBottom: 8,
    lineHeight: 24
  },
  postSnippet: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 12
  },
  postImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 12,
    marginTop: 5
  },

  /* Post Footer (Author & Stats) */
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  authorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8
  },
  initialAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#002D5B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8
  },
  initialText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold'
  },
  authorName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333'
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 15
  },
  statText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4
  },

  /* Floating Action Button */
  fab: {
    position: 'absolute',
    bottom: 20, // Above bottom nav
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF8C00', // Orange
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5
  }
});