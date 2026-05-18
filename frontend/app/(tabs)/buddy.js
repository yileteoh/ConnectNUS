// frontend/app/buddy.js
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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Header from '../../components/Header';

export default function BuddyScreen() {
  const router = useRouter(); // Initialize router for navigation
  return (
    <SafeAreaView style={styles.safeArea}>
      
      {/* Header Section */}
      <Header title="Buddy" />

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 20 }}>
        
        {/* ACTION CARDS */}
        {/* Find a Senior Card */}
        <View style={styles.primaryActionCard}>
          <Ionicons name="person-add" size={100} color="rgba(255,255,255,0.1)" style={styles.bgIcon} />
          <Text style={styles.actionCardTitleWhite}>Find a Senior</Text>
          <Text style={styles.actionCardDescWhite}>
            Get guidance from experienced seniors in your faculty.
          </Text>
          <TouchableOpacity style={styles.actionBtnOrange}>
            <Text style={styles.actionBtnTextWhite}>Request a Buddy</Text>
          </TouchableOpacity>
        </View>

        {/* Give Back Card */}
        <View style={styles.secondaryActionCard}>
          <Ionicons name="school" size={100} color="rgba(0,0,0,0.03)" style={styles.bgIcon} />
          <Text style={styles.actionCardTitleDark}>Give Back</Text>
          <Text style={styles.actionCardDescDark}>
            Support freshmen and build your leadership profile.
          </Text>
          <TouchableOpacity style={styles.actionBtnOutline}>
            <Text style={styles.actionBtnTextDark}>Volunteer as Mentor</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Categories (Horizontal Scroll) */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity style={[styles.filterChip, styles.filterChipActive]}>
            <Text style={styles.filterChipTextActive}>All Faculty</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterChip}>
            <Text style={styles.filterChipText}>School of Computing</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterChip}>
            <Text style={styles.filterChipText}>Faculty of Science</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterChip}>
            <Text style={styles.filterChipText}>Business School</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterChip}>
            <Text style={styles.filterChipText}>College of Design and Engineering</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterChip}>
            <Text style={styles.filterChipText}>Faculty of Law</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Suggested Seniors</Text>
            <Text style={styles.sectionSubtitle}>Matched with your interests in 'AI' and 'Machine Learning'</Text>
          </View>
          <TouchableOpacity style={styles.viewAllBtn}>
            <Text style={styles.viewAllText}>View all</Text>
            <Ionicons name="arrow-forward" size={14} color="#A04000" />
          </TouchableOpacity>
        </View>

        {/* MENTOR CARDS */}

        {/* Mentor 1 */}
        <View style={styles.mentorCard}>
          <View style={styles.mentorHeader}>
            <Image source={{ uri: 'https://randomuser.me/api/portraits/men/32.jpg' }} style={styles.mentorAvatar} />
            <View style={styles.facultyTag}>
              <Text style={styles.facultyTagText}>SoC</Text>
            </View>
          </View>
          
          <Text style={styles.mentorName}>Alex Tan</Text>
          <Text style={styles.mentorInfo}>Year 4 • Software Engineering</Text>
          
          <View style={styles.skillsRow}>
            <View style={styles.skillPill}><Text style={styles.skillText}>Machine Learning</Text></View>
            <View style={styles.skillPill}><Text style={styles.skillText}>Hackathons</Text></View>
          </View>

          <TouchableOpacity style={styles.requestMatchBtn}>
            <Text style={styles.requestMatchBtnText}>Request Match</Text>
          </TouchableOpacity>
        </View>

        {/* Mentor 2 */}
        <View style={styles.mentorCard}>
          <View style={styles.mentorHeader}>
            <Image source={{ uri: 'https://randomuser.me/api/portraits/women/65.jpg' }} style={styles.mentorAvatar} />
            <View style={styles.facultyTag}>
              <Text style={styles.facultyTagText}>BUSINESS</Text>
            </View>
          </View>
          
          <Text style={styles.mentorName}>Sarah Lim</Text>
          <Text style={styles.mentorInfo}>Year 3 • Real Estate</Text>
          
          <View style={styles.skillsRow}>
            <View style={styles.skillPill}><Text style={styles.skillText}>Career Prep</Text></View>
          </View>

          <TouchableOpacity style={styles.requestMatchBtn}>
            <Text style={styles.requestMatchBtnText}>Request Match</Text>
          </TouchableOpacity>
        </View>

        {/* Mentor 3 */}
        <View style={styles.mentorCard}>
          <View style={styles.mentorHeader}>
            <Image source={{ uri: 'https://randomuser.me/api/portraits/men/78.jpg' }} style={styles.mentorAvatar} />
            <View style={styles.facultyTag}>
              <Text style={styles.facultyTagText}>CDE</Text>
            </View>
          </View>
          
          <Text style={styles.mentorName}>Marcus Wong</Text>
          <Text style={styles.mentorInfo}>Year 4 • Architecture</Text>
          
          <View style={styles.skillsRow}>
            <View style={styles.skillPill}><Text style={styles.skillText}>Design Thinking</Text></View>
            <View style={styles.skillPill}><Text style={styles.skillText}>Studio Life</Text></View>
          </View>

          <TouchableOpacity style={styles.requestMatchBtn}>
            <Text style={styles.requestMatchBtnText}>Request Match</Text>
          </TouchableOpacity>
        </View>

        {/* TOP CONTRIBUTORS SECTION */}
        <View style={styles.contributorsSection}>
          <View style={styles.contributorsHeader}>
            <View style={styles.iconBoxOrange}>
              <Ionicons name="star" size={20} color="#000" />
            </View>
            <View style={styles.contributorsHeaderText}>
              <Text style={styles.contributorsTitle}>Top Contributors</Text>
              <Text style={styles.contributorsDesc}>Meet the seniors with the most 'Helpful' badges this month.</Text>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.contributorsScroll}>
            <View style={styles.contributorItem}>
              <Image source={{ uri: 'https://randomuser.me/api/portraits/women/33.jpg' }} style={styles.contributorAvatar} />
            </View>
            <View style={styles.contributorItem}>
              <Image source={{ uri: 'https://randomuser.me/api/portraits/men/22.jpg' }} style={styles.contributorAvatar} />
            </View>
            <View style={styles.contributorItem}>
              <Image source={{ uri: 'https://randomuser.me/api/portraits/men/45.jpg' }} style={styles.contributorAvatar} />
            </View>
            {/* Partial visible avatar to indicate scroll */}
            <View style={styles.contributorItem}>
              <Image source={{ uri: 'https://randomuser.me/api/portraits/women/12.jpg' }} style={styles.contributorAvatar} />
            </View>
            <View style={styles.contributorItem}>
              <Image source={{ uri: 'https://randomuser.me/api/portraits/women/13.jpg' }} style={styles.contributorAvatar} />
            </View>
          </ScrollView>
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
  
  /* Action Cards */
  primaryActionCard: {
    backgroundColor: '#002D5B',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    position: 'relative',
    overflow: 'hidden' // Keeps background icon inside
  },
  secondaryActionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    position: 'relative',
    overflow: 'hidden'
  },
  bgIcon: {
    position: 'absolute',
    right: -15,
    bottom: -20,
    transform: [{ rotate: '-10deg' }]
  },
  actionCardTitleWhite: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8
  },
  actionCardDescWhite: {
    fontSize: 14,
    color: '#D0E3F5',
    marginBottom: 15,
    maxWidth: '70%' // Prevent text overlapping icon too much
  },
  actionCardTitleDark: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#002D5B',
    marginBottom: 8
  },
  actionCardDescDark: {
    fontSize: 14,
    color: '#555',
    marginBottom: 15,
    maxWidth: '70%'
  },
  actionBtnOrange: {
    backgroundColor: '#F28C28',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start'
  },
  actionBtnTextWhite: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 13
  },
  actionBtnOutline: {
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#002D5B',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start'
  },
  actionBtnTextDark: {
    color: '#002D5B',
    fontWeight: 'bold',
    fontSize: 13
  },

  /* Filter Categories */
  filterScroll: {
    marginBottom: 25,
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
    backgroundColor: '#002D5B', // Dark Blue
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

  /* Section Header */
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#002D5B',
    marginBottom: 4
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#666'
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4
  },
  viewAllText: {
    color: '#A04000',
    fontSize: 13,
    fontWeight: '600',
    marginRight: 2
  },

  /* Mentor Cards */
  mentorCard: {
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
  mentorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10
  },
  mentorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  facultyTag: {
    backgroundColor: '#FFE8D6', // Pale Orange
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  facultyTagText: {
    color: '#A04000', // Brown
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },
  mentorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#002D5B',
    marginBottom: 4
  },
  mentorInfo: {
    fontSize: 13,
    color: '#555',
    marginBottom: 12
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15
  },
  skillPill: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 8
  },
  skillText: {
    fontSize: 12,
    color: '#444'
  },
  requestMatchBtn: {
    backgroundColor: '#002D5B',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    width: '100%'
  },
  requestMatchBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14
  },

  /* Top Contributors Section */
  contributorsSection: {
    backgroundColor: '#EAECEE',
    borderRadius: 12,
    padding: 16,
    marginBottom: 30
  },
  contributorsHeader: {
    flexDirection: 'row',
    marginBottom: 15
  },
  iconBoxOrange: {
    backgroundColor: '#F28C28',
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  contributorsHeaderText: {
    flex: 1
  },
  contributorsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#002D5B',
    marginBottom: 2
  },
  contributorsDesc: {
    fontSize: 13,
    color: '#555'
  },
  contributorsScroll: {
    flexDirection: 'row'
  },
  contributorItem: {
    alignItems: 'center',
    marginRight: 20
  },
  contributorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#A04000', // Brownish border like the image
    marginBottom: 6
  },
  contributorName: {
    fontSize: 12,
    color: '#333'
  }
});