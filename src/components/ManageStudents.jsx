// src/components/ManageStudents.jsx
import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  doc,
  deleteDoc
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { setDoc } from 'firebase/firestore';
import './ManageStudents.css';

const ManageStudents = () => {
  const [students, setStudents] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProgram, setFilterProgram] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    studentId: '',
    fullName: '',
    password: '',
    programId: '',
    yearLevel: '1',
    section: 'A'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Get students
      const studentsQuery = query(
        collection(db, 'users'),
        where('role', '==', 'student')
      );
      const studentsSnapshot = await getDocs(studentsQuery);
      const studentsList = studentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setStudents(studentsList);

      // Get programs
      const programsSnapshot = await getDocs(collection(db, 'programs'));
      const programsList = programsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPrograms(programsList);

    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const program = programs.find(p => p.id === formData.programId);
      
      if (!program) {
        alert('Please select a program');
        setLoading(false);
        return;
      }

      // Create auth user
      const email = `${formData.studentId}@enrollment.system`;
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        formData.password
      );

      // Create Firestore document
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        studentId: formData.studentId,
        fullName: formData.fullName,
        role: 'student',
        programId: program.code,
        programName: program.name,
        yearLevel: parseInt(formData.yearLevel),
        section: formData.section,
        createdAt: new Date()
      });

      alert('Student added successfully!');
      setShowAddForm(false);
      setFormData({
        studentId: '',
        fullName: '',
        password: '',
        programId: '',
        yearLevel: '1',
        section: 'A'
      });
      fetchData();

    } catch (error) {
      console.error('Error adding student:', error);
      alert(`Error: ${error.message}`);
    }

    setLoading(false);
  };

  const handleDeleteStudent = async (studentId, studentUID) => {
    if (window.confirm(`Are you sure you want to delete student ${studentId}? This will also delete all their enrollments.`)) {
      try {
        // Delete from Firestore
        await deleteDoc(doc(db, 'users', studentUID));

        // Delete all enrollments
        const enrollmentsQuery = query(
          collection(db, 'enrollments'),
          where('studentId', '==', studentId)
        );
        const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
        
        for (const enrollmentDoc of enrollmentsSnapshot.docs) {
          await deleteDoc(doc(db, 'enrollments', enrollmentDoc.id));
        }

        alert('Student deleted successfully!');
        fetchData();

      } catch (error) {
        console.error('Error deleting student:', error);
        alert('Error deleting student');
      }
    }
  };

  const getFilteredStudents = () => {
    return students.filter(student => {
      const matchesSearch = 
        student.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.fullName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesProgram = !filterProgram || student.programId === filterProgram;
      const matchesYear = !filterYear || student.yearLevel === parseInt(filterYear);

      return matchesSearch && matchesProgram && matchesYear;
    });
  };

  return (
    <div className="manage-students">
      <div className="header-section">
        <div>
          <h2>Manage Students</h2>
          <p className="subtitle">Total Students: {students.length}</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="add-student-btn"
        >
          {showAddForm ? '✕ Cancel' : '+ Add New Student'}
        </button>
      </div>

      {/* Add Student Form */}
      {showAddForm && (
        <div className="add-student-form">
          <h3>Add New Student</h3>
          <form onSubmit={handleAddStudent}>
            <div className="form-grid">
              <div className="form-group">
                <label>Student ID *</label>
                <input
                  type="text"
                  name="studentId"
                  placeholder="e.g., 2024-1234-A"
                  value={formData.studentId}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  name="fullName"
                  placeholder="e.g., Juan Dela Cruz"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Password *</label>
                <input
                  type="password"
                  name="password"
                  placeholder="Initial password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Program *</label>
                <select
                  name="programId"
                  value={formData.programId}
                  onChange={handleInputChange}
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
                <label>Year Level *</label>
                <select
                  name="yearLevel"
                  value={formData.yearLevel}
                  onChange={handleInputChange}
                  required
                >
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
              </div>

              <div className="form-group">
                <label>Section *</label>
                <select
                  name="section"
                  value={formData.section}
                  onChange={handleInputChange}
                  required
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                </select>
              </div>
            </div>

            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? 'Adding Student...' : 'Add Student'}
            </button>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="filters-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="🔍 Search by Student ID or Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <select 
            value={filterProgram} 
            onChange={(e) => setFilterProgram(e.target.value)}
          >
            <option value="">All Programs</option>
            {programs.map(program => (
              <option key={program.id} value={program.code}>
                {program.code}
              </option>
            ))}
          </select>

          <select 
            value={filterYear} 
            onChange={(e) => setFilterYear(e.target.value)}
          >
            <option value="">All Years</option>
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
          </select>

          {(searchTerm || filterProgram || filterYear) && (
            <button 
              onClick={() => {
                setSearchTerm('');
                setFilterProgram('');
                setFilterYear('');
              }}
              className="clear-filters-btn"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Students Table */}
      <div className="students-table-container">
        <p className="results-count">
          Showing {getFilteredStudents().length} of {students.length} students
        </p>

        {getFilteredStudents().length === 0 ? (
          <p className="no-results">No students found.</p>
        ) : (
          <table className="students-table">
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Full Name</th>
                <th>Program</th>
                <th>Year & Section</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {getFilteredStudents().map(student => (
                <tr key={student.id}>
                  <td>{student.studentId}</td>
                  <td>{student.fullName}</td>
                  <td>{student.programId} - {student.programName}</td>
                  <td>{student.yearLevel}{student.section}</td>
                  <td>
                    <button
                      onClick={() => handleDeleteStudent(student.studentId, student.id)}
                      className="delete-btn-small"
                    >
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ManageStudents;