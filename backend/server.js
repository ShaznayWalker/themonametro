const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());
app.use(cors());

// Database connection
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("Database table verified/created");
  } catch (error) {
    console.error("Database initialization error:", error);
    throw error;
  }
}

// Signup route
app.post("/api/signup", async (req, res) => {
  const { firstname, lastname, username, email, password, role } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `
      INSERT INTO users (firstname, lastname, username, email, password, role)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, firstname, lastname, username, email, role
    `;
    const values = [firstname, lastname, username, email.toLowerCase(), hashedPassword, role || 'user'];
    const result = await pool.query(query, values);

    const user = result.rows[0];
    res.status(201).json({
      id: user.id,
      firstname: user.firstname,
      lastname: user.lastname,
      username: user.username,
      email: user.email,
      role: user.role
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error signing up user' });
  }
});

// Signin route
app.post("/api/signin", async (req, res) => {
  const { email, password } = req.body;

  try {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email.toLowerCase()]);
    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });

    res.json({
      token,
      user: {
        id: user.id,
        firstname: user.firstname,
        lastname: user.lastname,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error signing in user' });
  }
});

// Get active buses route (only for authenticated users)
app.get('/api/buses/active', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT
        route_id           AS "busId",
        origin || ' → ' || destination AS "busNumber",   -- e.g. "Kingston → Montego Bay"
        via                AS "currentRoute",
        NULL               AS "driverName",               -- Placeholder for driver name
        status,
        (CURRENT_DATE + departure_time::interval) AS "nextDeparture", -- Convert departure time to timestamp
        NULL               AS "lastMaintenance"          -- Placeholder for last maintenance date
      FROM buses
      WHERE status = 'active'
    `;

    const { rows } = await pool.query(query);
    res.json({
      count: rows.length,  // Send the count of active buses
      buses: rows          // Send the bus details
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch active buses' });
  }
});

// Get upcoming trips for a user (only for authenticated users)
app.get('/api/bookings/upcoming', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const query = `
      SELECT
        b.booking_id AS "bookingId",
        b.start_location AS "startLocation",
        b.end_location AS "endLocation",
        b.departure_time AS "departureTime",
        b.status
      FROM bookings b
      WHERE b.user_id = $1 AND b.departure_time > NOW()
      ORDER BY b.departure_time ASC
    `;
    const { rows } = await pool.query(query, [userId]);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching upcoming trips' });
  }
});

// Get recent bookings for a user (only for authenticated users)
app.get('/api/bookings/recent', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const query = `
      SELECT
        b.booking_id AS "bookingId",
        b.route_name AS "routeName",
        b.seats,
        b.booking_date AS "bookingDate",
        b.status
      FROM bookings b
      WHERE b.user_id = $1
      ORDER BY b.booking_date DESC
      LIMIT 5
    `;
    const { rows } = await pool.query(query, [userId]);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching recent bookings' });
  }
});

// User profile route (only for authenticated users)
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



// Initialize and start the server
pool.connect()
  .then(() => {
    console.log("Connected to PostgreSQL");
    return initializeDatabase();
  })
  .then(() => {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Database connection/initialization error", err);
    process.exit(1);
  });
