// server.js (Conceptual Backend for Productivity Tracker)

const express = require('express');
const http = require('http');
const cors = require('cors');
const bodyParser = require('body-parser'); // For parsing JSON bodies

// --- DATABASE IMPORTS (Choose one and install via npm) ---
// For MongoDB (using Mongoose):
// const mongoose = require('mongoose');
// For PostgreSQL (using pg):
// const { Pool } = require('pg');

const app = express();
const server = http.createServer(app);

// --- CORS Configuration ---
// IMPORTANT: Adjust 'origin' to the actual domain where your dashboard will run,
// or where your Chrome Extension might send requests from (though typically extensions
// send from 'chrome-extension://<extension-id>', which requires special handling or a proxy).
// For development, '*' can be used, but is NOT secure for production.
app.use(cors({
    origin: '*', // Allow all origins for development. Be specific in production.
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json()); // To parse JSON request bodies

const PORT = process.env.PORT || 3002; // Backend server will run on port 3002

// --- DATABASE CONNECTION (Conceptual - Uncomment and configure) ---

// For MongoDB (using Mongoose):
/*
mongoose.connect('mongodb://localhost:27017/productivity_tracker', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Define Mongoose Schemas (simplified examples)
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true }
});
const User = mongoose.model('User', UserSchema);

const SiteClassificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    domain: { type: String, required: true },
    type: { type: String, enum: ['productive', 'unproductive'], required: true }
});
const SiteClassification = mongoose.model('SiteClassification', SiteClassificationSchema);

const TimeLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    domain: { type: String, required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    durationMs: { type: Number, required: true, default: 0 }
});
const TimeLog = mongoose.model('TimeLog', TimeLogSchema);
*/

// For PostgreSQL (using pg):
/*
const pool = new Pool({
    user: 'your_pg_user',
    host: 'localhost',
    database: 'productivity_tracker',
    password: 'your_pg_password',
    port: 5432,
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

async function initializePgDb() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL
            );
            CREATE TABLE IF NOT EXISTS site_classifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                domain VARCHAR(255) NOT NULL,
                type VARCHAR(50) NOT NULL,
                UNIQUE(user_id, domain)
            );
            CREATE TABLE IF NOT EXISTS time_logs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                domain VARCHAR(255) NOT NULL,
                log_date VARCHAR(10) NOT NULL, -- YYYY-MM-DD
                duration_ms BIGINT DEFAULT 0,
                UNIQUE(user_id, domain, log_date)
            );
        `);
        console.log('PostgreSQL tables ensured.');
    } catch (err) {
        console.error('Error initializing PostgreSQL:', err);
    }
}
initializePgDb();
*/

// --- API Endpoints (Conceptual - requires authentication/user context) ---

// Example: Endpoint for Chrome Extension to send daily tracking data
app.post('/api/track-time', async (req, res) => {
    // In a real app, you'd authenticate the user and get their ID
    const userId = 'some_user_id'; // Placeholder for authenticated user ID

    const { date, domain, durationMs } = req.body; // Data sent from extension

    if (!date || !domain || typeof durationMs !== 'number') {
        return res.status(400).json({ message: 'Missing required data.' });
    }

    console.log(`Received tracking data for user ${userId}: ${domain} on ${date} for ${durationMs}ms`);

    // --- DATABASE SAVE LOGIC (Conceptual) ---
    try {
        // For MongoDB:
        /*
        await TimeLog.findOneAndUpdate(
            { userId: userId, domain: domain, date: date },
            { $inc: { durationMs: durationMs } }, // Increment duration
            { upsert: true, new: true } // Create if not exists, return updated doc
        );
        */
        // For PostgreSQL:
        /*
        await pool.query(
            `INSERT INTO time_logs (user_id, domain, log_date, duration_ms)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id, domain, log_date) DO UPDATE
             SET duration_ms = time_logs.duration_ms + EXCLUDED.duration_ms;`,
            [userId, domain, date, durationMs]
        );
        */
        res.status(200).json({ message: 'Time tracking data saved successfully.' });
    } catch (error) {
        console.error('Error saving time tracking data:', error);
        res.status(500).json({ message: 'Failed to save time tracking data.' });
    }
});

// Example: Endpoint for dashboard to get analytics data
app.get('/api/analytics/:userId', async (req, res) => {
    const userId = req.params.userId; // In a real app, ensure this user is authenticated

    // --- DATABASE FETCH LOGIC (Conceptual) ---
    try {
        // For MongoDB:
        /*
        const timeLogs = await TimeLog.find({ userId: userId });
        const classifications = await SiteClassification.find({ userId: userId });
        */
        // For PostgreSQL:
        /*
        const timeLogsResult = await pool.query('SELECT * FROM time_logs WHERE user_id = $1;', [userId]);
        const timeLogs = timeLogsResult.rows;
        const classificationsResult = await pool.query('SELECT * FROM site_classifications WHERE user_id = $1;', [userId]);
        const classifications = classificationsResult.rows;
        */

        // Process data to generate reports (e.g., weekly productivity)
        const analyticsData = {
            // Example: aggregate time logs by date and classify
            totalTime: 123456789, // Placeholder
            productiveTime: 98765432, // Placeholder
            unproductiveTime: 12345678, // Placeholder
            // ... more detailed analytics
        };

        res.status(200).json(analyticsData);
    } catch (error) {
        console.error('Error fetching analytics data:', error);
        res.status(500).json({ message: 'Failed to fetch analytics data.' });
    }
});

// Start the server
server.listen(PORT, () => {
  console.log(`Backend server listening on port ${PORT}`);
});
