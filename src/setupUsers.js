// src/setupFullSystem.js

import {
    collection,
    addDoc,
    setDoc,
    doc
  } from "firebase/firestore";
  import { createUserWithEmailAndPassword } from "firebase/auth";
  import { auth, db } from "./firebase/config";
  
  export const setupUsers = async () => {
    console.log("🚀 Setting up FULL system...");
  
    const semester = "1st Sem 2024-2025";
  
    /* ===============================
       1️⃣ PROGRAMS
    =============================== */
  
    const programs = [
      { code: "BSCS", name: "BS Computer Science" },
      { code: "BSCE", name: "BS Civil Engineering" }
    ];
  
    for (const prog of programs) {
      await addDoc(collection(db, "programs"), prog);
    }
  
    /* ===============================
       2️⃣ COURSES
    =============================== */
  
    const courses = [
      { code: "CS101", title: "Intro to Programming", units: 3 },
      { code: "CS102", title: "Data Structures", units: 3 },
      { code: "MATH101", title: "College Algebra", units: 3 },
      { code: "ENG101", title: "English Communication", units: 3 }
    ];
  
    const courseRefs = [];
  
    for (const c of courses) {
      const ref = await addDoc(collection(db, "courses"), c);
      courseRefs.push({ id: ref.id, ...c });
    }
  
    /* ===============================
       3️⃣ PROFESSORS
    =============================== */
  
    const professors = [
      { id: "PROF-001", name: "Prof. John Smith" },
      { id: "PROF-002", name: "Prof. Maria Lopez" }
    ];
  
    for (const p of professors) {
      try {
        const cred = await createUserWithEmailAndPassword(
          auth,
          `${p.id.toLowerCase()}@enrollment.system`,
          "prof123"
        );
  
        await setDoc(doc(db, "users", cred.user.uid), {
          studentId: p.id,
          fullName: p.name,
          role: "professor",
          createdAt: new Date()
        });
      } catch {
        console.log(`⚠️ ${p.id} already exists`);
      }
    }
  
    /* ===============================
       3️⃣½ ADMIN USER
    =============================== */
  
    try {
      const adminCred = await createUserWithEmailAndPassword(
        auth,
        "admin-001@enrollment.system",
        "admin123"
      );
  
      await setDoc(doc(db, "users", adminCred.user.uid), {
        studentId: "ADMIN-001",
        fullName: "System Administrator",
        role: "admin",
        createdAt: new Date()
      });
  
      console.log("✅ Admin created");
    } catch {
      console.log("⚠️ Admin already exists");
    }
  
    /* ===============================
       4️⃣ CLASS ASSIGNMENTS
    =============================== */
  
    const classAssignments = [];
    const sections = ["A", "B"];
  
    for (const prog of programs) {
      for (const year of [1, 2]) {
        for (const sec of sections) {
          for (const c of courseRefs) {
  
            const ref = await addDoc(collection(db, "classAssignments"), {
              programId: prog.code,
              programName: prog.name,
              yearLevel: year,
              section: sec,
              semester,
              courseId: c.id,
              courseCode: c.code,
              courseTitle: c.title,
              units: c.units,
              professorId: "PROF-001",
              professorName: "Prof. John Smith",
              status: "active",
              createdAt: new Date()
            });
  
            classAssignments.push({
                id: ref.id, // classAssignmentId
                courseId: c.id, // REAL course ID
                code: c.code,
                title: c.title,
                units: c.units,
                progCode: prog.code,
                year,
                sec
              });
          }
        }
      }
    }
  
    /* ===============================
       5️⃣ ENROLLMENT PERIOD (OPEN)
    =============================== */
  
    await setDoc(doc(db, "enrollmentPeriods", semester.replace(/\s+/g, "-")), {
      semester,
      startDate: new Date(Date.now() - 86400000).toISOString(),
      endDate: new Date(Date.now() + 86400000 * 30).toISOString(),
      autoToggle: true,
      isActive: true,
      createdAt: new Date()
    });
  
    /* ===============================
       6️⃣ STUDENTS + AUTO ENROLL
    =============================== */
  
    let studentCounter = 1000;
  
    for (let i = 0; i < 20; i++) {
      const prog = programs[i % programs.length];
      const year = (i % 2) + 1;
      const section = sections[i % 2];
  
      const studentId = `2024-${studentCounter}-${section}`;
      const email = `${studentId.toLowerCase()}@enrollment.system`;
  
      try {
        const cred = await createUserWithEmailAndPassword(
          auth,
          email,
          "Student123"
        );
  
        await setDoc(doc(db, "users", cred.user.uid), {
          studentId,
          fullName: `Student ${studentCounter}`,
          role: "student",
          programId: prog.code,
          programName: prog.name,
          yearLevel: year,
          section,
          createdAt: new Date()
        });
  
        const matchingClasses = classAssignments
          .filter(c =>
            c.progCode === prog.code &&
            c.year === year &&
            c.sec === section
          )
          .slice(0, 3);
  
        for (const cls of matchingClasses) {
            await addDoc(collection(db, "enrollments"), {
                studentId,
                studentName: `Student ${studentCounter}`,
              
                classAssignmentId: cls.id,
                courseId: cls.courseId,
              
                courseCode: cls.code,
                courseTitle: cls.title,
                units: cls.units,
              
                professorId: "PROF-001",
                professorName: "Prof. John Smith",
              
                programId: prog.code,
                yearLevel: year,
                section,
                semester,
              
                status: "enrolled",
              
                requestedAt: new Date(),
                approvedAt: new Date(),
                approvedBy: "ADMIN-001"
              });
        }
  
        studentCounter++;
  
      } catch {
        console.log(`⚠️ ${studentId} already exists`);
      }
    }
  
    console.log("✅ FULL SYSTEM POPULATED SUCCESSFULLY");
  };