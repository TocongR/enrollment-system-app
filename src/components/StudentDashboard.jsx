// src/components/StudentDashboard.jsx
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
  addDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/config";
import "./Dashboard.css";

const StudentDashboard = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [dropReason, setDropReason] = useState("");
  const [showDropModal, setShowDropModal] = useState(false);
  const [selectedDropCourse, setSelectedDropCourse] = useState(null);
  const [enrollmentPeriodOpen, setEnrollmentPeriodOpen] = useState(false);

  const currentSemester = "1st Sem 2024-2025";

  const checkEnrollmentPeriod = async () => {
    try {
      const periodDoc = await getDoc(doc(db, "settings", "enrollmentPeriod"));

      if (periodDoc.exists()) {
        const data = periodDoc.data();

        if (!data.isActive) {
          setEnrollmentPeriodOpen(false);
          return;
        }

        const now = new Date();
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);

        setEnrollmentPeriodOpen(now >= start && now <= end);
      } else {
        setEnrollmentPeriodOpen(false);
      }
    } catch (error) {
      console.error("Error checking enrollment period:", error);
      setEnrollmentPeriodOpen(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (currentUser) {
        try {
          // Get user data
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserData(data);

            // Get available courses for this student's program-year-section
            const classQuery = query(
              collection(db, "classAssignments"),
              where("programId", "==", data.programId),
              where("yearLevel", "==", data.yearLevel),
              where("section", "==", data.section),
              where("semester", "==", currentSemester)
            );

            const classSnapshot = await getDocs(classQuery);
            const courses = classSnapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            setAvailableCourses(courses);

            // Get enrolled courses
            const enrollmentQuery = query(
              collection(db, "enrollments"),
              where("studentId", "==", data.studentId),
              where("semester", "==", currentSemester)
            );

            const enrollmentSnapshot = await getDocs(enrollmentQuery);
            const enrolled = enrollmentSnapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            setEnrolledCourses(enrolled);
          }

          // Check enrollment period
          await checkEnrollmentPeriod();

        } catch (error) {
          console.error("Error fetching data:", error);
        }
        setLoading(false);
      }
    };
    fetchData();
  }, [currentUser]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleCheckboxChange = (classAssignmentId) => {
    setSelectedCourses((prev) => {
      if (prev.includes(classAssignmentId)) {
        return prev.filter((id) => id !== classAssignmentId);
      } else {
        return [...prev, classAssignmentId];
      }
    });
  };

  const handleEnroll = async () => {
    if (selectedCourses.length === 0) {
      alert("Please select at least one course to enroll");
      return;
    }

    setEnrolling(true);

    try {
      for (const classAssignmentId of selectedCourses) {
        const classData = availableCourses.find(
          (c) => c.id === classAssignmentId
        );

        await addDoc(collection(db, "enrollments"), {
          studentId: userData.studentId,
          studentName: userData.fullName,
          classAssignmentId: classAssignmentId,
          courseId: classData.courseId,
          courseCode: classData.courseCode,
          courseTitle: classData.courseTitle,
          units: classData.units,
          professorId: classData.professorId,
          professorName: classData.professorName,
          programId: classData.programId,
          yearLevel: classData.yearLevel,
          section: classData.section,
          semester: currentSemester,
          status: "pending",
          requestedAt: new Date(),
        });
      }

      alert("Enrollment request submitted! Waiting for admin approval.");

      // Refresh enrolled courses
      const enrollmentQuery = query(
        collection(db, "enrollments"),
        where("studentId", "==", userData.studentId),
        where("semester", "==", currentSemester)
      );
      const enrollmentSnapshot = await getDocs(enrollmentQuery);
      const enrolled = enrollmentSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setEnrolledCourses(enrolled);
      setSelectedCourses([]);
    } catch (error) {
      console.error("Error enrolling:", error);
      alert("Error submitting enrollment. Please try again.");
    }

    setEnrolling(false);
  };

  const handleRequestDrop = (enrollment) => {
    setSelectedDropCourse(enrollment);
    setShowDropModal(true);
  };

  const submitDropRequest = async () => {
    if (!dropReason.trim()) {
      alert("Please provide a reason for dropping this course");
      return;
    }

    try {
      await updateDoc(doc(db, "enrollments", selectedDropCourse.id), {
        status: "drop-requested",
        dropReason: dropReason,
        dropRequestedAt: new Date(),
      });

      alert("Drop request submitted! Waiting for admin approval.");

      // Refresh enrolled courses
      const enrollmentQuery = query(
        collection(db, "enrollments"),
        where("studentId", "==", userData.studentId),
        where("semester", "==", currentSemester)
      );
      const enrollmentSnapshot = await getDocs(enrollmentQuery);
      const enrolled = enrollmentSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setEnrolledCourses(enrolled);

      setShowDropModal(false);
      setDropReason("");
      setSelectedDropCourse(null);
    } catch (error) {
      console.error("Error requesting drop:", error);
      alert("Error submitting drop request. Please try again.");
    }
  };

  const closeDropModal = () => {
    setShowDropModal(false);
    setDropReason("");
    setSelectedDropCourse(null);
  };

  const getEnrollmentStatus = (classAssignmentId) => {
    const enrollment = enrolledCourses.find(
      (e) => e.classAssignmentId === classAssignmentId
    );
    return enrollment ? enrollment.status : null;
  };

  const isAlreadyEnrolled = (classAssignmentId) => {
    return enrolledCourses.some(
      (e) => e.classAssignmentId === classAssignmentId
    );
  };

  const getTotalUnits = () => {
    return selectedCourses.reduce((total, classId) => {
      const course = availableCourses.find((c) => c.id === classId);
      return total + (course?.units || 0);
    }, 0);
  };

  const getEnrolledTotalUnits = () => {
    return enrolledCourses
      .filter((e) => e.status === "enrolled")
      .reduce((total, enrollment) => total + enrollment.units, 0);
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <h2>Student Portal</h2>
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </nav>

      <div className="dashboard-content">
        <div className="welcome-card">
          <h1>Welcome, {userData?.fullName}!</h1>
          <div className="user-info">
            <p>
              <strong>Student ID:</strong> {userData?.studentId}
            </p>
            <p>
              <strong>Program:</strong> {userData?.programName}
            </p>
            <p>
              <strong>Year & Section:</strong> {userData?.yearLevel}
              {userData?.section}
            </p>
            <p>
              <strong>Semester:</strong> {currentSemester}
            </p>
            <p>
              <strong>Total Units Enrolled:</strong> {getEnrolledTotalUnits()}
            </p>
          </div>
        </div>

        <div className="enrollment-section">
          <h2>Available Courses for Enrollment</h2>

          {!enrollmentPeriodOpen ? (
            <div className="enrollment-closed-notice">
              <h3>⚠️ Enrollment Period is Closed</h3>
              <p>Please wait for the enrollment period to open. Contact the admin for more information.</p>
            </div>
          ) : availableCourses.length === 0 ? (
            <p>No courses available for enrollment at this time.</p>
          ) : (
            <>
              <div className="courses-checklist">
                {availableCourses.map((course) => {
                  const status = getEnrollmentStatus(course.id);
                  const alreadyEnrolled = isAlreadyEnrolled(course.id);

                  return (
                    <div
                      key={course.id}
                      className={`course-item ${status ? "enrolled-item" : ""}`}
                    >
                      <div className="course-checkbox">
                        <input
                          type="checkbox"
                          id={course.id}
                          checked={selectedCourses.includes(course.id)}
                          onChange={() => handleCheckboxChange(course.id)}
                          disabled={alreadyEnrolled}
                        />
                      </div>
                      <label htmlFor={course.id} className="course-details">
                        <div className="course-header">
                          <h3>
                            {course.courseCode} - {course.courseTitle}
                          </h3>
                          {status && (
                            <span className={`status-badge status-${status}`}>
                              {status === "drop-requested"
                                ? "DROP REQUESTED"
                                : status.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <p className="course-info">
                          <strong>Units:</strong> {course.units} |
                          <strong> Professor:</strong> {course.professorName}
                        </p>
                      </label>
                    </div>
                  );
                })}
              </div>

              <div className="enrollment-summary">
                <p>
                  <strong>Selected Courses:</strong> {selectedCourses.length}
                </p>
                <p>
                  <strong>Total Units:</strong> {getTotalUnits()}
                </p>
                <button
                  onClick={handleEnroll}
                  disabled={selectedCourses.length === 0 || enrolling}
                  className="enroll-btn"
                >
                  {enrolling ? "Submitting..." : "Submit Enrollment Request"}
                </button>
              </div>
            </>
          )}
        </div>

        <div className="enrolled-section">
          <h2>My Enrolled Courses</h2>
          {enrolledCourses.length === 0 ? (
            <p>You are not enrolled in any courses yet.</p>
          ) : (
            <div className="enrolled-list">
              {enrolledCourses.map((enrollment) => (
                <div key={enrollment.id} className="enrolled-course">
                  <div className="enrolled-course-header">
                    <h3>
                      {enrollment.courseCode} - {enrollment.courseTitle}
                    </h3>
                    <span
                      className={`status-badge status-${enrollment.status}`}
                    >
                      {enrollment.status === "drop-requested"
                        ? "DROP REQUESTED"
                        : enrollment.status.toUpperCase()}
                    </span>
                  </div>
                  <p>
                    <strong>Units:</strong> {enrollment.units}
                  </p>
                  <p>
                    <strong>Professor:</strong> {enrollment.professorName}
                  </p>

                  {enrollment.status === "enrolled" && (
                    <button
                      onClick={() => handleRequestDrop(enrollment)}
                      className="request-drop-btn"
                    >
                      Request Drop
                    </button>
                  )}

                  {enrollment.status === "drop-requested" && (
                    <p className="drop-info">
                      <small>
                        <strong>Reason:</strong> {enrollment.dropReason}
                      </small>
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Drop Request Modal */}
      {showDropModal && (
        <div className="modal-overlay" onClick={closeDropModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Request to Drop Course</h2>
              <button onClick={closeDropModal} className="close-btn">
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="drop-course-info">
                <h3>
                  {selectedDropCourse?.courseCode} -{" "}
                  {selectedDropCourse?.courseTitle}
                </h3>
                <p>Professor: {selectedDropCourse?.professorName}</p>
              </div>

              <div className="form-group">
                <label>
                  <strong>Reason for dropping this course: *</strong>
                </label>
                <textarea
                  value={dropReason}
                  onChange={(e) => setDropReason(e.target.value)}
                  placeholder="Please provide a reason for dropping this course..."
                  rows="4"
                  required
                />
              </div>

              <div className="modal-actions">
                <button onClick={closeDropModal} className="cancel-btn">
                  Cancel
                </button>
                <button onClick={submitDropRequest} className="submit-drop-btn">
                  Submit Drop Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;