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

  const groupedSchedules = schedules.reduce((acc, schedule) => {
    const period = getPeriod(schedule.time);
    if (!acc[period]) acc[period] = [];
    acc[period].push(schedule);
    return acc;
  }, {});

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
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>UWI Metro</h2>
        </div>
        <div className="sidebar-menu">
          <ul>
            <li><a href="/dashboard" className="menu-item"><i className="fas fa-home" />Dashboard</a></li>
            <li><a href="/schedule" className="menu-item"><i className="fas fa-bus" />Schedule</a></li>
            <li><a href="/payment" className="menu-item"><i className="fas fa-credit-card" />Payment</a></li>
            <li><a href="/profile" className="menu-item"><i className="fas fa-user" />Profile</a></li>
          </ul>
        </div>
        <div className="sidebar-footer">
          <button className="logout-btn"><i className="fas fa-sign-out-alt" />Logout</button>
        </div>
      </aside>

      <main className="main-content">
        <div className="content-header">
          <h1>Bus Schedule</h1>
        </div>

        <p><strong>Filter by:</strong></p>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
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

        {selectionError && <div className="error-message" style={{ color: 'red', margin: '10px 0' }}>{selectionError}</div>}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
          <button onClick={resetFilters} className="reset-btn">Reset Filters</button>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={showConfirmButton ? handleGoBackClick : handleReserveSeatClick} className="action-btn">
              {showConfirmButton ? 'Go Back' : 'Reserve Seat'}
            </button>
            {showConfirmButton && (
              <button
                className="confirm-btn"
                onClick={() => {
                  // Convert all selected trip IDs to numbers for consistent comparison
                  console.log('SelectedTrips:', selectedTrips); // Add this first
                  console.log('All bus IDs:', schedules.map(s => s.bus));
                  const numericSelectedTrips = selectedTrips.map(Number);

                  console.log('Selected trip IDs:', numericSelectedTrips);
                  console.log('All bus IDs:', schedules.map(s => s.bus));

                  // Validate selections against actual bus IDs
                  const selectedSchedules = schedules.filter(s =>
                    selectedTrips.includes(Number(s.bus))
                  );

                  if (selectedSchedules.length === 0) {
                    console.error('No valid trips selected');
                    setSelectionError('Please select at least one valid trip');
                    return;
                  }

                  // Create payment payload with type-safe data
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

                  console.log('Payment payload:', paymentPayload);
                  navigate('/payment', { state: paymentPayload });
                }}
              >
                Confirm
              </button>
            )}
          </div>
        </div>

        {Object.keys(groupedFilteredSchedules).length > 0 ? (
          Object.keys(groupedFilteredSchedules).map((period) => (
            <div key={period} className="recent-activities">
              <h3>{period} Trips</h3>
              <div className="activities-table-container">
                <table className="schedule-table">
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
                    {groupedFilteredSchedules[period].map((schedule, idx) => (
                      <tr key={idx}>
                        <td>{schedule.bus}</td>
                        <td>{schedule.pickup}</td>
                        <td>{schedule.destination}</td>
                        <td>{schedule.time}</td>
                        <td>{schedule.via}</td>
                        <td>$300</td>
                        {showCheckboxes && (
                          <td>
                            {/* Checkbox input for trip selection */}
                            <input
                              type="checkbox"
                              checked={selectedTrips.includes(schedule.bus)}
                              onChange={(e) => {

                                const busId = Number(schedule.bus); // Convert to number
                                console.log('Selected busId:', busId, 'Type:', typeof busId); // Debug here
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
