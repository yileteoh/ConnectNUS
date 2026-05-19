// frontend/app/profile.js
import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView,
  Image
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Header from '../../components/Header';
import { auth } from '../../firebaseConfig'; 
import { signOut } from 'firebase/auth';

export default function ProfileScreen() {
  const router = useRouter(); // Initialize router for navigation

  return (
    <SafeAreaView style={styles.safeArea}>
      
      {/* Header Section */}
      <Header showSettings={true} onSettingsPress={() => router.push('/settings')} />

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 20 }}>
        
        {/* Main Profile Info Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Image 
              source={{ uri: 'https://randomuser.me/api/portraits/men/32.jpg' }} 
              style={styles.mainAvatar} 
            />
            {/* Verified Badge */}
            <View style={styles.verifiedBadge}>
              <MaterialCommunityIcons name="check-decagram" size={20} color="#F28C28" />
            </View>
          </View>

          <Text style={styles.profileName}>
            {auth.currentUser?.email ? auth.currentUser.email.split('@')[0] : 'Student'}
          </Text>
          <Text style={styles.profileSubtitle}>School of Computing • Year 3</Text>

          <View style={styles.actionButtonsRow}>
            <TouchableOpacity style={styles.btnPrimary}>
              <Text style={styles.btnPrimaryText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnSecondary}>
              <Text style={styles.btnSecondaryText}>Share Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Academic Profile Section */}
        <Text style={styles.sectionHeading}>Academic Profile</Text>
        
        <View style={styles.academicCard}>
          <Text style={styles.interestsLabel}>INTERESTS</Text>
          <View style={styles.chipsContainer}>
            <View style={styles.chip}><Text style={styles.chipText}>Artificial Intelligence</Text></View>
            <View style={styles.chip}><Text style={styles.chipText}>UI/UX Design</Text></View>
            <View style={styles.chip}><Text style={styles.chipText}>Cybersecurity</Text></View>
            <View style={styles.chip}><Text style={styles.chipText}>FinTech</Text></View>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCardDark}>
            <Ionicons name="book-outline" size={28} color="#FFF" style={styles.statIcon} />
            <Text style={styles.statNumberWhite}>6</Text>
            <Text style={styles.statLabelWhite}>Active Modules</Text>
          </View>
          <View style={styles.statCardOrange}>
            <Ionicons name="people-outline" size={28} color="#A04000" style={styles.statIcon} />
            <Text style={styles.statNumberDark}>4</Text>
            <Text style={styles.statLabelDark}>Study Groups</Text>
          </View>
        </View>

        {/* My Badges Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>My Badges</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgesScroll}>
          <View style={styles.badgeItem}>
            <View style={[styles.badgeCircle, { borderColor: '#F28C28', backgroundColor: '#FFF5EB' }]}>
              <FontAwesome5 name="medal" size={24} color="#A04000" />
            </View>
            <Text style={styles.badgeLabel}>Top Mentor</Text>
          </View>
          <View style={styles.badgeItem}>
            <View style={[styles.badgeCircle, { borderColor: '#002D5B', backgroundColor: '#EBF4FA' }]}>
              <Ionicons name="book" size={24} color="#002D5B" />
            </View>
            <Text style={styles.badgeLabel}>Resource King</Text>
          </View>
          <View style={styles.badgeItem}>
            <View style={[styles.badgeCircle, { borderColor: '#CCC', backgroundColor: '#F9F9F9' }]}>
              <Ionicons name="calendar" size={24} color="#666" />
            </View>
            <Text style={styles.badgeLabel}>Early Bird</Text>
          </View>
          <View style={styles.badgeItem}>
            <View style={[styles.badgeCircle, { borderColor: '#CCC', backgroundColor: '#F9F9F9' }]}>
              <Ionicons name="star" size={24} color="#666" />
            </View>
            <Text style={styles.badgeLabel}>Hello World</Text>
          </View>
        </ScrollView>

        {/* Past Sessions Section */}
        <Text style={styles.sectionHeading}>Past Sessions</Text>
        
        <View style={styles.listCard}>
          <View style={styles.cardHeaderBetween}>
            <View style={styles.tagLightBlue}>
              <Text style={styles.tagTextDark}>CS1234S</Text>
            </View>
            <Text style={styles.timeText}>2 days ago</Text>
          </View>
          <Text style={styles.listCardTitle}>Python Crash Course</Text>
          <Text style={styles.listCardSubtitle}>COM1 12-34</Text>
        </View>

        <View style={styles.listCard}>
          <View style={styles.cardHeaderBetween}>
            <View style={styles.tagLightBlue}>
              <Text style={styles.tagTextDark}>CS4231S</Text>
            </View>
            <Text style={styles.timeText}>1 week ago</Text>
          </View>
          <Text style={styles.listCardTitle}>Data Structure Review</Text>
          <Text style={styles.listCardSubtitle}>COM5 43-21</Text>
        </View>

      </ScrollView>

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
  
  /* Main Profile Card */
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 15
  },
  mainAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: '#FFF'
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 2
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#002D5B',
    marginBottom: 4
  },
  profileSubtitle: {
    fontSize: 14,
    color: '#555',
    marginBottom: 20
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%'
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: '#002D5B',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 10
  },
  btnPrimaryText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14
  },
  btnSecondary: {
    flex: 1,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#002D5B',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  btnSecondaryText: {
    color: '#002D5B',
    fontWeight: '600',
    fontSize: 14
  },

  /* Common Headings */
  sectionHeading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#002D5B',
    marginBottom: 12,
    marginTop: 10
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 12
  },
  viewAllText: {
    color: '#555',
    fontSize: 14
  },

  /* Academic Profile */
  academicCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  interestsLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#A04000',
    marginBottom: 10
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  chip: {
    backgroundColor: '#F0F2F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8
  },
  chipText: {
    color: '#333',
    fontSize: 13,
    fontWeight: '500'
  },

  /* Stats Row */
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25
  },
  statCardDark: {
    flex: 1,
    backgroundColor: '#002D5B',
    padding: 16,
    borderRadius: 12,
    marginRight: 10
  },
  statCardOrange: {
    flex: 1,
    backgroundColor: '#F28C28',
    padding: 16,
    borderRadius: 12
  },
  statIcon: {
    marginBottom: 15
  },
  statNumberWhite: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 2
  },
  statLabelWhite: {
    fontSize: 13,
    color: '#D0E3F5'
  },
  statNumberDark: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#703000',
    marginBottom: 2
  },
  statLabelDark: {
    fontSize: 13,
    color: '#703000'
  },

  /* Badges Scroll */
  badgesScroll: {
    marginBottom: 25
  },
  badgeItem: {
    alignItems: 'center',
    marginRight: 20,
    width: 70
  },
  badgeCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8
  },
  badgeLabel: {
    fontSize: 11,
    color: '#444',
    textAlign: 'center',
    fontWeight: '500'
  },

  /* Past Sessions & Common List Cards */
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  cardHeaderBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  tagLightBlue: {
    backgroundColor: '#E0E8F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  tagTextDark: {
    color: '#002D5B',
    fontSize: 12,
    fontWeight: '600'
  },
  timeText: {
    fontSize: 13,
    color: '#666'
  },
  listCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#002D5B',
    marginBottom: 4
  },
  listCardSubtitle: {
    fontSize: 14,
    color: '#555'
  },

  /* Bookmarks Style */
  bookmarkCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  bookmarkLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15
  }

});