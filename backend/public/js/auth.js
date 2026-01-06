function checkAuth(requiredRole) {
  const token = localStorage.getItem("jwtToken");
  const role = localStorage.getItem("userRole");

  // Not logged in
  if (!token || !role) {
    window.location.href = "../login/index.html";
    return;
  }

  // Role mismatch
  if (requiredRole && role !== requiredRole) {
    if (role === "Student") {
      window.location.href = "../student/student.html";
    } else if (role === "Driver") {
      window.location.href = "../driver/driver.html";
    } else if (role === "Incharge") {
      window.location.href = "../incharge/incharge-dashboard.html";
    }
  }
}
