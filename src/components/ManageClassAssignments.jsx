// src/components/ManageClassAssignments.jsx
import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import './ManageClassAssignments.css';

const ManageClassAssignments = () => {
  const [programs, setPrograms] = useState([]);
  const [courses, setCourses] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [classAssignments, setClassAssignments] = useState([]);
  
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedYear, setSelectedYear] = useState('1');
  const [selectedSection, setSelectedSection] = useState('A');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedProfessor, setSelectedProfessor] = useState('');
  const [loading, setLoading] = useState(false);

  const currentSemester = '1st Sem 2024-2025';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Get programs
      const programsSnapshot = await getDocs(collection(db, 'programs'));
      const programsList = programsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPrograms(programsList);

      // Get courses
      const coursesSnapshot = await getDocs(collection(db, 'courses'));
      const coursesList = coursesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCourses(coursesList);

      // Get professors
      const professorsQuery = query(
        collection(db, 'users'),
        where('role', '==', 'professor')
      );
      const professorsSnapshot = await getDocs(professorsQuery);
      const professorsList = professorsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProfessors(professorsList);

      // Get class assignments
      const assignmentsSnapshot = await getDocs(collection(db, 'classAssignments'));
      const assignmentsList = assignmentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setClassAssignments(assignmentsList);

    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleAddAssignment = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const program = programs.find(p => p.id === selectedProgram);
      const course = courses.find(c => c.id === selectedCourse);
      const professor = professors.find(p => p.id === selectedProfessor);

      if (!program || !course || !professor) {
        alert('Please select all fields');
        setLoading(false);
        return;
      }

      // Check if assignment already exists
      const exists = classAssignments.some(
        a => a.programId === program.code &&
             a.yearLevel === parseInt(selectedYear) &&
             a.section === selectedSection &&
             a.courseId === course.id &&
             a.semester === currentSemester
      );

      if (exists) {
        alert('This class assignment already exists!');
        setLoading(false);
        return;
      }

      await addDoc(collection(db, 'classAssignments'), {
        programId: program.code,
        programName: program.name,
        yearLevel: parseInt(selectedYear),
        section: selectedSection,
        semester: currentSemester,
        courseId: course.id,
        courseCode: course.code,
        courseTitle: course.title,
        units: course.units,
        professorId: professor.studentId,
        professorName: professor.fullName,
        status: 'active',
        createdAt: new Date()
      });

      alert('Class assignment created successfully!');
      fetchData();
      
      // Reset form
      setSelectedCourse('');
      setSelectedProfessor('');

    } catch (error) {
      console.error('Error adding assignment:', error);
      alert('Error creating assignment');
    }

    setLoading(false);
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (window.confirm('Are you sure you want to delete this assignment?')) {
      try {
        await deleteDoc(doc(db, 'classAssignments', assignmentId));
        alert('Assignment deleted!');
        fetchData();
      } catch (error) {
        console.error('Error deleting assignment:', error);
        alert('Error deleting assignment');
      }
    }
  };

  const getFilteredAssignments = () => {
    return classAssignments.filter(
      a => a.semester === currentSemester
    );
  };

  const getAssignmentsBySection = () => {
    const grouped = {};
    
    getFilteredAssignments().forEach(assignment => {
      const key = `${assignment.programId}-${assignment.yearLevel}${assignment.section}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(assignment);
    });

    return grouped;
  };

  return (
    <div className="manage-assignments">
      <h2>Manage Class Assignments</h2>
      <p className="subtitle">Assign professors to courses for {currentSemester}</p>

      {/* Add Assignment Form */}
      <div className="assignment-form-container">
        <h3>Create New Assignment</h3>
        <form onSubmit={handleAddAssignment} className="assignment-form">
          <div className="form-row">
            <div className="form-group">
              <label>Program</label>
              <select 
                value={selectedProgram} 
                onChange={(e) => setSelectedProgram(e.target.value)}
                required
              >
                <option value="">Select Program</option>
                {programs.map(program => (
                  <option key={program.id} value={program.id}>
                    {program.code} - {program.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Year Level</label>
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(e.target.value)}
                required
              >
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </div>

            <div className="form-group">
              <label>Section</label>
              <select 
                value={selectedSection} 
                onChange={(e) => setSelectedSection(e.target.value)}
                required
              >
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Course</label>
              <select 
                value={selectedCourse} 
                onChange={(e) => setSelectedCourse(e.target.value)}
                required
              >
                <option value="">Select Course</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.code} - {course.title} ({course.units} units)
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Professor</label>
              <select 
                value={selectedProfessor} 
                onChange={(e) => setSelectedProfessor(e.target.value)}
                required
              >
                <option value="">Select Professor</option>
                {professors.map(professor => (
                  <option key={professor.id} value={professor.id}>
                    {professor.fullName} ({professor.studentId})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? 'Creating...' : 'Create Assignment'}
          </button>
        </form>
      </div>

      {/* Existing Assignments */}
      <div className="existing-assignments">
        <h3>Current Assignments ({getFilteredAssignments().length})</h3>
        
        {Object.keys(getAssignmentsBySection()).length === 0 ? (
          <p>No class assignments yet for this semester.</p>
        ) : (
          <div className="assignments-by-section">
            {Object.entries(getAssignmentsBySection()).map(([section, assignments]) => (
              <div key={section} className="section-group">
                <h4>{section}</h4>
                <div className="assignments-list">
                  {assignments.map(assignment => (
                    <div key={assignment.id} className="assignment-card">
                      <div className="assignment-info">
                        <h5>{assignment.courseCode} - {assignment.courseTitle}</h5>
                        <p>Professor: {assignment.professorName}</p>
                        <p>Units: {assignment.units}</p>
                      </div>
                      <button 
                        onClick={() => handleDeleteAssignment(assignment.id)}
                        className="delete-btn"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageClassAssignments;