const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());
const corsOptions = {
  origin: [
    'http://localhost:3000', 
    'http://localhost:3001'  
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));


app.use((req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Expose-Headers', 'Authorization');
  next();
});

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

    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        payment_id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id),
        amount NUMERIC(10,2) NOT NULL,
        method VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const busesCount = await pool.query('SELECT COUNT(*) FROM buses');
    if (parseInt(busesCount.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO buses 
          (route_id, origin, destination, via, departure_time, arrival_time, cost)
        VALUES
          (1, 'Spanish Town, LOJ Shopping Centre', 'UWI- Bus Bay/ Commuters Lounge', 'Highway 2000', '08:00:00', '12:00:00', 300.00),
          (2, 'LOJ Shopping Centre, Spanish Town', 'UWI Commuters Lounge', 'Highway 2000', '05:30:00', '06:30:00', 300.00),
          (3, 'Christian Gardens, Gregory Park', 'UWI Commuters Lounge', 'Gregory Park Road', '05:30:00', '06:30:00', 300.00),
          (4, 'Shoppers Fair, Greater Portmore 17', 'UWI Commuters Lounge', 'Portmore Toll Road', '05:30:00', '06:30:00', 300.00),
          (5, 'UWI Commuters Lounge', 'LOJ Shopping Centre, Spanish Town', 'Highway 2000', '16:30:00', '17:30:00', 300.00),
          (6, 'UWI Commuters Lounge', 'Gregory Park Christian Gardens', 'Highway 2000', '16:30:00', '17:30:00', 300.00),
          (7, 'UWI Commuters Lounge', 'Gregory Park Christian Gardens', 'Highway 2000', '19:30:00', '20:30:00', 300.00),
          (8, 'UWI Commuters Lounge', 'Greater Portmore 17 Shoppers Fair', 'Portmore Toll Road', '16:30:00', '17:30:00', 300.00),
          (9, 'UWI Commuters Lounge', 'Greater Portmore 20 Shoppers Fair', 'Edgewater', '19:30:00', '20:30:00', 300.00);
      `);
    }

    console.log("Database tables initialized");
  } catch (error) {
    console.error("Database initialization error:", error);
    throw error;
  }
}

const validateSignup = (req, res, next) => {
  const { email, password } = req.body;
  
  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Password complexity
  const passwordRegex = /^(?=.*[A-Z]).{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({ 
      error: 'Password must be 8+ characters with at least one uppercase letter'
    });
  }

  next();
};
// User registration
app.post("/api/signup", async (req, res) => {
  const { firstname, lastname, username, email, password, role } = req.body;

  // Validate role
  const validRoles = ['user', 'admin', 'driver'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid user role' });
  }

  // Validate password complexity
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR username = $2',
      [email.toLowerCase(), username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email or username already exists' });
    }

    // Insert new user
    const result = await pool.query(
      `INSERT INTO users 
        (firstname, lastname, username, email, password, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, firstname, lastname, username, email, role`,
      [
        firstname,
        lastname,
        username,
        email.toLowerCase(),
        hashedPassword,
        role || 'user'
      ]
    );
    
    res.status(201).json({
      success: true,
      user: result.rows[0],
      message: `User registered successfully as ${role}`
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Registration failed',
      details: error.message
    });
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

// view feedback from user
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

// view feedback from user
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

// profile 
app.get('/api/profile', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const query = 'SELECT id, firstname, lastname, username, email, role, created_at AS joindate FROM users WHERE id = $1';
    const result = await pool.query(query, [userId]);
    const user = result.rows[0];


    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      firstname: user.firstname,
      lastname: user.lastname,
      username: user.username,
      email: user.email,
      role: user.role,
      joindate: user.joindate 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching user profile' });
  }
});


// check for active buses
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

// bus- schedule
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


// Upcoming bookings
app.get('/api/bookings/upcoming', authenticateToken, async (req, res) => {
  
  try {
    let rows, params;
    if (req.user.role === 'admin') {
      const query = `
        SELECT
          b.booking_id,
          u.firstname || ' ' || u.lastname AS user_name,
          u.email,
          b.start_location,
          b.end_location,
          b.seats,
          b.status,
          b.departure_time
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        ORDER BY b.departure_time ASC
        LIMIT 10
      `;
      ({ rows } = await pool.query(query));
    } else {
      const query = `
        SELECT *
        FROM bookings
        WHERE user_id = $1
          AND departure_time > NOW()
        ORDER BY departure_time ASC
        LIMIT 3
      `;
      ({ rows } = await pool.query(query, [req.user.id]));
    }
    return res.json(rows);
  } catch (err) {
    console.error('Error in /api/bookings/upcoming:', err);
    return res.status(500).json({ error: 'Failed to fetch upcoming bookings' });
  }
});

// Recent bookings
app.get('/api/bookings/recent', authenticateToken, async (req, res) => {
  try {
    let rows;
    if (req.user.role === 'admin') {
      ({ rows } = await pool.query(`
        SELECT
          b.booking_id,
          b.user_id,
          u.firstname || ' ' || u.lastname AS user_name,
          u.email,
          b.start_location,
          b.end_location,
          b.seats,
          b.status,
          b.booking_date,
          b.departure_time
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        ORDER BY b.booking_date DESC
        LIMIT 10
      `));
    } else {
      ({ rows } = await pool.query(`
        SELECT *
        FROM bookings
        WHERE user_id = $1
        ORDER BY booking_date DESC
        LIMIT 5
      `, [req.user.id]));
    }
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch recent bookings' });
  }
});


// Submit bus update
app.post('/api/bus-updates', authenticateToken, async (req, res) => {
  try {
    const { busId, message } = req.body;
    
    if (!busId || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    
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

// recent bus updates
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


// payments
app.post('/api/payments', authenticateToken, async (req, res) => {
  const { amount, method, trips } = req.body;
  const userId = req.user.id;

  if (!amount || !method || !Array.isArray(trips) || trips.length === 0) {
    return res.status(400).json({ error: 'Missing payment data' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    
    const payRes = await client.query(
      `INSERT INTO payments (user_id, amount, method)
       VALUES ($1, $2, $3)
       RETURNING payment_id, created_at`,
      [userId, amount, method]
    );
    const paymentId = payRes.rows[0].payment_id;

  
    const bookingPromises = trips.map(trip => {
      return client.query(
        `INSERT INTO bookings
           (user_id, bus_id, seats, status, departure_time, start_location, end_location)
         VALUES ($1,$2,$3,'confirmed',$4,$5,$6)`,
        [
          userId,
          trip.busId,
          trip.seats || 1,
          trip.departureTime,
          trip.startLocation,
          trip.endLocation
        ]
      );
    });
    await Promise.all(bookingPromises);

    await client.query('COMMIT');
    res.json({
      success: true,
      paymentId,
      message: `Payment of $${amount.toFixed(2)} stored`
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error in /api/payments:', err);
    res.status(500).json({ error: 'Payment processing failed' });
  } finally {
    client.release();
  }
});

// top‑up 
app.post('/api/wallet/topup', authenticateToken, async (req, res) => {
  const { amount } = req.body;
  const userId = req.user.id;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid top‑up amount' });
  }

  try {
    const result = await pool.query(
      `UPDATE users
         SET wallet_balance = wallet_balance + $1
       WHERE id = $2
       RETURNING wallet_balance`,
      [amount, userId]
    );
    const newBalance = result.rows[0].wallet_balance;
    res.json({
      success: true,
      newBalance,
      message: `Wallet topped up by $${amount.toFixed(2)}`
    });
  } catch (err) {
    console.error('Error in /api/wallet/topup:', err);
    res.status(500).json({ error: 'Top‑up failed' });
  }
});

//payment History
app.get('/api/payments/history', authenticateToken, async (req, res) => {
  try {
    let rows;
    if (req.user.role === 'admin') {
      ({ rows } = await pool.query(`SELECT * FROM payments ORDER BY created_at DESC`));
    } else {
      ({ rows } = await pool.query(
        `SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC`,
        [req.user.id]
      ));
    }
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
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