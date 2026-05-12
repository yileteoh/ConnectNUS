// frontend/app/event.js
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
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function EventScreen() {
  const router = useRouter(); // Initialize router for navigation
  return (
    <SafeAreaView style={styles.safeArea}>
      
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image 
            source={{ uri: 'https://randomuser.me/api/portraits/men/32.jpg' }} 
            style={styles.profileImage} 
          />
          <Text style={styles.headerTitle}>ConnectNUS</Text>
        </View>
        <TouchableOpacity>
          <Ionicons name="notifications-outline" size={24} color="#003D7C" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Search events..."
            placeholderTextColor="#888"
          />
        </View>

        {/* Filter Categories (Horizontal Scroll) */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity style={[styles.filterChip, styles.filterChipActive]}>
            <Text style={styles.filterChipTextActive}>All Events</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.filterChip}>
            <Text style={styles.filterChipText}>Study Groups</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.filterChip}>
            <Text style={styles.filterChipText}>Social</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.filterChip}>
            <Text style={styles.filterChipText}>Makan</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* EVENT CARDS */}

        {/* Card 1 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Study Group: CS1234S</Text>
            <View style={styles.badgeDarkBlue}>
              <Text style={styles.badgeText}>STUDY GROUPS</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="book-outline" size={16} color="#444" />
            <Text style={styles.infoText}>Algorithms & Data Structures</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color="#444" />
            <Text style={styles.infoText}>COM1 12-34</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color="#444" />
            <Text style={styles.infoText}>Today, 14:00 - 17:00</Text>
          </View>

          <View style={styles.cardBottomRow}>
            {/* Avatar Stack */}
            <View style={styles.avatarStack}>
              <Image source={{ uri: 'https://randomuser.me/api/portraits/women/44.jpg' }} style={styles.stackedAvatar} />
              <Image source={{ uri: 'https://randomuser.me/api/portraits/men/46.jpg' }} style={[styles.stackedAvatar, { marginLeft: -10 }]} />
              <View style={[styles.stackedAvatar, styles.avatarMore, { marginLeft: -10 }]}>
                <Text style={styles.avatarMoreText}>+3</Text>
              </View>
            </View>

            {/* Progress Bar Info */}
            <View style={styles.progressContainer}>
              <Text style={styles.progressTextDark}>5/10 joined</Text>
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: '50%', backgroundColor: '#A04000' }]} />
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Request to Join</Text>
          </TouchableOpacity>
        </View>

        {/* Card 2 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Makan Jio at UTown</Text>
            <View style={styles.badgeBrown}>
              <Text style={styles.badgeText}>MAKAN</Text>
            </View>
          </View>

          <Text style={styles.descriptionText}>Korean food or Japanese Food? Let's decide over lunch!</Text>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color="#444" />
            <Text style={styles.infoText}>UTown Fine Food</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color="#444" />
            <Text style={styles.infoText}>Tomorrow, 12:30</Text>
          </View>

          <View style={[styles.cardBottomRow, { marginTop: 15 }]}>
            <View style={styles.organizerRow}>
              <Image source={{ uri: 'https://randomuser.me/api/portraits/men/22.jpg' }} style={styles.organizerAvatar} />
              <Text style={styles.organizerText}>Organized by Kevin</Text>
            </View>
            
            <View style={styles.progressContainer}>
              <Text style={styles.progressTextDark}>3/4 joined</Text>
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: '75%', backgroundColor: '#A04000' }]} />
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Request to Join</Text>
          </TouchableOpacity>
          
        </View>

      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab}>
        <Ionicons name="add" size={30} color="#FFF" />
      </TouchableOpacity>

      {/* Custom Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/home')}>
          <Ionicons name="home-outline" size={24} color="#666" />
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <View style={styles.activeNavIconBg}>
            <MaterialIcons name="event" size={20} color="#FFF" />
          </View>
          <Text style={styles.activeNavText}>Event</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/forum')}>
          <Ionicons name="chatbubbles-outline" size={24} color="#666" />
          <Text style={styles.navText}>Forum</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/buddy')}>
          <Ionicons name="person-add-outline" size={24} color="#666" />
          <Text style={styles.navText}>Buddy</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/profile')}>
          <Ionicons name="person-outline" size={24} color="#666" />
          <Text style={styles.navText}>Profile</Text>
        </TouchableOpacity>
      </View>
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
  
  /* Header Styles */
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  profileImage: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    marginRight: 10 
  },
  headerTitle: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#002D5B' 
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
    backgroundColor: '#EAEAEA',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    height: 35
  },
  filterChipActive: {
    backgroundColor: '#F28C28', // Orange
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

  /* Event Cards Shared Styles */
  card: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#002D5B',
    flex: 1,
    marginRight: 10
  },

  /* Badges */
  badgeDarkBlue: {
    backgroundColor: '#002D5B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  badgeBrown: {
    backgroundColor: '#8B4513',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  badgeBlack: {
    backgroundColor: '#222',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },

  /* Card Info Rows */
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  infoText: {
    fontSize: 13,
    color: '#444',
    marginLeft: 8
  },
  descriptionText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 10,
    lineHeight: 20
  },
  divider: {
    height: 1,
    backgroundColor: '#EAEAEA',
    marginVertical: 10
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  /* Avatars & Bottom Info */
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 5,
    marginBottom: 15
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  stackedAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#FFF'
  },
  avatarMore: {
    backgroundColor: '#EAEAEA',
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarMoreText: {
    fontSize: 10,
    color: '#555',
    fontWeight: 'bold'
  },
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  organizerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8
  },
  organizerText: {
    fontSize: 13,
    color: '#444'
  },

  /* Progress Bars */
  progressContainer: {
    alignItems: 'flex-end'
  },
  progressContainerLeft: {
    alignItems: 'flex-start'
  },
  progressTextDark: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#8B4513', // Brownish text
    marginBottom: 4
  },
  progressBarTrack: {
    height: 4,
    width: 60,
    backgroundColor: '#E0E0E0',
    borderRadius: 2
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2
  },

  /* Buttons */
  primaryButton: {
    backgroundColor: '#002D5B',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center'
  },
  primaryButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14
  },
  secondaryButton: {
    backgroundColor: '#002D5B',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center'
  },
  secondaryButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 13
  },

  /* Specific Card Layouts */
  iconBoxOrange: {
    backgroundColor: '#FFE8D6',
    padding: 6,
    borderRadius: 8,
    marginBottom: 10
  },
  imageContainer: {
    width: '100%',
    height: 140,
    position: 'relative'
  },
  cardImage: {
    width: '100%',
    height: '100%'
  },
  imageOverlayBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center'
  },
  imageOverlayText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3
  },
  cardContent: {
    padding: 16
  },

  /* Floating Action Button */
  fab: {
    position: 'absolute',
    bottom: 100, // Above bottom nav
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F28C28', // Orange
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5
  },

  /* Bottom Navigation Styles */
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 85,
    backgroundColor: '#F8F9FA',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#EAEAEA'
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  activeNavIconBg: {
    backgroundColor: '#002D5B',
    padding: 10,
    borderRadius: 12,
    marginBottom: 4
  },
  activeNavText: {
    fontSize: 12,
    color: '#002D5B',
    fontWeight: '700'
  },
  navText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontWeight: '500'
  }
});