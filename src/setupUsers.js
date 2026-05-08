// src/setupUsers.js
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase/config';

// This function creates initial users
export const setupUsers = async () => {
  const users = [
    {
      studentId: '2023-3037-I',
      password: 'Garcia',
      fullName: 'Juan Garcia',
      role: 'student'
    },
    {
      studentId: '2023-1234-A',
      password: 'Reyes',
      fullName: 'Maria Reyes',
      role: 'student'
    },
    {
      studentId: 'ADMIN-001',
      password: 'admin123',
      fullName: 'Admin User',
      role: 'admin'
    }
  ];

  for (const user of users) {
    try {
      // Create email from studentId
      const email = `${user.studentId}@enrollment.system`;
      
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        email, 
        user.password
      );
      
      // Save user data in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        studentId: user.studentId,
        fullName: user.fullName,
        role: user.role,
        createdAt: new Date()
      });
      
      console.log(`✅ User ${user.studentId} created successfully`);
    } catch (error) {
      console.error(`❌ Error creating user ${user.studentId}:`, error.message);
    }
  }
  
  console.log('🎉 Setup complete!');
};