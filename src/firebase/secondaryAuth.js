// src/firebase/secondaryAuth.js
// Secondary Firebase app for creating user accounts without logging out the current admin
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCmKb6ZNlKBnd1jDuftwXfSqJEjhrR4BEY",
  authDomain: "enrollment-sys-406bd.firebaseapp.com",
  projectId: "enrollment-sys-406bd",
  storageBucket: "enrollment-sys-406bd.firebasestorage.app",
  messagingSenderId: "23489998883",
  appId: "1:23489998883:web:dd4a2df9872a5ac0eb8196"
};

const secondaryApp = initializeApp(firebaseConfig, 'secondaryApp');
export const secondaryAuth = getAuth(secondaryApp);
