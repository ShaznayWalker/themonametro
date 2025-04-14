import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../style/Schedule.css';

const BusSchedule = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pickupFilter, setPickupFilter] = useState('');
  const [destinationFilter, setDestinationFilter] = useState('');
  const [timeFilter, setTimeFilter] = useState('');
  const [showCheckboxes, setShowCheckboxes] = useState(false);
  const [showConfirmButton, setShowConfirmButton] = useState(false);
  const [selectedTrips, setSelectedTrips] = useState([]);
  const [selectionError, setSelectionError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const token = localStorage.getItem('userToken');
        const response = await axios.get('/api/buses/active', {
          headers: { Authorization: `Bearer ${token}` },
        });

        const transformed = response.data.buses.map((bus) => ({
          bus: bus.busId,
          pickup: bus.busNumber.split(' → ')[0],
          destination: bus.busNumber.split(' → ')[1],
          time: new Date(bus.nextDeparture).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          via: bus.currentRoute,
        }));

        setSchedules(transformed);
      } catch (error) {
        console.error('Error fetching schedules:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedules();
  }, []);

  const getPeriod = (timeStr) => {
    const [time, modifier] = timeStr.split(' ');
    let [hours] = time.split(':').map(Number);
    if (modifier === 'PM' && hours !== 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    if (hours >= 5 && hours < 12) return 'Morning';
    if (hours >= 12 && hours < 17) return 'Afternoon';
    if (hours >= 17 && hours < 21) return 'Evening';
    return 'Night';
  };

  const uniqueValues = (key) => [...new Set(schedules.map((s) => s[key]))];

  const resetFilters = () => {
    setPickupFilter('');
    setDestinationFilter('');
    setTimeFilter('');
    setShowCheckboxes(false);
    setShowConfirmButton(false);
  };

  const handleReserveSeatClick = () => {
    if (showCheckboxes && selectedTrips.length === 0) {
      setSelectionError('Please select at least one trip');
      return;
    }
    setShowCheckboxes(!showCheckboxes);
    setShowConfirmButton(true);
    setSelectionError('');
  };

  const handleGoBackClick = () => {
    setShowCheckboxes(false);
    setShowConfirmButton(false);
  };

  const filteredSchedules = schedules.filter((s) => {
    return (
      (!pickupFilter || s.pickup === pickupFilter) &&
      (!destinationFilter || s.destination === destinationFilter) &&
      (!timeFilter || s.time === timeFilter)
    );
  });

  const groupedFilteredSchedules = filteredSchedules.reduce((acc, schedule) => {
    const period = getPeriod(schedule.time);
    if (!acc[period]) acc[period] = [];
    acc[period].push(schedule);
    return acc;
  }, {});

  if (loading) return <div className="dashboard-loading">Loading schedules...</div>;

  return (
    <div className="bus-schedule-container">
      {/* Sidebar */}
      <aside className="bus-schedule-sidebar">
        <div className="bus-schedule-sidebar-header">
          <span className="app-logo">🚌</span>
          <h2>The Mona Metro</h2>
        </div>
        <ul className="bus-schedule-menu">
          <li><a href="/dashboard" className="menu-item">Dashboard</a></li>
          <li><a href="/profile" className="menu-item active">Profile</a></li>
          <li><a href="/schedule" className="menu-item">View Bus Schedule</a></li>
          <li><a href="/payment" className="menu-item">Transactions</a></li>

        </ul>
        <div className="bus-schedule-sidebar-footer">
          <button
            className="bus-schedule-logout-btn"
            onClick={() => {
              localStorage.clear();
              sessionStorage.clear();
              navigate('/signin');
            }}
          >
            <i className="fas fa-sign-out-alt" /> Logout
          </button>
        </div>
      </aside>


      {/* Main */}
      <main className="bus-schedule-main">
        <h1 className="bus-schedule-title">Bus Schedule</h1>

        <p><strong>Filter by:</strong></p>
        <div className="bus-schedule-filters">
          <select value={pickupFilter} onChange={(e) => setPickupFilter(e.target.value)}>
            <option value="">All Pickup Locations</option>
            {uniqueValues('pickup').map((pickup, idx) => (
              <option key={idx} value={pickup}>{pickup}</option>
            ))}
          </select>
          <select value={destinationFilter} onChange={(e) => setDestinationFilter(e.target.value)}>
            <option value="">All Destinations</option>
            {uniqueValues('destination').map((destination, idx) => (
              <option key={idx} value={destination}>{destination}</option>
            ))}
          </select>
          <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)}>
            <option value="">All Times</option>
            {uniqueValues('time').map((time, idx) => (
              <option key={idx} value={time}>{time}</option>
            ))}
          </select>
        </div>

        {selectionError && (
          <div className="error-message" style={{ color: 'red', margin: '10px 0' }}>
            {selectionError}
          </div>
        )}

        <div className="bus-schedule-buttons">
          <button onClick={resetFilters} className="reset-btn">Reset Filters</button>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={showConfirmButton ? handleGoBackClick : handleReserveSeatClick}
              className="action-btn"
            >
              {showConfirmButton ? 'Go Back' : 'Reserve Seat'}
            </button>
            {showConfirmButton && (
              <button
                className="confirm-btn"
                onClick={() => {
                  const numericSelectedTrips = selectedTrips.map(Number);
                  const selectedSchedules = schedules.filter(s =>
                    numericSelectedTrips.includes(Number(s.bus))
                  );

                  if (selectedSchedules.length === 0) {
                    setSelectionError('Please select at least one valid trip');
                    return;
                  }

                  const paymentPayload = {
                    amountToPay: selectedSchedules.length * 300,
                    selectedTrips: selectedSchedules.map(trip => ({
                      busId: Number(trip.bus),
                      pickup: trip.pickup,
                      destination: trip.destination,
                      time: trip.time,
                      via: trip.via
                    }))
                  };

                  navigate('/payment', { state: paymentPayload });
                }}
              >
                Confirm
              </button>
            )}
          </div>
        </div>

        {Object.keys(groupedFilteredSchedules).length > 0 ? (
          Object.entries(groupedFilteredSchedules).map(([period, trips]) => (
            <div key={period} className="recent-activities">
              <h3>{period} Trips</h3>
              <div className="activities-table-container">
                <table className="bus-schedule-table">
                  <thead>
                    <tr>
                      <th>Bus ID</th>
                      <th>Pickup</th>
                      <th>Destination</th>
                      <th>Time</th>
                      <th>Route</th>
                      <th>Cost</th>
                      {showCheckboxes && <th>Select</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {trips.map((schedule, idx) => (
                      <tr key={idx}>
                        <td>{schedule.bus}</td>
                        <td>{schedule.pickup}</td>
                        <td>{schedule.destination}</td>
                        <td>{schedule.time}</td>
                        <td>{schedule.via}</td>
                        <td>$300</td>
                        {showCheckboxes && (
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedTrips.includes(schedule.bus)}
                              onChange={(e) => {
                                const busId = Number(schedule.bus);
                                setSelectedTrips(prev =>
                                  e.target.checked
                                    ? [...prev, busId]
                                    : prev.filter(id => id !== busId)
                                );
                              }}
                            />
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        ) : (
          <p>No available buses.</p>
        )}
      </main>
    </div>
  );
};

export default BusSchedule;
