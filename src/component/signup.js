import { useState } from "react";
import axios from "axios";
import "../style/Signup.css";
import { Link } from "react-router-dom";

const Signup = () => {
  const [formData, setFormData] = useState({
    firstname: "",
    lastname: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "user" // Added role field with default value
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    } else {
      setError("");
    }

    try {
      const response = await axios.post("http://localhost:5000/api/signup", {
        firstname: formData.firstname,
        lastname: formData.lastname,
        username: formData.username,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        role: formData.role // Added role to the submission
      });

      console.log(response.data);
      alert(`User registered successfully as ${formData.role}!`);
      setFormData({
        firstname: "",
        lastname: "",
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "user" // Reset to default
      });
    } catch (error) {
      console.error(error);
      setError(error.response?.data?.message || "Error signing up. Please try again.");
    }
  };
  
  return (
    <div className="signup-container">
      <h1>The Mona Metro</h1>
      <form className="signup-form" onSubmit={handleSubmit}>
        <h2>Registration Form</h2>
        <div className="form-row">
          <div className="form-group">
            <input
              type="text"
              name="firstname"
              placeholder="First Name"
              value={formData.firstname}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <input
              type="text"
              name="lastname"
              placeholder="Last Name"
              value={formData.lastname}
              onChange={handleChange}
              required
            />
          </div>
        </div>
        <div className="form-group">
          <input
            type="text"
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />
        </div>
        {/* Added role selection dropdown */}
        <div className="form-group">
          <label htmlFor="role">Account Type:</label>
          <select
            name="role"
            id="role"
            value={formData.role}
            onChange={handleChange}
            className="form-control"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
            <option value="driver">Bus Driver</option>
          </select>
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit">Sign Up</button>
      </form>
      <div className="signin-link">
        <p>Already have an account? <Link to="/signin">Sign in</Link></p>
      </div>
    </div>
  );
};

export default Signup;