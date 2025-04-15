import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import logo from '../images/logo.png';
import '../style/home.css';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="home-container">
      <header className="main-header">
        <div className="header-content">
          <Link to="/" className="logo-link">
            <img src={logo} alt="UWI Logo" className="header-logo" />
            <h1 className="site-title">UWI MONA Metro</h1>
          </Link>
          
          <nav className="main-nav">
            <ul className="nav-list">
              <li className="nav-item"><Link to="/" className="nav-link">Home</Link></li>
              <li className="nav-item"><Link to="/schedule" className="nav-link">Schedule</Link></li>
              <li className="nav-item"><Link to="/about" className="nav-link">About</Link></li>
              <li className="nav-item"><Link to="/signin" className="nav-link">Login</Link></li>
              <li className="nav-item"><Link to="/signup" className="nav-link">Sign Up</Link></li>

            </ul>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="hero-section">
        <div className="hero-content">
          <h2 className="hero-title">Welcome Pelicans</h2>
          <p className="hero-subtitle">🚌 The Mona Metro is Now Available. Sign Up Today!</p>
          <button onClick={() => navigate('/signup')} className="cta-button">
            Get Started
          </button>
        </div>
      </main>
    </div>
  );
};

export default Home;