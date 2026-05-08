// src/firebase/config.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDlkAZzWrR5ajVwhHFupKUe1eobcd7Kuk8",
    authDomain: "univ-enrollment-sy.firebaseapp.com",
    projectId: "univ-enrollment-sy",
    storageBucket: "univ-enrollment-sy.firebasestorage.app",
    messagingSenderId: "1025181197864",
    appId: "1:1025181197864:web:1d490f5210a25b440df71d"
};
  
// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);