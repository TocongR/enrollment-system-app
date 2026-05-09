// src/setupClassAssignments.js
import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase/config';

export const setupClassAssignments = async () => {
  try {
    console.log('Setting up class assignments...');

    const currentSemester = '1st Sem 2024-2025';

    const assignments = [
      // BSCS-1A assignments
      {
        programId: 'BSCS',
        programName: 'BS Computer Science',
        yearLevel: 1,
        section: 'A',
        semester: currentSemester,
        courseId: 'PROG101',
        courseCode: 'PROG101',
        courseTitle: 'Introduction to Programming',
        units: 3,
        professorId: 'PROF-001',
        professorName: 'Prof. Robert Garcia',
        status: 'active'
      },
      {
        programId: 'BSCS',
        programName: 'BS Computer Science',
        yearLevel: 1,
        section: 'A',
        semester: currentSemester,
        courseId: 'MATH101',
        courseCode: 'MATH101',
        courseTitle: 'Calculus 1',
        units: 3,
        professorId: 'PROF-002',
        professorName: 'Prof. Lisa Santos',
        status: 'active'
      },
      {
        programId: 'BSCS',
        programName: 'BS Computer Science',
        yearLevel: 1,
        section: 'A',
        semester: currentSemester,
        courseId: 'ENGL101',
        courseCode: 'ENGL101',
        courseTitle: 'English 1',
        units: 3,
        professorId: 'PROF-001',
        professorName: 'Prof. Robert Garcia',
        status: 'active'
      },
      {
        programId: 'BSCS',
        programName: 'BS Computer Science',
        yearLevel: 1,
        section: 'A',
        semester: currentSemester,
        courseId: 'PE101',
        courseCode: 'PE101',
        courseTitle: 'Physical Education 1',
        units: 2,
        professorId: 'PROF-002',
        professorName: 'Prof. Lisa Santos',
        status: 'active'
      },
      {
        programId: 'BSCS',
        programName: 'BS Computer Science',
        yearLevel: 1,
        section: 'A',
        semester: currentSemester,
        courseId: 'NSTP101',
        courseCode: 'NSTP101',
        courseTitle: 'NSTP 1',
        units: 3,
        professorId: 'PROF-001',
        professorName: 'Prof. Robert Garcia',
        status: 'active'
      },
      // BSCS-1B assignments (same courses, maybe different professors)
      {
        programId: 'BSCS',
        programName: 'BS Computer Science',
        yearLevel: 1,
        section: 'B',
        semester: currentSemester,
        courseId: 'PROG101',
        courseCode: 'PROG101',
        courseTitle: 'Introduction to Programming',
        units: 3,
        professorId: 'PROF-002',
        professorName: 'Prof. Lisa Santos',
        status: 'active'
      },
      {
        programId: 'BSCS',
        programName: 'BS Computer Science',
        yearLevel: 1,
        section: 'B',
        semester: currentSemester,
        courseId: 'MATH101',
        courseCode: 'MATH101',
        courseTitle: 'Calculus 1',
        units: 3,
        professorId: 'PROF-001',
        professorName: 'Prof. Robert Garcia',
        status: 'active'
      }
    ];

    for (const assignment of assignments) {
      await addDoc(collection(db, 'classAssignments'), assignment);
      console.log(`✅ Assigned ${assignment.courseCode} to ${assignment.professorName} for ${assignment.programId}-${assignment.yearLevel}${assignment.section}`);
    }

    console.log('🎉 Class assignments setup complete!');
  } catch (error) {
    console.error('❌ Error setting up assignments:', error);
  }
};