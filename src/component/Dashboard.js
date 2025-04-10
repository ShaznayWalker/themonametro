import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import '../style/dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upcomingTrips, setUpcomingTrips] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [activeBuses, setActiveBuses] = useState([]);
  const [busCount, setBusCount] = useState(0);

  const handleLogout = () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('userEmail');
    navigate('/');
  };

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      const token = localStorage.getItem('userToken');
      const storedData = localStorage.getItem('userData');

      if (!token || !storedData) {
        navigate('/signin');
        return;
      }

      try {
        const parsedData = JSON.parse(storedData);
        setUserData(parsedData);

        if (parsedData.role === 'user') {
          const [tripsResponse, bookingsResponse] = await Promise.all([
            axios.get('/api/bookings/upcoming', {
              headers: { Authorization: `Bearer ${token}` }
            }),
            axios.get('/api/bookings/recent', {
              headers: { Authorization: `Bearer ${token}` }
            })
          ]);
          setUpcomingTrips(tripsResponse.data);
          setRecentBookings(bookingsResponse.data);
        }

        const busesResponse = await axios.get('/api/buses/active', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setActiveBuses(busesResponse.data.buses);
        setBusCount(busesResponse.data.count);

      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndLoadData();
  }, [navigate]);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>The Mona Metro</h2>
        </div>

        <nav className="sidebar-menu">
          <ul>
            <li>
              <Link to="/dashboard" className="menu-item">
                <i className="fas fa-home"></i>
                <span>Dashboard</span>
              </Link>
            </li>

            {(userData?.role === 'driver' || userData?.role === 'user' || userData?.role === 'admin') && (
              <li>
                <Link to="/profile" className="menu-item">
                  <i className="fas fa-user"></i>
                  <span>Profile</span>
                </Link>
              </li>
            )}

            {userData?.role !== 'driver' && (
              <li>
                <Link to="/schedule" className="menu-item">
                  <i className="fas fa-calendar-alt"></i>
                  <span>View Bus Schedule</span>
                </Link>
              </li>
            )}

            {userData?.role === 'user' && (
              <li>
                <Link to="/feedback" className="menu-item">
                  <i className="fas fa-comment"></i>
                  <span>Leave Feedback</span>
                </Link>
              </li>
            )}

            {userData?.role === 'admin' && (
              <li>
                <Link to="/admin/feedback" className="menu-item">
                  <i className="fas fa-list"></i>
                  <span>View Feedback</span>
                </Link>
              </li>
            )}

            {(userData?.role === 'admin' || userData?.role === 'driver') && (
              <li>
                <Link to="/admin/communication" className="menu-item">
                  <i className="fas fa-comment"></i>
                  <span>Communication Channel</span>
                </Link>
              </li>
            )}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-btn">
            <i className="fas fa-sign-out-alt"></i>
            Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="content-header">
          <div className="header-left">
            <h1>Welcome back, {userData?.firstname || 'User'}</h1>
            <p>Here's your daily overview</p>
          </div>
          <div className="header-right">
            <div className="notification-icon">
              <i className="fas fa-bell"></i>
              <span className="notification-badge">2</span>
            </div>
          </div>
        </header>

        <div className="dashboard-cards">
          {userData?.role === 'user' && (
            <>
              <div className="card">
                <div className="card-header">
                  <h3>Upcoming Trips</h3>
                  <i className="fas fa-route"></i>
                </div>
                <div className="card-content">
                  {upcomingTrips.length > 0 ? (
                    upcomingTrips.map(trip => (
                      <div key={trip.bookingId} className="trip-item">
                        <div className="trip-route">
                          {trip.startLocation} → {trip.endLocation}
                        </div>
                        <div className="trip-time">
                          {new Date(trip.departureTime).toLocaleTimeString()}
                        </div>
                        <div className={`trip-status ${trip.status}`}>
                          {trip.status}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p>No upcoming trips booked</p>
                  )}
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3>Recent Bookings</h3>
                  <i className="fas fa-ticket-alt"></i>
                </div>
                <div className="card-content">
                  {recentBookings.length > 0 ? (
                    recentBookings.map(booking => (
                      <div key={booking.bookingId} className="booking-item">
                        <div className="booking-date">
                          {new Date(booking.bookingDate).toLocaleDateString()}
                        </div>
                        <div className="booking-details">
                          {booking.routeName} - {booking.seats} seats
                        </div>
                        <div className="booking-status">
                          {booking.status}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p>No recent bookings</p>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="recent-activities">
            <div className="card-header">
              <h3>Active Buses ({busCount})</h3>
              <i className="fas fa-bus"></i>
            </div>
            <div className="activities-table-container">
              {activeBuses.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>Bus ID</th>
                      <th>Bus Number</th>
                      <th>Route</th>
                      <th>Status</th>
                      <th>Next Departure</th>
                      {userData?.role === 'admin' && <th>Driver</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {activeBuses.map(bus => (
                      <tr key={bus.busId}>
                        <td>{bus.busId}</td>
                        <td>{bus.busNumber}</td>
                        <td>{bus.currentRoute}</td>
                        <td>
                          <span className={`status ${bus.status.toLowerCase()}`}>
                            {bus.status}
                          </span>
                        </td>
                        <td>{new Date(bus.nextDeparture).toLocaleString()}</td>
                        {userData?.role === 'admin' && <td>{bus.driverName || 'N/A'}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No active buses currently</p>
              )}
            </div>
          </div>
        </div>

        {userData?.role === 'user' && (
          <div className="recent-activities">
            <h2>Recent Bookings</h2>
            <div className="activities-table-container">
              <table>
                <thead>
                  <tr>
                    <th>Route</th>
                    <th>Time</th>
                    <th>Status</th>
                    <th>Seats</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.map(booking => (
                    <tr key={booking.bookingId}>
                      <td>{booking.startLocation} → {booking.endLocation}</td>
                      <td>{new Date(booking.departureTime).toLocaleTimeString()}</td>
                      <td>
                        <span className={`status ${booking.status.toLowerCase()}`}>
                          {booking.status}
                        </span>
                      </td>
                      <td>{booking.seats}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
