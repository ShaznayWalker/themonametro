const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const bcrypt = require("bcryptjs");

const app = express();
app.use(express.json());
app.use(cors());

// Database connection
const pool = new Pool({
  user: "postgres", 
  host: "localhost",
  database: "signupdb",
  password: "root",
  port: 5432, 
});

// Test DB connection
pool.connect()
  .then(() => console.log("Connected to PostgreSQL"))
  .catch((err) => console.error("Database connection error", err));

// Signup endpoint
app.post("/signup", async (req, res) => {
  const { firstname, lastname, username, email, password } = req.body;

  // Check if passwords match
  if (password !== req.body.confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }

  // Hash the password before saving it to the database
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    // Check if email already exists
    const emailCheck = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Check if username already exists
    const usernameCheck = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    if (usernameCheck.rows.length > 0) {
      return res.status(400).json({ message: "Username already exists" });
    }

    // Insert new user into the database
    const result = await pool.query(
      "INSERT INTO users (firstname, lastname, username, email, password) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [firstname, lastname, username, email, hashedPassword]
    );
    
    res.status(201).json({ message: "User registered successfully", user: result.rows[0] });
  } catch (error) {
    console.error(error); // Log the error
    res.status(500).json({ message: "Error signing up" });
  }
});

// Ensure the server listens on port 5000
app.listen(5000, () => {
  console.log("Server running on port 5000");
});
