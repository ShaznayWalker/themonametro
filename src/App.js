import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Signup from "./component/signup";
import Signin from "./component/signin";
import Home from "./component/Home";
import Dashboard from "./component/Dashboard";
import Profile from "./component/profile";
import Schedule from "./component/schedule";
import Feedback from "./component/feedback";
import Communication from "./component/communication"

const ProtectedRoute = ({ children }) => {
  return localStorage.getItem('userToken') ? children : <Navigate to="/signin" replace />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/signup" element={<Signup />} />
        <Route path="/signin" element={<Signin />} />
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="schedule" element={<ProtectedRoute><Schedule /></ProtectedRoute>} />
        <Route path="feedback" element={<ProtectedRoute><Feedback /></ProtectedRoute>} />
        <Route path="communication" element={<ProtectedRoute><Communication /></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}

export default App;