import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Signup from "./component/signup";
import Signin from "./component/signin";
import Home from "./component/Home";
import Dashboard from "./component/Dashboard";
import Profile from "./component/profile";
import Schedule from "./component/schedule";
import Feedback from "./component/feedback";
import Communication from "./component/communication";
import Payment from "./component/payment"; // Added Payment import

const ProtectedRoute = ({ children, requiredRole }) => {
  const user = JSON.parse(localStorage.getItem('userData'));
  const token = localStorage.getItem('userToken');

  if (!token) return <Navigate to="/signin" replace />;
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/signup" element={<Signup />} />
        <Route path="/signin" element={<Signin />} />
        <Route path="/" element={<Home />} />

        {/* Protected routes */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/schedule" element={<ProtectedRoute><Schedule /></ProtectedRoute>} />
        <Route path="/payment" element={<ProtectedRoute><Payment /></ProtectedRoute>} />

        {/* Feedback routes */}
        <Route path="/feedback" element={
          <ProtectedRoute>
            <Feedback />
          </ProtectedRoute>
        } />
        
        <Route path="/admin/feedback" element={
          <ProtectedRoute requiredRole="admin">
            <Feedback />
          </ProtectedRoute>
        } />

        {/* Communication route */}
        <Route path="/admin/communication" element={
          <ProtectedRoute requiredRole="admin">
            <Communication />
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;