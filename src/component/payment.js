import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import '../style/Payment.css';

function Payment() {
    const navigate = useNavigate();
    const [walletBalance, setWalletBalance] = useState(100);
    const [transactions, setTransactions] = useState([]);
    const [showReceipt, setShowReceipt] = useState(false);
    const [lastTransaction, setLastTransaction] = useState(null);
    const [payMethod, setPayMethod] = useState('wallet');
    const [topUpAmount, setTopUpAmount] = useState('');
    const [topUpMethod, setTopUpMethod] = useState('card');
    const location = useLocation();
    const passedAmount = location.state?.amountToPay || '';
    const [payAmount, setPayAmount] = useState(passedAmount.toString());

    const handlePayment = async () => {
        try {
            const amount = parseFloat(payAmount);
            if (isNaN(amount) || amount <= 0) {
                alert('Please enter a valid payment amount.');
                return;
            }
    
            if (!location.state?.selectedTrips?.length) {
                alert('No trips selected. Please start over.');
                navigate('/schedule');
                return;
            }
    
            // Simulate payment processing without server call
            const paymentSuccessful = window.confirm(
                `Simulate payment of $${amount} for ${location.state.selectedTrips.length} trip(s)?\n\n` +
                'This is a demonstration only - no real payment will be processed.'
            );
    
            if (!paymentSuccessful) {
                alert('Payment simulation cancelled');
                return;
            }
    
            // Update wallet balance (simulated)
            if (payMethod === 'wallet') {
                if (walletBalance < amount) {
                    alert('Insufficient funds in wallet');
                    return;
                }
                setWalletBalance(prev => prev - amount);
            }
    
            // Create transaction record
            const txn = {
                type: 'Payment',
                method: payMethod,
                amount,
                date: new Date().toLocaleString(),
                trips: location.state.selectedTrips.map(trip => ({
                    busId: trip.busId,
                    route: `${trip.pickup} to ${trip.destination}`,
                    time: trip.time
                }))
            };
    
            // Update UI state
            setTransactions(prev => [txn, ...prev]);
            setLastTransaction(txn);
            setShowReceipt(true);
            setPayAmount('');
    
            alert(`Simulated payment of $${amount.toFixed(2)} successful!`);
    
        } catch (error) {
            console.error('Payment simulation error:', error);
            alert('Payment simulation failed - check console for details');
        }
    };

    const handleTopUp = () => {
        const amount = parseFloat(topUpAmount);
        if (isNaN(amount) || amount <= 0) {
            alert('Enter a valid top-up amount.');
            return;
        }

        setWalletBalance(prev => prev + amount);

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
    };

    return (
        <div className="payment-container">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <h2>UWI Metro</h2>
                </div>
                <div className="sidebar-menu">
                    <ul>
                        <li><a href="/dashboard" className="menu-item">🏠 Dashboard</a></li>
                        <li><a href="/schedule" className="menu-item">🚌 Schedule</a></li>
                        <li><a href="/payment" className="menu-item">💳 Payment</a></li>
                        <li><a href="/profile" className="menu-item">👤 Profile</a></li>
                    </ul>
                </div>
                <div className="sidebar-footer">
                    <button className="logout-btn">Logout</button>
                </div>
            </aside>

            <main className="main-content">
                <h1 className="payment-title">💳 Payment Page</h1>

                <div className="payment-main-content">
                    <div className="payment-row">
                        <div className="payment-card">
                            <h2>Make a Payment</h2>
                            <input
                                type="number"
                                placeholder="Enter amount"
                                value={payAmount}
                                onChange={(e) => setPayAmount(e.target.value)}
                                className="payment-input"
                            />
                            <select
                                value={payMethod}
                                onChange={(e) => setPayMethod(e.target.value)}
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
                            <h2>Wallet Balance: ${walletBalance.toFixed(2)}</h2>
                            <input
                                type="number"
                                placeholder="Amount to add"
                                value={topUpAmount}
                                onChange={(e) => setTopUpAmount(e.target.value)}
                                className="payment-input"
                            />
                            <select
                                value={topUpMethod}
                                onChange={(e) => setTopUpMethod(e.target.value)}
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
                                {transactions.map((txn, index) => (
                                    <li key={index} className="transaction-item">
                                        <strong>{txn.type}</strong> of ${txn.amount.toFixed(2)} via{' '}
                                        {txn.method} on {txn.date}
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
                                You made a <strong>{lastTransaction?.type}</strong> of{' '}
                                <strong>${lastTransaction?.amount.toFixed(2)}</strong> using{' '}
                                <strong>{lastTransaction?.method}</strong> on{' '}
                                <strong>{lastTransaction?.date}</strong>.
                            </p>
                            <button
                                className="payment-button"
                                onClick={() => setShowReceipt(false)}
                            >
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
