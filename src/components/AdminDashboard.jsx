// src/components/AdminDashboard.jsx
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase/config";
import "./Dashboard.css";
import "./AdminDashboard.css";
import ManageClassAssignments from "./ManageClassAssignments";
import ManageStudents from "./ManageStudents";
import EnrollmentPeriod from "./EnrollmentPeriod";

const AdminDashboard = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending"); // pending, approved, overview
  const [dropRequests, setDropRequests] = useState([]);

  // Enrollment data
  const [pendingEnrollments, setPendingEnrollments] = useState([]);
  const [approvedEnrollments, setApprovedEnrollments] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [allCourses, setAllCourses] = useState([]);

  const currentSemester = "1st Sem 2024-2025";

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  const fetchData = async () => {
    if (currentUser) {
      try {
        // Get admin user data
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }

        // Get pending enrollments
        const pendingQuery = query(
          collection(db, "enrollments"),
          where("status", "==", "pending"),
          where("semester", "==", currentSemester)
        );
        const pendingSnapshot = await getDocs(pendingQuery);
        const pending = pendingSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setPendingEnrollments(pending);

        // Get approved enrollments
        const approvedQuery = query(
          collection(db, "enrollments"),
          where("status", "==", "enrolled"),
          where("semester", "==", currentSemester)
        );
        const approvedSnapshot = await getDocs(approvedQuery);
        const approved = approvedSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setApprovedEnrollments(approved);

        // Get all students
        const studentsQuery = query(
          collection(db, "users"),
          where("role", "==", "student")
        );
        const studentsSnapshot = await getDocs(studentsQuery);
        const students = studentsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAllStudents(students);

        // Get all class assignments
        const coursesQuery = query(
          collection(db, "classAssignments"),
          where("semester", "==", currentSemester)
        );
        const coursesSnapshot = await getDocs(coursesQuery);
        const courses = coursesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAllCourses(courses);

        // Get drop requests
        const dropQuery = query(
          collection(db, "enrollments"),
          where("status", "==", "drop-requested"),
          where("semester", "==", currentSemester)
        );
        const dropSnapshot = await getDocs(dropQuery);
        const drops = dropSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setDropRequests(drops);
      } catch (error) {
        console.error("Error fetching data:", error);
      }

      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const approveEnrollment = async (enrollmentId) => {
    try {
      await updateDoc(doc(db, "enrollments", enrollmentId), {
        status: "enrolled",
        approvedBy: userData.studentId,
        approvedAt: new Date(),
      });

      alert("Enrollment approved!");
      fetchData(); // Refresh data
    } catch (error) {
      console.error("Error approving enrollment:", error);
      alert("Error approving enrollment");
    }
  };

  const rejectEnrollment = async (enrollmentId) => {
    if (window.confirm("Are you sure you want to reject this enrollment?")) {
      try {
        await updateDoc(doc(db, "enrollments", enrollmentId), {
          status: "rejected",
          rejectedBy: userData.studentId,
          rejectedAt: new Date(),
        });

        alert("Enrollment rejected!");
        fetchData(); // Refresh data
      } catch (error) {
        console.error("Error rejecting enrollment:", error);
        alert("Error rejecting enrollment");
      }
    }
  };

  const dropEnrollment = async (enrollmentId) => {
    if (window.confirm("Are you sure you want to drop this enrollment?")) {
      try {
        await updateDoc(doc(db, "enrollments", enrollmentId), {
          status: "dropped",
          droppedBy: userData.studentId,
          droppedAt: new Date(),
        });

        alert("Enrollment dropped!");
        fetchData(); // Refresh data
      } catch (error) {
        console.error("Error dropping enrollment:", error);
        alert("Error dropping enrollment");
      }
    }
  };

  const getDropRequestsCount = () => dropRequests.length;

  const approveDropRequest = async (enrollmentId) => {
    if (window.confirm("Approve this drop request?")) {
      try {
        await updateDoc(doc(db, "enrollments", enrollmentId), {
          status: "dropped",
          droppedBy: userData.studentId,
          droppedAt: new Date(),
        });

        alert("Drop request approved!");
        fetchData();
      } catch (error) {
        console.error("Error approving drop:", error);
        alert("Error approving drop request");
      }
    }
  };

  const rejectDropRequest = async (enrollmentId) => {
    if (
      window.confirm("Reject this drop request? Student will remain enrolled.")
    ) {
      try {
        await updateDoc(doc(db, "enrollments", enrollmentId), {
          status: "enrolled",
          dropReason: null,
          dropRequestedAt: null,
        });

        alert("Drop request rejected. Student remains enrolled.");
        fetchData();
      } catch (error) {
        console.error("Error rejecting drop:", error);
        alert("Error rejecting drop request");
      }
    }
  };

  // Calculate statistics
  const getTotalEnrollments = () => approvedEnrollments.length;
  const getPendingCount = () => pendingEnrollments.length;
  const getTotalStudents = () => allStudents.length;
  const getTotalCourses = () => allCourses.length;

  // Get enrollments by course
  const getEnrollmentsByCourse = () => {
    const courseMap = {};

    approvedEnrollments.forEach((enrollment) => {
      const key = enrollment.courseCode;
      if (!courseMap[key]) {
        courseMap[key] = {
          courseCode: enrollment.courseCode,
          courseTitle: enrollment.courseTitle,
          count: 0,
          students: [],
        };
      }
      courseMap[key].count++;
      courseMap[key].students.push(enrollment.studentName);
    });

    return Object.values(courseMap);
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <h2>Admin Portal</h2>
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </nav>

      <div className="dashboard-content">
        <div className="welcome-card">
          <h1>Welcome, {userData?.fullName}!</h1>
          <div className="user-info">
            <p>
              <strong>Admin ID:</strong> {userData?.studentId}
            </p>
            <p>
              <strong>Semester:</strong> {currentSemester}
            </p>
          </div>
          {/* Manage Class Assignments Tab */}
          {activeTab === "assignments" && <ManageClassAssignments />}

          {/* Manage Students Tab */}
          {activeTab === "students" && <ManageStudents />}
        </div>

        {/* Statistics Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <h3>{getTotalStudents()}</h3>
            <p>Total Students</p>
          </div>
          <div className="stat-card">
            <h3>{getTotalCourses()}</h3>
            <p>Active Courses</p>
          </div>
          <div className="stat-card pending">
            <h3>{getPendingCount()}</h3>
            <p>Pending Requests</p>
          </div>
          <div className="stat-card enrolled">
            <h3>{getTotalEnrollments()}</h3>
            <p>Total Enrollments</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="admin-tabs">
          <button
            className={activeTab === "pending" ? "active" : ""}
            onClick={() => setActiveTab("pending")}
          >
            Pending Requests ({getPendingCount()})
          </button>
          <button
            className={activeTab === "drop-requests" ? "active" : ""}
            onClick={() => setActiveTab("drop-requests")}
          >
            Drop Requests ({getDropRequestsCount()})
          </button>
          <button
            className={activeTab === "approved" ? "active" : ""}
            onClick={() => setActiveTab("approved")}
          >
            Approved Enrollments ({getTotalEnrollments()})
          </button>
          <button
            className={activeTab === "overview" ? "active" : ""}
            onClick={() => setActiveTab("overview")}
          >
            Course Overview
          </button>
          <button
            className={activeTab === "assignments" ? "active" : ""}
            onClick={() => setActiveTab("assignments")}
          >
            Manage Classes
          </button>
          <button
            className={activeTab === "students" ? "active" : ""}
            onClick={() => setActiveTab("students")}
          >
            Manage Students
          </button>
          <button
            className={activeTab === "period" ? "active" : ""}
            onClick={() => setActiveTab("period")}
          >
            Enrollment Period
          </button>
        </div>

        {/* Pending Enrollments Tab */}
        {activeTab === "pending" && (
          <div className="admin-section">
            <h2>Pending Enrollment Requests</h2>

            {pendingEnrollments.length === 0 ? (
              <p>No pending enrollment requests.</p>
            ) : (
              <div className="table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Student Name</th>
                      <th>Course</th>
                      <th>Program</th>
                      <th>Professor</th>
                      <th>Requested</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingEnrollments.map((enrollment) => (
                      <tr key={enrollment.id}>
                        <td>{enrollment.studentId}</td>
                        <td>{enrollment.studentName}</td>
                        <td>
                          <strong>{enrollment.courseCode}</strong>
                          <br />
                          <small>{enrollment.courseTitle}</small>
                        </td>
                        <td>
                          {enrollment.programId}-{enrollment.yearLevel}
                          {enrollment.section}
                        </td>
                        <td>{enrollment.professorName}</td>
                        <td>
                          {new Date(
                            enrollment.requestedAt.seconds * 1000
                          ).toLocaleDateString()}
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button
                              onClick={() => approveEnrollment(enrollment.id)}
                              className="approve-btn"
                            >
                              ✓ Approve
                            </button>
                            <button
                              onClick={() => rejectEnrollment(enrollment.id)}
                              className="reject-btn"
                            >
                              ✗ Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Approved Enrollments Tab */}
        {activeTab === "approved" && (
          <div className="admin-section">
            <h2>Approved Enrollments</h2>

            {approvedEnrollments.length === 0 ? (
              <p>No approved enrollments yet.</p>
            ) : (
              <div className="table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Student Name</th>
                      <th>Course</th>
                      <th>Program</th>
                      <th>Professor</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvedEnrollments.map((enrollment) => (
                      <tr key={enrollment.id}>
                        <td>{enrollment.studentId}</td>
                        <td>{enrollment.studentName}</td>
                        <td>
                          <strong>{enrollment.courseCode}</strong>
                          <br />
                          <small>{enrollment.courseTitle}</small>
                        </td>
                        <td>
                          {enrollment.programId}-{enrollment.yearLevel}
                          {enrollment.section}
                        </td>
                        <td>{enrollment.professorName}</td>
                        <td>
                          <span className="status-badge status-enrolled">
                            ENROLLED
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => dropEnrollment(enrollment.id)}
                            className="drop-btn"
                          >
                            Drop
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Course Overview Tab */}
        {activeTab === "overview" && (
          <div className="admin-section">
            <h2>Course Enrollment Overview</h2>

            {getEnrollmentsByCourse().length === 0 ? (
              <p>No enrollments yet.</p>
            ) : (
              <div className="course-overview-grid">
                {getEnrollmentsByCourse().map((course, index) => (
                  <div key={index} className="course-overview-card">
                    <h3>{course.courseCode}</h3>
                    <p className="course-title">{course.courseTitle}</p>
                    <div className="enrollment-count">
                      <span className="count">{course.count}</span>
                      <span className="label">Students Enrolled</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Drop Requests Tab */}
        {activeTab === "drop-requests" && (
          <div className="admin-section">
            <h2>Drop Requests</h2>

            {dropRequests.length === 0 ? (
              <p>No drop requests at this time.</p>
            ) : (
              <div className="table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Student Name</th>
                      <th>Course</th>
                      <th>Program</th>
                      <th>Reason</th>
                      <th>Requested</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dropRequests.map((request) => (
                      <tr key={request.id}>
                        <td>{request.studentId}</td>
                        <td>{request.studentName}</td>
                        <td>
                          <strong>{request.courseCode}</strong>
                          <br />
                          <small>{request.courseTitle}</small>
                        </td>
                        <td>
                          {request.programId}-{request.yearLevel}
                          {request.section}
                        </td>
                        <td>
                          <div className="drop-reason">
                            {request.dropReason}
                          </div>
                        </td>
                        <td>
                          {new Date(
                            request.dropRequestedAt.seconds * 1000
                          ).toLocaleDateString()}
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button
                              onClick={() => approveDropRequest(request.id)}
                              className="approve-btn"
                            >
                              ✓ Approve Drop
                            </button>
                            <button
                              onClick={() => rejectDropRequest(request.id)}
                              className="reject-btn"
                            >
                              ✗ Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Enrollment Period Tab */}
        {activeTab === "period" && <EnrollmentPeriod />}
      </div>
    </div>
  );
};

export default AdminDashboard;
