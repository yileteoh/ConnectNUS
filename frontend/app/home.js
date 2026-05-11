// frontend/app/home.js
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
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
        
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

        {/* Greeting Section */}
        <View style={styles.greetingSection}>
          <Text style={styles.welcomeTitle}>Hi, NUSSTU!</Text>
          <Text style={styles.subTitle}>What are you looking for today?</Text>
        </View>

        {/* Quick Actions (3 buttons) */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity style={styles.actionCard}>
            <Ionicons name="chatbubbles-outline" size={32} color="#F28C28" style={styles.actionIcon} />
            <Text style={styles.actionText}>Forum</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <Ionicons name="person-add-outline" size={32} color="#003D7C" style={styles.actionIcon} />
            <Text style={styles.actionText}>Buddy{"\n"}Match</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <Ionicons name="map-outline" size={32} color="#8B4513" style={styles.actionIcon} />
            <Text style={styles.actionText}>Study Spot</Text>
          </TouchableOpacity>
        </View>

        {/* Recommended Study Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recommended Study</Text>
          <TouchableOpacity><Text style={styles.seeAllText}>See All</Text></TouchableOpacity>
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
          {/* Study Card 1 */}
          <View style={styles.studyCard}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.badgeBlue}><Text style={styles.badgeTextWhite}>CS1234S</Text></View>
              <Ionicons name="people" size={20} color="#F28C28" />
            </View>
            <Text style={styles.cardMainTitle}>Data Structures Review</Text>
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={16} color="#666" />
              <Text style={styles.infoText}>14:00 - 16:00</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={16} color="#666" />
              <Text style={styles.infoText}>Central Library Level 4</Text>
            </View>
            <TouchableOpacity style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Join Session</Text>
            </TouchableOpacity>
          </View>

          {/* Study Card 2 */}
          <View style={styles.studyCard}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.badgeBlue}><Text style={styles.badgeTextWhite}>MA4321</Text></View>
              <Ionicons name="people" size={20} color="#F28C28" />
            </View>
            <Text style={styles.cardMainTitle}>Calculus Midterm Prep</Text>
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={16} color="#666" />
              <Text style={styles.infoText}>16:30 - 18:30</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={16} color="#666" />
              <Text style={styles.infoText}>UTown Starbucks</Text>
            </View>
            <TouchableOpacity style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Join Session</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Upcoming Events Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming Events</Text>
          <TouchableOpacity><Text style={styles.seeAllText}>See All</Text></TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
          {/* Event Card 1 */}
          <View style={styles.eventCard}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=400' }} 
              style={styles.eventImage} 
            />
            <View style={styles.badgeOrangeAbsolute}><Text style={styles.badgeTextWhite}>Tech Week</Text></View>
            <View style={styles.eventCardContent}>
              <Text style={styles.cardMainTitle}>AI Career Talk</Text>
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={16} color="#666" />
                <Text style={styles.infoText}>24 Oct, 18:00</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={16} color="#666" />
                <Text style={styles.infoText}>COM1-02-03</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Progress Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressTextContainer}>
            <Text style={styles.progressTitle}>Your Progress</Text>
            <Text style={styles.progressSubtitle}>12 sessions completed this week!</Text>
            {/* Progress Bar Track */}
            <View style={styles.progressBarBackground}>
              {/* Progress Bar Fill */}
              <View style={styles.progressBarFill} />
            </View>
          </View>
          <View style={styles.progressIconContainer}>
            <FontAwesome5 name="award" size={32} color="#FFF" />
          </View>
        </View>

      </ScrollView>

      {/* Custom Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <View style={styles.activeNavIconBg}>
            <Ionicons name="home" size={20} color="#FFF" />
          </View>
          <Text style={styles.activeNavText}>Home</Text>
        </TouchableOpacity>

        {/* Changed from Study to Event per user request */}
        <TouchableOpacity style={styles.navItem}>
          <MaterialIcons name="event" size={24} color="#666" />
          <Text style={styles.navText}>Event</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="chatbubbles-outline" size={24} color="#666" />
          <Text style={styles.navText}>Forum</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="person-add-outline" size={24} color="#666" />
          <Text style={styles.navText}>Buddy</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
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
    paddingHorizontal: 20 
  },
  
  /* Header Styles */
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingVertical: 15,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  profileImage: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    marginRight: 12 
  },
  headerTitle: { 
    fontSize: 22, 
    fontWeight: '700', 
    color: '#002D5B' 
  },

  /* Greeting Styles */
  greetingSection: {
    marginTop: 10,
    marginBottom: 20
  },
  welcomeTitle: { 
    fontSize: 24, 
    fontWeight: 'bold',
    color: '#002D5B' 
  },
  subTitle: { 
    fontSize: 16, 
    color: '#555', 
    marginTop: 5 
  },

  /* Quick Actions (3 buttons) */
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25
  },
  actionCard: {
    width: '31%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  actionIcon: {
    marginBottom: 10
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center'
  },

  /* Section Headers */
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    marginTop: 10
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '700',
    color: '#000'
  },
  seeAllText: {
    fontSize: 14,
    color: '#002D5B',
    fontWeight: '600'
  },

  /* Horizontal Scroll Layouts */
  horizontalScroll: {
    marginHorizontal: -20, // allows cards to scroll edge-to-edge
    paddingHorizontal: 20,
    marginBottom: 25
  },

  /* Study Card Styles */
  studyCard: {
    width: 260,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  badgeBlue: {
    backgroundColor: '#002D5B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6
  },
  badgeTextWhite: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600'
  },
  cardMainTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#002D5B',
    marginBottom: 10
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  infoText: {
    fontSize: 13,
    color: '#555',
    marginLeft: 6
  },
  primaryButton: {
    backgroundColor: '#002D5B',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 15
  },
  primaryButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14
  },

  /* Event Card Styles */
  eventCard: {
    width: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    overflow: 'hidden'
  },
  eventImage: {
    width: '100%',
    height: 120,
  },
  badgeOrangeAbsolute: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#B85000',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6
  },
  eventCardContent: {
    padding: 16
  },

  /* Progress Card Styles */
  progressCard: {
    backgroundColor: '#001E3D',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30
  },
  progressTextContainer: {
    flex: 1,
    marginRight: 15
  },
  progressTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4
  },
  progressSubtitle: {
    color: '#D0D0D0',
    fontSize: 14,
    marginBottom: 15
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: '#1E3A5F',
    borderRadius: 3,
    width: '100%'
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#F28C28',
    borderRadius: 3,
    width: '60%' // Example percentage
  },
  progressIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F28C28',
    justifyContent: 'center',
    alignItems: 'center'
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