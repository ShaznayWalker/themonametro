const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());
app.use(cors());

// Database configuration
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "customer",
  password: "lab4_user",
  port: 5432,
});

const JWT_SECRET = "your_very_secure_secret_key";

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Database initialization
async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        firstname VARCHAR(100) NOT NULL,
        lastname VARCHAR(100) NOT NULL,
        username VARCHAR(100) NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL UNIQUE CHECK (email = LOWER(email)),
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'user',
        wallet_balance NUMERIC(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS buses (
        route_id SERIAL PRIMARY KEY,
        origin VARCHAR(255) NOT NULL,
        destination VARCHAR(255) NOT NULL,
        via VARCHAR(255) NOT NULL,
        departure_time TIME NOT NULL,
        arrival_time TIME NOT NULL,
        cost NUMERIC(10,2) NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS feedback (
        feedback_id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id),
        message TEXT NOT NULL,
        rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        booking_id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id),
        bus_id INT REFERENCES buses(route_id),
        seats INT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        departure_time TIMESTAMP NOT NULL,
        start_location VARCHAR(255) NOT NULL,
        end_location VARCHAR(255) NOT NULL
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS bus_updates (
        update_id SERIAL PRIMARY KEY,
        bus_id INT REFERENCES buses(route_id),
        driver_id INT REFERENCES users(id),
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

      

    console.log("Database tables initialized");
  } catch (error) {
    console.error("Database initialization error:", error);
    throw error;
  }
}

// User registration
app.post("/api/signup", async (req, res) => {
  const { firstname, lastname, username, email, password, role } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (firstname, lastname, username, email, password, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, firstname, lastname, username, email, role`,
      [firstname, lastname, username, email.toLowerCase(), hashedPassword, role || 'user']
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error signing up user' });
  }
});

// User login
app.post("/api/signin", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
    
    res.json({
      token,
      user: {
        id: user.id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error signing in' });
  }
});

// Feedback endpoints
app.post('/api/feedback', authenticateToken, async (req, res) => {
  if (req.user.role === 'admin') {
    return res.status(403).json({ error: 'Admins cannot submit feedback' });
  }

  try {
    const userResult = await pool.query(
      'SELECT firstname, lastname FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { firstname, lastname } = userResult.rows[0];
    const fullMessage = `${req.body.message} | Submitted by: ${firstname} ${lastname}`;

    const { rows } = await pool.query(
      `INSERT INTO feedback (user_id, message, rating)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.user.id, fullMessage, req.body.rating]
    );
    
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save feedback' });
  }
});

app.get('/api/feedback', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized access' });
  }

  try {
    const { rows } = await pool.query(`
      SELECT 
        f.feedback_id,
        f.message,
        f.rating,
        f.created_at,
        u.firstname,
        u.lastname,
        u.email
      FROM feedback f
      JOIN users u ON f.user_id = u.id
      ORDER BY f.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// Protected profile endpoint
app.get('/api/profile', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    // Update the query to use `joindate` instead of `joinDate`
    const query = 'SELECT id, firstname, lastname, username, email, role, created_at AS joindate FROM users WHERE id = $1';
    const result = await pool.query(query, [userId]);
    const user = result.rows[0];


    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Include `joindate` in the response
    res.json({
      id: user.id,
      firstname: user.firstname,
      lastname: user.lastname,
      username: user.username,
      email: user.email,
      role: user.role,
      joindate: user.joindate // Ensure joindate is returned here
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching user profile' });
  }
});



app.get('/api/buses/active', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT
        route_id AS "busId",
        origin || ' → ' || destination AS "busNumber",
        via AS "currentRoute",
        status,
        (CURRENT_DATE + departure_time::interval) AS "nextDeparture"
      FROM buses
      WHERE status = 'active'
    `;

    const { rows } = await pool.query(query);
    
    // For non-admin users, remove the count and null values
    const response = req.user.role === 'admin' 
      ? { count: rows.length, buses: rows }
      : { buses: rows.map(bus => ({
          busId: bus.busId,
          busNumber: bus.busNumber,
          currentRoute: bus.currentRoute,
          nextDeparture: bus.nextDeparture
        })) };

    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch active buses' });
  }
});


app.get('/api/bus-schedule', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        route_id AS id,
        origin AS pickup,
        destination,
        departure_time AS time,
        via AS route,
        cost
      FROM buses
      WHERE status = 'active'
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});
// Add these endpoints after the buses endpoint
// Bookings endpoints
app.get('/api/bookings/upcoming', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM bookings
      WHERE user_id = $1
      AND departure_time > NOW()
      ORDER BY departure_time ASC
      LIMIT 3
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch upcoming bookings' });
  }
});

app.get('/api/bookings/recent', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM bookings
      WHERE user_id = $1
      ORDER BY booking_date DESC
      LIMIT 5
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch recent bookings' });
  }
});

// Add to server.js after the existing endpoints
// Submit bus update
app.post('/api/bus-updates', authenticateToken, async (req, res) => {
  try {
    const { busId, message } = req.body;
    
    if (!busId || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user has driver privileges
    const user = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (!user.rows[0] || user.rows[0].role !== 'driver') {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    const { rows } = await pool.query(
      `INSERT INTO bus_updates (bus_id, message, driver_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [busId, message, req.user.id]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save update' });
  }
});

// Get recent bus updates
app.get('/api/bus-updates', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        bu.update_id,
        bu.bus_id,
        bu.message,
        bu.created_at,
        u.firstname || ' ' || u.lastname AS driver_name
      FROM bus_updates bu
      JOIN users u ON bu.driver_id::text = u.id::text
      ORDER BY bu.created_at DESC
      LIMIT 50
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch updates' });
  }
});

// Replace the /api/payments endpoint with this mock version
app.post('/api/payments', authenticateToken, (req, res) => {
  // Simulate successful payment processing
  console.log('[Simulation] Payment processed:', req.body);
  res.json({
    simulated: true,
    message: `Simulated payment of $${req.body.amount.toFixed(2)} successful`,
    booking: {
      id: Math.floor(Math.random() * 1000),
      ...req.body
    }
  });
});

app.post('/api/wallet/topup', authenticateToken, (req, res) => {
  const { amount } = req.body;
  const simulatedBalance = Math.random() * 1000 + 500; // Random balance for demo
  
  console.log('[Simulation] Wallet top-up:', amount);
  res.json({
    simulated: true,
    new_balance: simulatedBalance,
    message: `Simulated top-up of $${amount.toFixed(2)} complete`
  });
});
// Server startup
pool.connect()
  .then(() => {
    console.log("Connected to PostgreSQL");
    return initializeDatabase();
  })
  .then(() => {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error("Startup error:", err);
    process.exit(1);
  });