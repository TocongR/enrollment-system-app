// src/setupData.js
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { db } from './firebase/config';

export const setupSampleData = async () => {
  try {
    console.log('Setting up sample data...');

    // 1. Create Programs
    const programs = [
      {
        id: 'BSCS',
        code: 'BSCS',
        name: 'BS Computer Science',
        totalYears: 4
      },
      {
        id: 'BSCE',
        code: 'BSCE',
        name: 'BS Civil Engineering',
        totalYears: 4
      }
    ];

    for (const program of programs) {
      await setDoc(doc(db, 'programs', program.id), program);
      console.log(`✅ Program ${program.code} created`);
    }

    // 2. Create Courses
    const courses = [
      {
        id: 'PROG101',
        code: 'PROG101',
        title: 'Introduction to Programming',
        units: 3,
        description: 'Basic programming concepts using Python'
      },
      {
        id: 'MATH101',
        code: 'MATH101',
        title: 'Calculus 1',
        units: 3,
        description: 'Differential calculus and applications'
      },
      {
        id: 'ENGL101',
        code: 'ENGL101',
        title: 'English 1',
        units: 3,
        description: 'Communication skills and academic writing'
      },
      {
        id: 'PE101',
        code: 'PE101',
        title: 'Physical Education 1',
        units: 2,
        description: 'Physical fitness and wellness'
      },
      {
        id: 'NSTP101',
        code: 'NSTP101',
        title: 'NSTP 1',
        units: 3,
        description: 'National Service Training Program'
      }
    ];

    for (const course of courses) {
      await setDoc(doc(db, 'courses', course.id), course);
      console.log(`✅ Course ${course.code} created`);
    }

    // 3. Create Curriculum (BSCS Year 1, Semester 1)
    await setDoc(doc(db, 'curriculum', 'BSCS-1-1'), {
      programId: 'BSCS',
      yearLevel: 1,
      semester: 1,
      courses: ['PROG101', 'MATH101', 'ENGL101', 'PE101', 'NSTP101']
    });
    console.log('✅ Curriculum BSCS-1-1 created');

    // 4. Create Curriculum (BSCE Year 2, Semester 1)
    await setDoc(doc(db, 'curriculum', 'BSCE-2-1'), {
      programId: 'BSCE',
      yearLevel: 2,
      semester: 1,
      courses: ['MATH101', 'ENGL101', 'PE101']
    });
    console.log('✅ Curriculum BSCE-2-1 created');

    console.log('🎉 Sample data setup complete!');
  } catch (error) {
    console.error('❌ Error setting up data:', error);
  }
};