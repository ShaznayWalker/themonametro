import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import '../style/dashboard.css';
import '../style/reset.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upcomingTrips, setUpcomingTrips] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [lastBookingInfo, setLastBookingInfo] = useState(null);
  const [activeBuses, setActiveBuses] = useState([]);
  const [busCount, setBusCount] = useState(null);
  const [driverUpdates, setDriverUpdates] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [adminStats, setAdminStats] = useState({
    totalUsers: 0,
    totalRevenue: 0,
    totalTopups: 0,
  });
  const [allPayments, setAllPayments] = useState([]);

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
      const locationState = location.state || {};

      if (!token || !storedData) {
        navigate('/signin');
        return;
      }

      try {
        const parsedData = JSON.parse(storedData);
        setUserData(parsedData);

        if (locationState.paymentSuccess) {
          const simulatedBookings = locationState.newBookings || [];
          setUpcomingTrips(prev => [
            ...simulatedBookings.slice(0, 3),
            ...prev.filter(b => !b.simulated),
          ]);
          setRecentBookings(prev => [
            ...simulatedBookings.slice(0, 5),
            ...prev.filter(b => !b.simulated),
          ]);
          navigate(location.pathname, { replace: true, state: {} });
        } else {
          if (parsedData.role === 'user' || parsedData.role === 'admin') {
            const [tripsResponse, bookingsResponse] = await Promise.all([
              axios.get('/api/bookings/upcoming', {
                headers: { Authorization: `Bearer ${token}` },
              }),
              axios.get('/api/bookings/recent', {
                headers: { Authorization: `Bearer ${token}` },
              }),
            ]);
            setUpcomingTrips(tripsResponse.data);
            setRecentBookings(bookingsResponse.data);
          }
        }

        const [updatesResponse, busesResponse] = await Promise.all([
          axios.get('/api/bus-updates', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get('/api/buses/active', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setDriverUpdates(updatesResponse.data);

        
        setActiveBuses(busesResponse.data.buses);
        setBusCount(busesResponse.data.count);

        
        if (parsedData.role === 'admin') {

         
          const paymentsRes = await axios.get('/api/payments/history', {
            headers: { Authorization: `Bearer ${token}` }
          });

          const payments = paymentsRes.data;

          setAllPayments(payments);

          const filteredPayments = selectedDate
            ? payments.filter(p => {
              const paymentDate = new Date(p.created_at).toISOString().split('T')[0];
              return paymentDate === selectedDate;
            })
            : payments;

          const totalRevenue = filteredPayments
            .filter(p => p.method !== 'topup')
            .reduce((sum, p) => sum + parseFloat(p.amount), 0);

          const totalTopups = filteredPayments
            .filter(p => p.method === 'topup')
            .reduce((sum, p) => sum + parseFloat(p.amount), 0);

          setAdminStats(prev => ({ ...prev, totalRevenue, totalTopups }));
        }

        // Process last booking info
        const lastBooking = recentBookings.length > 0 ? recentBookings[0] : null;
        if (lastBooking) {
          const lastBookingDate = new Date(lastBooking.booking_date);
          const today = new Date();
          const daysAgo = Math.floor((today - lastBookingDate) / (1000 * 3600 * 24));

          const simplifyLocation = (location) => {
            if (location.includes('Spanish Town')) return 'Spanish Town';
            if (location.includes('UWI')) return 'UWI';
            return location.split(',')[0];
          };

          const start = simplifyLocation(lastBooking.start_location);
          const end = simplifyLocation(lastBooking.end_location);

          setLastBookingInfo({
            tripName: `${start} → ${end}`,
            daysAgo: isNaN(daysAgo) ? 'N/A' : daysAgo,
          });
        }
      } catch (error) {
        console.error('Error loading data:', error);
        if (error.response?.status === 401) {
          localStorage.clear();
          navigate('/signin');
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndLoadData();
  }, [navigate, location.state, location.pathname]);

  useEffect(() => {
    const fetchFilteredStats = async () => {
      const token = localStorage.getItem('userToken');
      const storedData = localStorage.getItem('userData');

      if (!token || !storedData) return;

      const parsedData = JSON.parse(storedData);
      if (parsedData.role !== 'admin') return;

      try {
        const paymentsRes = await axios.get('/api/payments/history', {
          headers: { Authorization: `Bearer ${token}` }
        });

        const payments = paymentsRes.data;

        const filteredPayments = selectedDate
          ? payments.filter(p => {
            const paymentDate = new Date(p.created_at).toISOString().split('T')[0];
            return paymentDate === selectedDate;
          })
          : payments;


        const totalRevenue = filteredPayments
          .filter(p => p.method !== 'topup')
          .reduce((sum, p) => sum + parseFloat(p.amount), 0);

        const totalTopups = filteredPayments
          .filter(p => p.method === 'topup')
          .reduce((sum, p) => sum + parseFloat(p.amount), 0);

        setAdminStats(prev => ({ ...prev, totalRevenue, totalTopups }));
      } catch (err) {
        console.error("Error filtering payments:", err);
      }
    };

    fetchFilteredStats();
  }, [selectedDate]);

  // Update admin stats based on selectedDate and allPayments
  useEffect(() => {
    if (userData?.role !== 'admin') return;

    const filteredPayments = selectedDate
      ? allPayments.filter(p =>
        new Date(p.created_at).toDateString() === new Date(selectedDate).toDateString()
      )
      : allPayments;

    const totalRevenue = filteredPayments
      .filter(p => p.method !== 'topup')
      .reduce((sum, p) => sum + parseFloat(p.amount), 0);

    const totalTopups = filteredPayments
      .filter(p => p.method === 'topup')
      .reduce((sum, p) => sum + parseFloat(p.amount), 0);

    setAdminStats(prev => ({ ...prev, totalRevenue, totalTopups }));
  }, [selectedDate, allPayments, userData?.role]);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }
  const filteredPayments = selectedDate
    ? allPayments.filter(p =>
      new Date(p.created_at).toISOString().split('T')[0] === selectedDate
    )
    : allPayments;

  const revenuePayments = filteredPayments.filter(p => p.method !== 'topup');
  const avgRevenue = revenuePayments.length > 0
    ? adminStats.totalRevenue / revenuePayments.length
    : 0;


  return (
    <div className="dashboard-container">
      <aside className="dashboard-sidebar">
        <div className="dashboard-sidebar-header">
          <h2>🚌 The Mona Metro</h2>
        </div>
        <nav className="dashboard-sidebar-menu">
          <ul>
            <li>
              <Link to="/dashboard" className="dashboard-menu-item">
                <i className="fas fa-home"></i>
                <span>Dashboard</span>
              </Link>
            </li>
            <li>
              <Link to="/profile" className="dashboard-menu-item">
                <i className="fas fa-user"></i>
                <span>Profile</span>
              </Link>
            </li>
            {userData?.role !== 'driver' && (
              <li>
                <Link to="/schedule" className="dashboard-menu-item">
                  <i className="fas fa-calendar-alt"></i>
                  <span>View Bus Schedule</span>
                </Link>
              </li>
            )}
            {userData?.role === 'user' && (
              <li>
                <Link to="/feedback" className="dashboard-menu-item">
                  <i className="fas fa-comment"></i>
                  <span>Leave Feedback</span>
                </Link>
              </li>
            )}
            {userData?.role === 'admin' && (
              <li>
                <Link to="/admin/feedback" className="dashboard-menu-item">
                  <i className="fas fa-list"></i>
                  <span>View Feedback</span>
                </Link>
              </li>
            )}
            {(userData?.role === 'admin' || userData?.role === 'driver') && (
              <li>
                <Link to="/admin/communication" className="dashboard-menu-item">
                  <i className="fas fa-comment"></i>
                  <span>Communication Channel</span>
                </Link>
              </li>
            )}
          </ul>
        </nav>
        <div className="dashboard-sidebar-footer">
          <button onClick={handleLogout} className="dashboard-logout-btn">
            <i className="fas fa-sign-out-alt"></i>
            Logout
          </button>
        </div>
      </aside>


      <main className="dashboard-main-content">
        <header className="dashboard-content-header">
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
          {(userData?.role === 'admin' || userData?.role === 'user') && (
            <>
              {/* Upcoming Trips */}
              <div className="card">
                <div className="card-header">
                  <h3>Upcoming Trips</h3>
                  <i className="fas fa-route"></i>
                </div>
                <div className="card-content">
                  {userData.role === 'admin' ? (
                    upcomingTrips.length > 0 ? (
                      <div className="activities-table-container">
                        <table className="bookings-table">
                          <thead>
                            <tr>
                              <th>Booking ID</th>
                              <th>User</th>
                              <th className="route-col">Route</th>
                              <th>Seats</th>
                              <th>Status</th>
                              <th>Departure</th>
                            </tr>
                          </thead>
                          <tbody>
                            {upcomingTrips.map(b => (
                              <tr key={b.booking_id}>
                                <td>{b.booking_id}</td>
                                <td>
                                  {b.user_name}<br />
                                  <small>{b.email}</small>
                                </td>
                                <td className="route-col">{`${b.start_location} → ${b.end_location}`}</td>
                                <td>{b.seats}</td>
                                <td>{b.status}</td>
                                <td>{new Date(b.departure_time).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p>No upcoming trips.</p>
                    )
                  ) : (
                    upcomingTrips.length > 0
                      ? <p><strong>{upcomingTrips.length}</strong> upcoming trip{upcomingTrips.length > 1 && 's'}</p>
                      : <p>No upcoming trips.</p>
                  )}
                </div>
              </div>

              {userData?.role === 'admin' && (
                <>
                  <div className="card">
                    <div className="card-header">
                      <h3>Filter by Date</h3>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="date-picker"
                      />
                    </div>
                    {selectedDate && (
                      <p style={{ marginTop: '10px' }}>
                        📆 Filtered for: <strong>{new Date(selectedDate).toDateString()}</strong>
                      </p>
                    )}
                  </div>

                  <div className="card">
                    <div className="card-header">
                      <h3>Total Revenue</h3>
                      <i className="fas fa-dollar-sign"></i>
                    </div>
                    <div className="card-content">
                      <p><strong>💵 Total Revenue Collected: ${adminStats.totalRevenue.toFixed(2)}</strong></p>
                      <p><strong>---{filteredPayments.length} transactions included in this total.</strong></p>
                      <p><strong>📊 Average booking payment: ${avgRevenue.toFixed(2)}</strong></p>
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-header">
                      <h3>Total Top‑Ups</h3>
                      <i className="fas fa-wallet"></i>
                    </div>
                    <div className="card-content">
                      <p><strong>📥 Total Wallet Top-Ups: ${adminStats.totalTopups.toFixed(2)}</strong></p>
                    </div>
                  </div>
                </>
              )}

              <div className="card">
                <div className="card-header">
                  <h3>Recent Bookings</h3>
                  <i className="fas fa-ticket-alt"></i>
                </div>
                <div className="card-content">
                  {recentBookings.length > 0 ? (
                    <table className="recent-bookings-table">
                      <thead>
                        <tr>
                          <th>Booking Date</th>
                          <th>Route</th>
                          <th>Seats</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentBookings.map(booking => (
                          <tr key={booking.booking_id}>
                            <td>
                              {booking.booking_date
                                ? new Date(booking.booking_date).toLocaleDateString()
                                : 'N/A'}
                            </td>
                            <td>
                              {booking.start_location && booking.end_location
                                ? `${booking.start_location} → ${booking.end_location}`
                                : 'N/A'}
                            </td>
                            <td>{booking.seats || 'N/A'}</td>
                            <td>{booking.status || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p>No recent bookings</p>
                  )}
                </div>
              </div>
            </>
          )}

          {lastBookingInfo && (
            <div className="card">
              <div className="card-header">
                <h3>Last Booking</h3>
                <i className="fas fa-history"></i>
              </div>
              <div className="card-content">
                <p>
                  Last booking: {lastBookingInfo.tripName}, {lastBookingInfo.daysAgo} days ago
                </p>
              </div>
            </div>
          )}

          {(userData?.role === 'admin' || userData?.role === 'driver') && (
            <div className="card">
              <div className="card-header">
                <h3>Driver Updates</h3>
                <i className="fas fa-broadcast-tower"></i>
              </div>
              <div className="card-content">
                {driverUpdates.length > 0 ? (
                  <table>
                    <thead>
                      <tr>
                        <th>Update Time</th>
                        <th>Origin</th>
                        <th>Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {driverUpdates.map((update, index) => (
                        <tr key={index}>
                          <td>
                            {new Date(update.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td>{update.bus_id || 'N/A'}</td>
                          <td>{update.message || 'No message'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>No driver updates available.</p>
                )}
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <h3>
                Bus schedule/Active Buses
                {userData?.role === 'admin' && busCount !== null && (
                  <span className="count-badge">({busCount})</span>
                )}
              </h3>
              <i className="fas fa-bus"></i>
            </div>
            <div className="card-content">
              {activeBuses.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>Bus Origin/Destination</th>
                      <th>Route</th>
                      <th>Next Departure</th>
                      {userData?.role === 'admin' && <th>Status</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {activeBuses.map(bus => (
                      <tr key={bus.busId}>
                        <td>{bus.busNumber}</td>
                        <td>{bus.currentRoute}</td>
                        <td>
                          {new Date(bus.nextDeparture).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        {userData?.role === 'admin' && (
                          <td>
                            <span className={`status ${bus.status.toLowerCase()}`}>
                              {bus.status}
                            </span>
                          </td>
                        )}
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

      </main>
    </div>
  );
};

export default Dashboard;