const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const bcrypt = require("bcryptjs");

const app = express();
app.use(express.json());
app.use(cors());

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root", 
    database: "Customers"
});

db.connect((err) => {
    if (err) {
        console.error("Database connection failed:", err);
    } else {
        console.log("Connected to database");
    }
});

app.post("/signup", async (req, res) => {
    const { firstname, lastname, email, password } = req.body;

    const checkEmailQuery = "SELECT * FROM users WHERE email = ?";
    db.query(checkEmailQuery, [email], async (err, result) => {
        if (err) return res.status(500).json({ message: "Error checking email" });
        if (result.length > 0) {
            return res.status(400).json({ message: "Email already registered" });
        }

        const hashedPassword = await bcrypt.hash(password, 10); 

        const query = "INSERT INTO users (firstname, lastname, email, password) VALUES (?, ?, ?, ?)";
        db.query(query, [Firstname, Lastname, email, hashedPassword], (err, result) => {
            if (err) return res.status(500).json({ message: "Error signing up" });
            res.json({ message: "User registered successfully" });
        });
    });
});

app.listen(5000, () => console.log("Server running on port 5000"));
