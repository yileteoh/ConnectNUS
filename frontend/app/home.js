// frontend/app/home.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ConnectNUS</Text>
        <TouchableOpacity style={styles.profileCircle}>
          <Text style={{color: '#fff'}}>TL</Text> 
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContent}>
        {/* Welcome Message */}
        <Text style={styles.welcomeTitle}>Hello, NUSSTU!</Text>
        <Text style={styles.subTitle}>What are you looking for today?</Text>

        {/* Feature Cards Grid (Based on your image) */}
        <View style={styles.grid}>
          <TouchableOpacity style={styles.card}>
            <Text style={styles.cardIcon}>📚</Text>
            <Text style={styles.cardText}>Study Groups</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.card}>
            <Text style={styles.cardIcon}>💬</Text>
            <Text style={styles.cardText}>Forums</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.card}>
            <Text style={styles.cardIcon}>📅</Text>
            <Text style={styles.cardText}>Events</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.card}>
            <Text style={styles.cardIcon}>🤝</Text>
            <Text style={styles.cardText}>Mentorship</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Activity Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Events</Text>
          <View style={styles.eventItem}>
            <Text style={styles.eventText}>Orbital LiftOff (Proof of Concept) - May 13</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    padding: 20, 
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE'
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#003D7C' },
  profileCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#003D7C', justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20 },
  welcomeTitle: { fontSize: 24, fontWeight: 'bold' },
  subTitle: { fontSize: 16, color: '#666', marginBottom: 30 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { 
    width: '46%', 
    backgroundColor: '#F0F4F8', 
    padding: 20, 
    borderRadius: 15, 
    marginBottom: 20, 
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    elevation: 3
  },
  cardIcon: { fontSize: 30, marginBottom: 10 },
  cardText: { fontWeight: '600', color: '#333' },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  eventItem: { padding: 15, backgroundColor: '#FFF9E6', borderRadius: 10, borderLeftWidth: 4, borderLeftColor: '#FFB800' },
  eventText: { fontWeight: '500' }
});