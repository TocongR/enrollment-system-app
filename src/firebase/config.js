// src/firebase/config.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCmKb6ZNlKBnd1jDuftwXfSqJEjhrR4BEY",
    authDomain: "enrollment-sys-406bd.firebaseapp.com",
    projectId: "enrollment-sys-406bd",
    storageBucket: "enrollment-sys-406bd.firebasestorage.app",
    messagingSenderId: "23489998883",
    appId: "1:23489998883:web:dd4a2df9872a5ac0eb8196"
  };
  
// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);