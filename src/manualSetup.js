// src/manualSetup.js
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase/config';

// Create ONE student
export const createStudent1 = async () => {
  try {
    console.log('Creating student 2023-3037-I...');
    
    const email = '2023-3037-I@enrollment.system';
    const password = 'Garcia';
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log('Auth created:', userCredential.user.uid);
    
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      studentId: '2023-3037-I',
      fullName: 'Juan Garcia',
      role: 'student',
      programId: 'BSCS',
      programName: 'BS Computer Science',
      yearLevel: 1,
      section: 'A',
      createdAt: new Date()
    });
    
    console.log('✅ Student created successfully!');
    alert('Student 2023-3037-I created!');
  } catch (error) {
    console.error('Error:', error);
    alert(`Error: ${error.message}`);
  }
};

export const createStudent2 = async () => {
  try {
    console.log('Creating student 2023-1234-A...');
    
    const email = '2023-1234-A@enrollment.system';
    const password = 'Reyes';
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log('Auth created:', userCredential.user.uid);
    
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      studentId: '2023-1234-A',
      fullName: 'Maria Reyes',
      role: 'student',
      programId: 'BSCS',
      programName: 'BS Computer Science',
      yearLevel: 1,
      section: 'B',
      createdAt: new Date()
    });
    
    console.log('✅ Student created successfully!');
    alert('Student 2023-1234-A created!');
  } catch (error) {
    console.error('Error:', error);
    alert(`Error: ${error.message}`);
  }
};

export const createAdmin = async () => {
  try {
    console.log('Creating admin...');
    
    const email = 'ADMIN-001@enrollment.system';
    const password = 'admin123';
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log('Auth created:', userCredential.user.uid);
    
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      studentId: 'ADMIN-001',
      fullName: 'Admin User',
      role: 'admin',
      createdAt: new Date()
    });
    
    console.log('✅ Admin created successfully!');
    alert('Admin created!');
  } catch (error) {
    console.error('Error:', error);
    alert(`Error: ${error.message}`);
  }
};

export const createProfessor1 = async () => {
  try {
    console.log('Creating professor...');
    
    const email = 'PROF-001@enrollment.system';
    const password = 'prof123';
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log('Auth created:', userCredential.user.uid);
    
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      studentId: 'PROF-001',
      fullName: 'Prof. Robert Garcia',
      role: 'professor',
      createdAt: new Date()
    });
    
    console.log('✅ Professor created successfully!');
    alert('Professor created!');
  } catch (error) {
    console.error('Error:', error);
    alert(`Error: ${error.message}`);
  }
};

export const createProfessor2 = async () => {
  try {
    console.log('Creating professor...');
    
    const email = 'PROF-002@enrollment.system';
    const password = 'prof123';
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log('Auth created:', userCredential.user.uid);
    
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      studentId: 'PROF-002',
      fullName: 'Prof. Lisa Santos',
      role: 'professor',
      createdAt: new Date()
    });
    
    console.log('✅ Professor created successfully!');
    alert('Professor created!');
  } catch (error) {
    console.error('Error:', error);
    alert(`Error: ${error.message}`);
  }
};