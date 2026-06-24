// frontend/app/nus-links.js
import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  Linking, 
  Platform, 
  StatusBar,
  ScrollView,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function NusLinksScreen() {
  const router = useRouter();

  // Array of NUS specific quick links using actual logo image URIs
  const nusLinks = [
    { 
      id: '1', 
      title: 'Canvas', 
      description: 'Access your modules and assignments',
      url: 'https://canvas.nus.edu.sg', 
      logoUri: require('../assets/canvas-student.jpg')
    },
    { 
      id: '2', 
      title: 'EduRec', 
      description: 'Manage academic records and modules',
      url: 'https://myedurec.nus.edu.sg', 
      logoUri: require('../assets/edurec.jpg') 
    },
    { 
      id: '3', 
      title: 'NUS Library', 
      description: 'Search for books, journals, and papers',
      url: 'https://lib.nus.edu.sg', 
      logoUri: require('../assets/nus-library.png')
    },
    { 
      id: '4', 
      title: 'NUSMODS', 
      description: 'Plan your timetable and campus route',
      url: 'https://nusmods.com', 
      logoUri: require('../assets/nusmods.png')
    }
  ];

  // Function to safely open external URLs in device browser
  const openExternalLink = async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        console.error("Cannot open the URL: " + url);
      }
    } catch (error) {
      console.error("An error occurred opening the link", error);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      
      {/* Custom Header with Back Button */}
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#002D5B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Campus Links</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Main Content Area */}
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={{ paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageSubtitle}>
          Quickly navigate to frequently used NUS portals and services.
        </Text>

        {/* Render Link Cards dynamically */}
        {nusLinks.map((link) => (
          <TouchableOpacity 
            key={link.id} 
            style={styles.linkCard} 
            activeOpacity={0.8}
            onPress={() => openExternalLink(link.url)}
          >
            {/* Left Icon Container (App Icon Style) */}
            <View style={styles.appIconBox}>
              <Image 
                source={link.logoUri}
                style={styles.logoImage} 
              />
            </View>

            {/* Middle Text Details */}
            <View style={styles.textContainer}>
              <Text style={styles.linkTitle}>{link.title}</Text>
              <Text style={styles.linkDescription}>{link.description}</Text>
            </View>

            {/* Right Arrow Indicator */}
            <Ionicons name="open-outline" size={20} color="#888" />
          </TouchableOpacity>
        ))}
      </ScrollView>

    </SafeAreaView>
  );
}

// Stylesheet mapping
const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#FAFAFA',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },
  backButton: {
    padding: 5,
    marginLeft: -5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#002D5B',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  pageSubtitle: {
    fontSize: 15,
    color: '#666',
    marginBottom: 25,
    lineHeight: 22,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  appIconBox: {
    width: 50,
    height: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  logoImage: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  linkTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#002D5B',
    marginBottom: 4,
  },
  linkDescription: {
    fontSize: 13,
    color: '#666',
  }
});