// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const analytics = getAnalytics(app);
const auth = getAuth(app);
export default app;