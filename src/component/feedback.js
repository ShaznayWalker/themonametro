import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaStar, FaSmile, FaComment, FaHandsHelping, FaBus, FaMusic, FaShieldAlt, FaUserAlt, FaClock, FaEnvelope, } from "react-icons/fa";

import axios from "axios";
import "../style/feedback.css";
import '../style/reset.css';

export default function Feedback() {
    const navigate = useNavigate();
    const token = localStorage.getItem("userToken");
    const user = JSON.parse(localStorage.getItem("userData")) || {};
    const isAdmin = user?.role === "admin";

    const [feedbackList, setFeedbackList] = useState([]);
    const [message, setMessage] = useState("");
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [selectedSuggestions, setSelectedSuggestions] = useState([]);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(true);

    const suggestionOptions = [
        { text: "Clean Bus", icon: <FaBus className="suggestion-icon" /> },
        { text: "Appropriate Music", icon: <FaMusic className="suggestion-icon" /> },
        { text: "Safe Ride", icon: <FaShieldAlt className="suggestion-icon" /> },
        { text: "Friendly Driver", icon: <FaUserAlt className="suggestion-icon" /> },
        { text: "Punctuality", icon: <FaClock className="suggestion-icon" /> },
    ];

    const userMessage = "✨ Your feedback helps us create better experiences for everyone! 💖";
    const handleLogout = () => {
        localStorage.removeItem("userToken");
        localStorage.removeItem("userData");
        navigate("/");
    };

    useEffect(() => {
        if (isAdmin) {
            axios.get("http://localhost:5000/api/feedback", {
                headers: { Authorization: `Bearer ${token}` }
            })
                .then(res => {
                    setFeedbackList(res.data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error(err);
                    setLoading(false);
                });
        } else {
            setLoading(false);
        }
    }, [isAdmin, token]);

    const handleSuggestionToggle = (suggestion) => {
        setSelectedSuggestions(prev =>
            prev.includes(suggestion)
                ? prev.filter(s => s !== suggestion)
                : [...prev, suggestion]
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");  // Add this line to clear previous messages

        // Add this validation block
        if (rating < 1 || rating > 5) {
            setError("⚠️ Please select a rating between 1 and 5 stars");
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        const fullMessage = selectedSuggestions.length > 0
            ? `${message} | Quick Feedback: ${selectedSuggestions.join(', ')}`
            : message;

        try {
            await axios.post(
                "http://localhost:5000/api/feedback",
                { message: fullMessage, rating },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            
            setMessage("");
            setRating(0);
            setSelectedSuggestions([]);

            
            setSuccess("Thank you for your feedback! We'll use it to improve 🚀");
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setTimeout(() => setSuccess(""), 5000);

        } catch (err) {
            setError(err.response?.data?.error || "Oops! Something went wrong. Please try again.");
            window.scrollTo({ top: 0, behavior: 'smooth' });  
        }
    };

    if (loading) {
        return (
            <div className="feedback-loading">
                <div className="loading-spinner"></div>
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <div className="feedback-container">
            <aside className="feedback-sidebar">
                <div className="feedback-sidebar-header">
                    <h2>🚌 The Mona Metro</h2>
                </div>

                <nav className="feedback-sidebar-menu">
                    <ul>
                        <li>
                            <Link to="/dashboard" className="feedback-menu-item">
                                <i className="fas fa-home"></i>
                                <span>Dashboard</span>
                            </Link>
                        </li>
                        <li>
                            <Link to="/profile" className="feedback-menu-item">
                                <i className="fas fa-user"></i>
                                <span>Profile</span>
                            </Link>
                        </li>
                        <li>
                            <Link to="/schedule" className="feedback-menu-item">
                                <i className="fas fa-calendar-alt"></i>
                                <span>View Bus Schedule</span>
                            </Link>
                        </li>
                        {!isAdmin && (
                            <li>
                                <Link to="/feedback" className="feedback-menu-item active">
                                    <i className="fas fa-comment"></i>
                                    <span>Feedback</span>
                                </Link>
                            </li>
                        )}
                        {isAdmin && (
                            <li>
                                <Link to="/admin/feedback" className="feedback-menu-item active">
                                    <i className="fas fa-list"></i>
                                    <span>View Feedback</span>
                                </Link>
                            </li>
                        )}
                    </ul>
                </nav>

                <div className="feedback-sidebar-footer">
                    <button onClick={handleLogout} className="feedback-logout-btn">
                        <i className="fas fa-sign-out-alt"></i>
                        Logout
                    </button>
                </div>
            </aside>

            <main className="feedback-main-content">
                <header className="content-header">
                    <div className="header-left">
                        <h1>{isAdmin ? "📝 Customer Feedback" : "💬 Share Your Feedback"}</h1>
                        <p>{isAdmin ? "All user feedback submissions" : "We value your experience"}</p>
                    </div>
                </header>
                <div className="notification-container">
                    {success && (
                        <div className="success-message">
                            ✅ {success}
                            <button
                                onClick={() => setSuccess("")}
                                className="close-notification"
                            >
                                ×
                            </button>
                        </div>
                    )}
                    {error && (
                        <div className="error-message">
                            ⚠️ {error}
                            <button
                                onClick={() => setError("")}
                                className="close-notification"
                            >
                                ×
                            </button>
                        </div>
                    )}
                </div>
                <div className="feedback-content">
                    {isAdmin ? (
                        feedbackList.length > 0 ? (
                            feedbackList.map((feedback) => (
                                <div
                                    key={feedback.feedback_id}
                                    className="feedback-card"
                                    data-rating={feedback.rating}
                                >
                                    {/* Header: Name + Email */}
                                    <div className="feedback-header">
                                        <div className="feedback-user">
                                            <FaUserAlt className="feedback-icon" />
                                            <span className="feedback-name">
                                                {feedback.firstname} {feedback.lastname}
                                            </span>
                                        </div>
                                        <div className="feedback-email">
                                            <FaEnvelope className="feedback-icon" />
                                            <a
                                                href={`mailto:${feedback.email}`}
                                                className="feedback-email-link"
                                            >
                                                {feedback.email}
                                            </a>
                                        </div>
                                    </div>

                                    {/* Star Rating */}
                                    <div className="feedback-rating">
                                        {[...Array(5)].map((_, i) => (
                                            <FaStar
                                                key={i}
                                                color={i < feedback.rating ? "#FFD166" : "#e0e0e0"}
                                                size={18}
                                            />
                                        ))}
                                    </div>

                                    
                                    <div className="feedback-body">
                                        <FaComment className="feedback-icon" />
                                        <p className="feedback-message">{feedback.message}</p>
                                    </div>

                                   
                                    <div className="feedback-meta">
                                        🕒 {new Date(feedback.created_at).toLocaleString()}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="no-feedback">📭 No feedback submissions yet</div>
                        )
                    ) : (
                        <form className="feedback-form" onSubmit={handleSubmit}>
                            <div className="message">{userMessage}</div>

                            {success && <div className="success-message">{success}</div>}
                            {error && <div className="error-message">⚠️ {error}</div>}

                            <div className="form-field-group">
                                <div className="form-group">
                                    <label>
                                        <FaSmile className="form-icon" /> Rate Your Experience
                                    </label>
                                    <div className="star-rating">
                                        {[1, 2, 3, 4, 5].map((value) => (
                                            <FaStar
                                                key={value}
                                                className="star-icon"
                                                size={32}
                                                color={(hoverRating || rating) >= value ? "#FFD166" : "#e0e0e0"}
                                                onMouseEnter={() => setHoverRating(value)}
                                                onMouseLeave={() => setHoverRating(0)}
                                                onClick={() => setRating(value)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="form-field-group">
                                <div className="form-group">
                                    <label htmlFor="message">
                                        <FaComment className="form-icon" /> Detailed Feedback (Optional)
                                    </label>
                                    <textarea
                                        id="message"
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder="Share your experience with us..."
                                    />
                                </div>
                            </div>

                            <div className="form-field-group quick-feedback-section">
                                <div className="form-group">
                                    <label>
                                        <FaHandsHelping className="form-icon" /> Quick Feedback (Select Multiple)
                                    </label>
                                    <div className="suggestion-container">
                                        <div className="suggestion-buttons">
                                            {suggestionOptions.map(({ text, icon }) => (
                                                <button
                                                    type="button"
                                                    key={text}
                                                    className={`suggestion-btn ${selectedSuggestions.includes(text) ? 'selected' : ''
                                                        }`}
                                                    onClick={() => handleSuggestionToggle(text)}
                                                >
                                                    {icon} {text}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="submit-button-container">
                                <button type="submit" className="submit-button">
                                    Submit Feedback 🌟
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </main>
        </div>
    );
}