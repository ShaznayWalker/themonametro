import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import '../style/reset.css';
import '../style/Payment.css';

function Payment() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('userToken');

  const [walletBalance, setWalletBalance] = useState(100);
  const [transactions, setTransactions] = useState([]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastTransaction, setLastTransaction] = useState(null);

  const [payMethod, setPayMethod] = useState('wallet');
  const passedAmount = location.state?.amountToPay || '';
  const [payAmount, setPayAmount] = useState(passedAmount.toString());

  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpMethod, setTopUpMethod] = useState('card');

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const resp = await axios.get('/api/payments/history', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const hist = resp.data.map(p => ({
          type: 'Payment',
          method: p.method,
          amount: parseFloat(p.amount),
          date: new Date(p.created_at).toLocaleString(),
        }));
        setTransactions(hist);
      } catch (err) {
        console.error('Failed to load payment history', err);
      }
    };
    loadHistory();
  }, [token]);

  
  const handlePayment = async () => {
    const amount = parseFloat(payAmount);
    const minAmount = 300;

    if (isNaN(amount) || amount < minAmount) {
      return alert(`Minimum payment is $${minAmount}.`);
    }

    if (!location.state?.selectedTrips?.length) {
      alert('No trips selected.');
      return navigate('/schedule');
    }

    try {
      const tripsPayload = location.state.selectedTrips.map(t => ({
        busId: t.busId,
        seats: 1,
        departureTime: new Date().toISOString(),
        startLocation: t.pickup,
        endLocation: t.destination
      }));

      const resp = await axios.post(
        '/api/payments',
        { amount, method: payMethod, trips: tripsPayload },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (resp.data.success) {
        if (payMethod === 'wallet') {
          setWalletBalance(b => b - amount);
        }

        navigate('/dashboard', {
          state: {
            paymentSuccess: true,
            newBookings: tripsPayload,
            amountPaid: amount
          }
        });

        const txn = {
          type: 'Payment',
          method: payMethod,
          amount,
          date: new Date().toLocaleString(),
          trips: location.state.selectedTrips.map(t => ({
            busId: t.busId,
            route: `${t.pickup} to ${t.destination}`,
            time: t.time
          }))
        };
        setTransactions(prev => [txn, ...prev]);
        setLastTransaction(txn);
        setShowReceipt(true);
        setPayAmount('');
      } else {
        throw new Error(resp.data.error || 'Payment failed');
      }
    } catch (err) {
      console.error(err);
      alert('Payment failed, please try again.');
    }
  };


  const handleTopUp = async () => {
    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount <= 0) {
      return alert('Enter a valid top‑up amount.');
    }

    try {
      const resp = await axios.post(
        '/api/wallet/topup',
        { amount },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (resp.data.success) {
        setWalletBalance(resp.data.newBalance);

        const txn = {
          type: 'Top-Up',
          method: topUpMethod,
          amount,
          date: new Date().toLocaleString(),
        };
        setTransactions(prev => [txn, ...prev]);
        setLastTransaction(txn);
        setShowReceipt(true);
        setTopUpAmount('');
      } else {
        throw new Error(resp.data.error || 'Top-up failed');
      }
    } catch (err) {
      console.error(err);
      alert('Top‑up failed, please try again.');
    }
  };
  const isActive = (path) => location.pathname === path;

  return (
    <div className="payment-container">
      <div className="payment-sidebar">
        <div className="payment-sidebar-header">
          <span className="app-logo">🚌</span>
          <h2>The Mona Metro</h2>
        </div>

        <nav className="payment-sidebar-nav">
          <Link to="/dashboard" className={`payment-menu-item ${isActive("/dashboard") ? "active" : ""}`}>Dashboard</Link>
          <Link to="/profile" className={`payment-menu-item ${isActive("/profile") ? "active" : ""}`}>Profile</Link>
          <Link to="/schedule" className={`payment-menu-item ${isActive("/schedule") ? "active" : ""}`}>View Bus Schedule</Link>

        </nav>

        <div className="payment-logout-container">
          <button
            className="payment-logout-btn"
            onClick={() => {
              localStorage.clear();
              navigate("/signin");
            }}
          >
            Logout
          </button>
        </div>
      </div>

      <main className="payments-main-content">
        <h1 className="payment-title">💳 Payment Page</h1>

        <div className="payment-main-content">
          <div className="payment-row">
            <div className="payment-card">
              <h2>Make a Payment</h2>
              <input
                type="number"
                placeholder="Enter amount"
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
                className="payment-input"
              />
              <select
                value={payMethod}
                onChange={e => setPayMethod(e.target.value)}
                className="payment-select"
              >
                <option value="card">Credit/Debit Card</option>
                <option value="wallet">Wallet Balance</option>
              </select>
              <button onClick={handlePayment} className="payment-button">
                Pay Now
              </button>
            </div>

            <div className="payment-card">
              <h2>Top Up Wallet</h2>
              <p className="wallet-balance">Wallet Balance: <strong>${Number(walletBalance).toFixed(2)}</strong></p>


              <input
                type="number"
                placeholder="Amount to add"
                value={topUpAmount}
                onChange={e => setTopUpAmount(e.target.value)}
                className="payment-input"
              />
              <select
                value={topUpMethod}
                onChange={e => setTopUpMethod(e.target.value)}
                className="payment-select"
              >
                <option value="card">Credit/Debit Card</option>
              </select>
              <button onClick={handleTopUp} className="payment-button">
                Add to Wallet
              </button>
            </div>
          </div>

          <div className="payment-card">
            <h2>Transaction History</h2>
            {transactions.length === 0 ? (
              <p>No transactions yet.</p>
            ) : (
              <ul className="transaction-list">
                {transactions.map((txn, idx) => (
                  <li key={idx} className="transaction-item">
                    <div className="transaction-info">
                      <span className="txn-type">{txn.type}</span>
                      <span className="txn-meta">${txn.amount.toFixed(2)} via {txn.method}</span>
                      <span className="txn-date">{txn.date}</span>
                    </div>
                  </li>

                ))}
              </ul>
            )}
          </div>
        </div>

        {showReceipt && (
          <div className="receipt-popup">
            <div className="receipt-content">
              <h3>🧾 Transaction Receipt</h3>
              <p>
                You made a <strong>{lastTransaction?.type}</strong> of <strong>${lastTransaction?.amount.toFixed(2)}</strong> using <strong>{lastTransaction?.method}</strong> on <strong>{lastTransaction?.date}</strong>.
              </p>
              <button className="payment-button" onClick={() => setShowReceipt(false)}>
                Close Receipt
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Payment;
