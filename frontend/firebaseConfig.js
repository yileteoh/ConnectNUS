// Import the functions need from the SDKs
import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB3jQAJlZab-jq7jiOD3l1QalSZJqN4tHk",
  authDomain: "connectnus-f180c.firebaseapp.com",
  projectId: "connectnus-f180c",
  storageBucket: "connectnus-f180c.firebasestorage.app",
  messagingSenderId: "938348427823",
  appId: "1:938348427823:web:e9e04cbfa26f80e473a4da",
  measurementId: "G-HYTPL3V5MV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});
export const db = getFirestore(app);
export { auth };
export default app;