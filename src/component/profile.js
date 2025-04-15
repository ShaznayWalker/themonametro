import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import '../style/profile.css';
import '../style/reset.css';

const Profile = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('userToken');
      const userEmail = localStorage.getItem('userEmail');
      if (!token || !userEmail) return navigate('/signin');

      try {
        const { data } = await axios.get('http://localhost:5000/api/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUserData(data);
      } catch (err) {
        console.error(err);
        if (err.response?.status === 401) {
          localStorage.clear();
          navigate('/signin');
        } else {
          setError('Failed to load profile.');
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

  const formatDate = iso => new Date(iso).toLocaleDateString();

  if (loading) return <div className="loading">Loading…</div>;
  if (error)   return <div className="error">{error}</div>;

  return (
    <div className="profile-page">
      <aside className="profile-sidebar">
        <div className="ps-header">
          <h2>🚌 The Mona Metro</h2>
        </div>
        <nav className="ps-nav">
          <Link to="/dashboard" className="ps-link"><i className="fas fa-home"></i>Dashboard</Link>
          <Link to="/profile" className="ps-link active"><i className="fas fa-user"></i>Profile</Link>
          <Link to="/schedule" className="ps-link"><i className="fas fa-calendar-alt"></i>View Bus Schedule</Link>
        </nav>
        <button onClick={handleLogout} className="ps-logout">
          <i className="fas fa-sign-out-alt"></i>Logout
        </button>
      </aside>

      <main className="profile-main">
        <header className="profile-greeting">
          <h1>Hello, {userData.firstname}!</h1>
          <p>Welcome back to your dashboard.</p>
        </header>

        <section className="profile-card">
          <div className="pc-header">
            <div className="pc-avatar">
              
              {userData.firstname.charAt(0)}{userData.lastname.charAt(0)}
            </div>
            <div>
              <h2>{userData.firstname} {userData.lastname}</h2>
              <span className={`role-badge role-${userData.role}`}>
                {userData.role.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="pc-details">
            <div className="detail-item">
              <span className="label">Email</span>
              <span className="value">{userData.email}</span>
            </div>
            <div className="detail-item">
              <span className="label">Member Since</span>
              <span className="value">{formatDate(userData.joindate)}</span>
            </div>
          </div>

          <div className="profile-actions">
            <button className="btn edit-btn">
              <i className="fas fa-edit"></i>Edit Profile
            </button>
            <button className="btn pass-btn">
              <i className="fas fa-key"></i>Change Password
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Profile;
