import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../style/Communication.css';

const CommunicationChannel = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ busId: '', message: '' });
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [userData, setUserData] = useState(JSON.parse(localStorage.getItem('userData')));
  

  const busOptions = [
    { value: '', label: '-- Select a bus --' },
    { value: 'spanish_town', label: 'Spanish Town' },
    { value: 'gregory_park', label: 'Gregory Park' },
    { value: 'greater_portmore_17', label: 'Greater Portmore 17' },
    { value: 'greater_portmore_20', label: 'Greater Portmore 20' }
  ];

  useEffect(() => {
    const token = localStorage.getItem('userToken');
    if (!token) navigate('/signin');
    
    const fetchUpdates = async () => {
      try {
        const response = await axios.get('/api/bus-updates');
        setUpdates(response.data);
      } catch (err) {
        console.error('Error fetching updates:', err);
      }
    };
    fetchUpdates();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!formData.busId || !formData.message.trim()) {
      setError('Please select a bus and enter a message');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('userToken');
      
      await axios.post('/api/bus-updates', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess(true);
      setFormData({ busId: '', message: '' });
      const response = await axios.get('/api/bus-updates');
      setUpdates(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send update');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    navigate('/');
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar - Same as Dashboard */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>🚌 The Mona Metro</h2>
        </div>

        <nav className="sidebar-menu">
          <ul>
            <li>
              <Link to="/dashboard" className="menu-item">
                <i className="fas fa-home"></i>
                <span>Dashboard</span>
              </Link>
            </li>

            <li>
              <Link to="/profile" className="menu-item">
                <i className="fas fa-user"></i>
                <span>Profile</span>
              </Link>
            </li>

            {(userData?.role === 'admin' || userData?.role === 'driver') && (
              <li>
                <Link to="/admin/communication" className="menu-item active">
                  <i className="fas fa-comment"></i>
                  <span>Communication Channel</span>
                </Link>
              </li>
            )}

            {/* Other menu items from Dashboard */}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-btn">
            <i className="fas fa-sign-out-alt"></i>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="content-header">
          <div className="header-left">
            <h1>Communication Channel</h1>
            <p>Send updates to passengers and view recent announcements</p>
          </div>
        </header>

        <div className="dashboard-cards">
          {/* Update Form Card */}
          <div className="feedback-card">
            <h3>Send Status Update</h3>
            <form onSubmit={handleSubmit} className="feedback-form">
              <div className="form-group">
                <label>Select Bus:</label>
                <select
                  value={formData.busId}
                  onChange={e => setFormData({ ...formData, busId: e.target.value })}
                  required
                >
                  {busOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Update Message:</label>
                <textarea
                  value={formData.message}
                  onChange={e => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Enter your update..."
                  required
                />
              </div>

              <button 
                type="submit" 
                className="submit-button"
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send Update'}
              </button>

              {error && <div className="error">{error}</div>}
              {success && <div className="success">Update sent successfully!</div>}
            </form>
          </div>

          {/* Recent Updates Card */}
          <div className="feedback-card">
            <h3>Recent Updates</h3>
            <div className="updates-list">
              {updates.length === 0 ? (
                <div className="info-box">
                  <p>No updates available</p>
                </div>
              ) : (
                updates.map(update => (
                  <div key={update.update_id} className="info-box">
                    <div className="info-header">
                      <span className="info-label">
                        {update.bus_id.replace(/_/g, ' ')} - 
                        {new Date(update.created_at).toLocaleDateString()}
                      </span>
                      <span className="driver-name">{update.driver_name}</span>
                    </div>
                    <div className="info-value">
                      {update.message}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CommunicationChannel;