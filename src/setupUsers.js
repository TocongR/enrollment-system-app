// src/setupUsers.js
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase/config';

export const setupUsers = async () => {
  console.log('🚀 Starting user setup...');

  if (!auth || !db) {
    console.error('❌ Firebase auth or db is undefined. Check your firebase/config import.');
    return { success: false, message: 'Firebase not initialized' };
  }

  const users = [
    {
      studentId: '2023-3037-I',
      password: 'Garcia123',
      fullName: 'Juan Garcia',
      role: 'student',
      programId: 'BSCS',
      programName: 'BS Computer Science',
      yearLevel: 1,
      section: 'A'
    },
    {
      studentId: '2023-1234-A',
      password: 'Reyes123',
      fullName: 'Maria Reyes',
      role: 'student',
      programId: 'BSCS',
      programName: 'BS Computer Science',
      yearLevel: 1,
      section: 'B'
    },
    {
      studentId: '2024-5678-B',
      password: 'Cruz123',
      fullName: 'Pedro Cruz',
      role: 'student',
      programId: 'BSCE',
      programName: 'BS Civil Engineering',
      yearLevel: 2,
      section: 'A'
    },
    {
      studentId: 'PROF-001',
      password: 'prof123',
      fullName: 'Prof. Robert Garcia',
      role: 'professor'
    },
    {
      studentId: 'PROF-002',
      password: 'prof123',
      fullName: 'Prof. Lisa Santos',
      role: 'professor'
    },
    {
      studentId: 'ADMIN-001',
      password: 'admin123',
      fullName: 'Admin User',
      role: 'admin'
    }
  ];

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  for (const user of users) {
    try {
      if (!user.password || user.password.length < 6) {
        throw new Error(`Password too short for ${user.studentId}: "${user.password}" (min 6 chars)`);
      }

      console.log(`\n📝 Creating: ${user.studentId} (${user.role})`);

      const email = `${user.studentId.toLowerCase()}@enrollment.system`;
      console.log(`   Email: ${email}`);

      const userCredential = await createUserWithEmailAndPassword(auth, email, user.password);
      console.log(`   ✓ Auth UID: ${userCredential.user.uid}`);

      const userData = {
        studentId: user.studentId,
        fullName: user.fullName,
        role: user.role,
        createdAt: new Date()
      };

      if (user.role === 'student') {
        userData.programId = user.programId;
        userData.programName = user.programName;
        userData.yearLevel = user.yearLevel;
        userData.section = user.section;
      }

      await setDoc(doc(db, 'users', userCredential.user.uid), userData);
      console.log(`   ✓ Firestore saved`);
      console.log(`✅ SUCCESS: ${user.studentId}`);
      successCount++;

    } catch (error) {
      errorCount++;
      if (error.code === 'auth/email-already-in-use') {
        console.warn(`⚠️  SKIPPED: ${user.studentId} already exists`);
      } else {
        console.error(`❌ FAILED: ${user.studentId} — ${error.code || ''} ${error.message}`);
        errors.push(`${user.studentId}: ${error.message}`);
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Success: ${successCount} | ❌ Failed: ${errorCount}`);
  if (errors.length) console.error('Errors:\n' + errors.join('\n'));
  console.log('='.repeat(50));

  return { successCount, errorCount, errors };
};