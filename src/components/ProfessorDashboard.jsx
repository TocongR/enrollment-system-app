// src/components/ProfessorDashboard.jsx
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import './Dashboard.css';
import './ProfessorDashboard.css';

const ProfessorDashboard = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [myClasses, setMyClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview, schedule
  const [searchTerm, setSearchTerm] = useState('');

  const currentSemester = '1st Sem 2024-2025';

  useEffect(() => {
    const fetchData = async () => {
      if (currentUser) {
        try {
          // Get user data
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserData(data);

            // Get classes assigned to this professor
            const classQuery = query(
              collection(db, 'classAssignments'),
              where('professorId', '==', data.studentId),
              where('semester', '==', currentSemester)
            );

            const classSnapshot = await getDocs(classQuery);
            const classes = classSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            setMyClasses(classes);
          }
        } catch (error) {
          console.error('Error fetching data:', error);
        }
        setLoading(false);
      }
    };
    fetchData();
  }, [currentUser]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const viewStudents = async (classData) => {
    setSelectedClass(classData);
    
    // Get enrolled students for this class
    const enrollmentQuery = query(
      collection(db, 'enrollments'),
      where('classAssignmentId', '==', classData.id),
      where('status', '==', 'enrolled')
    );

    const enrollmentSnapshot = await getDocs(enrollmentQuery);
    const enrolledStudents = enrollmentSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Sort by student ID
    enrolledStudents.sort((a, b) => a.studentId.localeCompare(b.studentId));
    
    setStudents(enrolledStudents);
  };

  const closeStudentList = () => {
    setSelectedClass(null);
    setStudents([]);
    setSearchTerm('');
  };

//   const getTotalStudents = () => {
//     return myClasses.reduce((total, classItem) => {
//       // Count enrolled students for this class
//       return total + (classItem.enrolledCount || 0);
//     }, 0);
//   };

  const getTotalUnits = () => {
    return myClasses.reduce((total, classItem) => total + classItem.units, 0);
  };

  // Group classes by course
  const getClassesByCourse = () => {
    const grouped = {};
    
    myClasses.forEach(classItem => {
      const key = classItem.courseCode;
      if (!grouped[key]) {
        grouped[key] = {
          courseCode: classItem.courseCode,
          courseTitle: classItem.courseTitle,
          units: classItem.units,
          sections: []
        };
      }
      grouped[key].sections.push(classItem);
    });

    return Object.values(grouped);
  };

  // Filter students by search term
  const getFilteredStudents = () => {
    if (!searchTerm) return students;
    
    return students.filter(student => 
      student.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.studentName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Export students list as CSV
  const exportToCSV = () => {
    if (students.length === 0) return;

    const headers = ['Student ID', 'Student Name', 'Program', 'Year-Section'];
    const rows = students.map(s => [
      s.studentId,
      s.studentName,
      s.programId,
      `${s.yearLevel}${s.section}`
    ]);

    let csvContent = headers.join(',') + '\n';
    rows.forEach(row => {
      csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedClass.courseCode}-${selectedClass.programId}${selectedClass.yearLevel}${selectedClass.section}-students.csv`;
    a.click();
  };

  // Print student list
  const printStudentList = () => {
    const printWindow = window.open('', '_blank');
    
    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Class List - ${selectedClass.courseCode}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
          .info { margin: 20px 0; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #667eea; color: white; }
          tr:nth-child(even) { background-color: #f8f9ff; }
          @media print {
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>${selectedClass.courseCode} - ${selectedClass.courseTitle}</h1>
        <div class="info">
          <p><strong>Section:</strong> ${selectedClass.programId}-${selectedClass.yearLevel}${selectedClass.section}</p>
          <p><strong>Professor:</strong> ${userData.fullName}</p>
          <p><strong>Semester:</strong> ${currentSemester}</p>
          <p><strong>Total Students:</strong> ${students.length}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Student ID</th>
              <th>Student Name</th>
              <th>Program</th>
              <th>Year-Section</th>
            </tr>
          </thead>
          <tbody>
            ${students.map((student, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${student.studentId}</td>
                <td>${student.studentName}</td>
                <td>${student.programId}</td>
                <td>${student.yearLevel}${student.section}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer;">Print</button>
      </body>
      </html>
    `;
    
    printWindow.document.write(content);
    printWindow.document.close();
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <h2>Professor Portal</h2>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </nav>
      
      <div className="dashboard-content">
        <div className="welcome-card">
          <h1>Welcome, {userData?.fullName}!</h1>
          <div className="user-info">
            <p><strong>Professor ID:</strong> {userData?.studentId}</p>
            <p><strong>Semester:</strong> {currentSemester}</p>
          </div>
        </div>

        {/* Statistics */}
        <div className="stats-grid">
          <div className="stat-card">
            <h3>{myClasses.length}</h3>
            <p>Total Classes</p>
          </div>
          <div className="stat-card">
            <h3>{getTotalUnits()}</h3>
            <p>Total Units</p>
          </div>
          <div className="stat-card">
            <h3>{getClassesByCourse().length}</h3>
            <p>Unique Courses</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="admin-tabs">
          <button 
            className={activeTab === 'overview' ? 'active' : ''} 
            onClick={() => setActiveTab('overview')}
          >
            My Classes
          </button>
          <button 
            className={activeTab === 'schedule' ? 'active' : ''} 
            onClick={() => setActiveTab('schedule')}
          >
            By Course
          </button>
        </div>

        {/* Overview Tab - All Classes */}
        {activeTab === 'overview' && (
          <div className="enrollment-section">
            <h2>My Teaching Load</h2>
            
            {myClasses.length === 0 ? (
              <p>No classes assigned for this semester.</p>
            ) : (
              <div className="professor-classes">
                {myClasses.map((classData) => (
                  <div key={classData.id} className="professor-class-card">
                    <div className="class-card-header">
                      <h3>{classData.courseCode}</h3>
                      <span className="section-badge">
                        {classData.programId}-{classData.yearLevel}{classData.section}
                      </span>
                    </div>
                    <h4>{classData.courseTitle}</h4>
                    <div className="class-info">
                      <p><strong>Units:</strong> {classData.units}</p>
                      <p><strong>Program:</strong> {classData.programName}</p>
                    </div>
                    <button 
                      onClick={() => viewStudents(classData)}
                      className="view-students-btn"
                    >
                      View Students
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* By Course Tab */}
        {activeTab === 'schedule' && (
          <div className="enrollment-section">
            <h2>Classes by Course</h2>
            
            {getClassesByCourse().length === 0 ? (
              <p>No classes assigned.</p>
            ) : (
              <div className="courses-grouped">
                {getClassesByCourse().map((course, index) => (
                  <div key={index} className="course-group">
                    <div className="course-group-header">
                      <h3>{course.courseCode} - {course.courseTitle}</h3>
                      <span className="units-badge">{course.units} units</span>
                    </div>
                    <div className="sections-list">
                      {course.sections.map((section) => (
                        <div key={section.id} className="section-item">
                          <div className="section-info">
                            <h4>{section.programId}-{section.yearLevel}{section.section}</h4>
                            <p>{section.programName}</p>
                          </div>
                          <button 
                            onClick={() => viewStudents(section)}
                            className="view-btn-small"
                          >
                            View Students
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Student List Modal */}
      {selectedClass && (
        <div className="modal-overlay" onClick={closeStudentList}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{selectedClass.courseCode} - {selectedClass.courseTitle}</h2>
                <p className="modal-subtitle">
                  {selectedClass.programId}-{selectedClass.yearLevel}{selectedClass.section} | 
                  {students.length} Student{students.length !== 1 ? 's' : ''} Enrolled
                </p>
              </div>
              <button onClick={closeStudentList} className="close-btn">×</button>
            </div>
            
            <div className="modal-body">
              {/* Search and Actions */}
              <div className="student-list-controls">
                <div className="search-box">
                  <input
                    type="text"
                    placeholder="🔍 Search by Student ID or Name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="action-buttons-group">
                  <button onClick={exportToCSV} className="export-btn">
                    📥 Export CSV
                  </button>
                  <button onClick={printStudentList} className="print-btn">
                    🖨️ Print List
                  </button>
                </div>
              </div>

              {/* Student Table */}
              {students.length === 0 ? (
                <p className="no-students">No students enrolled yet.</p>
              ) : (
                <>
                  <p className="showing-count">
                    Showing {getFilteredStudents().length} of {students.length} students
                  </p>
                  <div className="table-container">
                    <table className="student-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Student ID</th>
                          <th>Name</th>
                          <th>Program</th>
                          <th>Year-Section</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getFilteredStudents().map((student, index) => (
                          <tr key={student.id}>
                            <td>{index + 1}</td>
                            <td>{student.studentId}</td>
                            <td>{student.studentName}</td>
                            <td>{student.programId}</td>
                            <td>{student.yearLevel}{student.section}</td>
                            <td>
                              <span className="status-badge status-enrolled">
                                {student.status.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfessorDashboard;