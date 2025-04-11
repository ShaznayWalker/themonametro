import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import '../style/profile.css';

const Profile = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('userToken');
      const userEmail = localStorage.getItem('userEmail');
  
      if (!token || !userEmail) {
        navigate('/signin');
        return;
      }
  
      try {
        const response = await axios.get('http://localhost:5000/api/profile', {
          headers: { 
            Authorization: `Bearer ${token}`,
            'X-User-Email': userEmail.toLowerCase(),
          }
        });
        console.log('Profile data received:', response.data); // Log the response data to confirm `joinDate`
        setUserData(response.data);
      } catch (err) {
        console.error('Error fetching profile:', err);
        if (err.response?.status === 401) {
          localStorage.clear();
          navigate('/signin');
        } else {
          setError(err.response?.data?.message || 'Error loading profile');
        }
      } finally {
        setLoading(false);
      }
    };
  
    fetchData();
  }, [navigate]);
  

  const handleLogout = () => {
    localStorage.clear();
    navigate('/signin');
  };

  const formDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };
  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>🚌The Mona Metro</h2>
        </div>
        <nav className="sidebar-menu">
          <ul>
            <li><Link to="/dashboard" className="menu-item"><i className="fas fa-home"></i> Dashboard</Link></li>
            <li className="active"><Link to="/profile" className="menu-item"><i className="fas fa-user"></i> Profile</Link></li>
            <li><Link to="/schedule" className="menu-item"><i className="fas fa-calendar-alt"></i> Schedule</Link></li>
          </ul>
        </nav>
        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-btn">
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="content-header">
          <h1>Hello {userData?.firstname},</h1>
        </header>
        <div className="profile-container">
          <div className="profile-card">
            <div className="profile-header">
              <div className="profile-avatar">
                <i className="fas fa-user-circle"></i>
              </div>
              <h2>{userData?.firstname} {userData?.lastname} </h2>
              <span className="user-role">{userData?.role}</span>
            </div>
            <div className="profile-details">
              <div className="detail-item">
                <span className="detail-label">Email:</span>
                <span className="detail-value">{userData?.email}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Member Since:</span>
                <span className="detail-value">{userData?.joindate && formDate(userData.joindate)}</span>
                </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;