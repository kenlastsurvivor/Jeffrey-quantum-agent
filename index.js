
const express = require('express');
const { google } = require('googleapis');
const axios = require('axios');
const app = express();

// Middleware
app.use(express.json());

// Google Sheets setup
const auth = new google.auth.GoogleAuth({
  keyFile: 'credentials.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = '1-Dm4DE7oJv1GQ538gghJMVsHLDVETqUCJIDgc8LVdGA';
const RANGE = 'Sheet1!A:J';

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ status: 'OK', message: 'API is working' });
});

// API endpoints
app.post('/api/sheets', async (req, res) => {
  // Validate required fields
  const requiredFields = ['email', 'task', 'date', 'status'];
  for (const field of requiredFields) {
    if (!req.body[field]) {
      return res.status(400).json({ 
        success: false, 
        error: `Missing required field: ${field}` 
      });
    }
  }
  try {
    const { email, task, date, status, points, level, referrals, plan, details, quantumScore } = req.body;
    
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[email, task, date, status, points, level, referrals, plan, details, quantumScore]]
      }
    });

    res.json({ success: true, message: 'Data added successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Check pending tasks every 5 minutes
setInterval(async () => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE
    });

    const rows = response.data.values || [];
    
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][3] === 'En attente') {
        // Send to IBM Quantum
        const quantumResponse = await axios.post('https://api.quantum-computing.ibm.com/runtime/jobs', {
          program_id: 'sampler',
          backend: 'ibmq_manila'
        }, {
          headers: {
            'Authorization': 'be1f46bbb84ca24d7402b73d8657448d8ac778c48f287bcb4c4bc48fa6a3dc0b3e2645a1e7a4e22c2543cc31b51f3b3e68e8308a4e1c0a7dc31c9839ccda123b'
          }
        });

        // Update status to Done
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `Sheet1!D${i + 1}`,
          valueInputOption: 'USER_ENTERED',
          resource: {
            values: [['Done']]
          }
        });
      }
    }
  } catch (error) {
    console.error('Error in interval check:', error);
  }
}, 5 * 60 * 1000);

// API Documentation for Bolt integration
/**
 * POST /api/sheets
 * Endpoint to create a new quantum computing task
 * 
 * Request body example:
 * {
 *   "email": "user@example.com",
 *   "password": "userpass",
 *   "task": "quantum_task_1",
 *   "date": "2025-03-20",
 *   "status": "En attente",
 *   "points": "0",
 *   "level": "Beginner",
 *   "referrals": "0",
 *   "plan": "Gratuit",
 *   "details": "Reçu, envoi à IBM Quantum",
 *   "quantumScore": "0"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Data added successfully"
 * }
 */
Example request:
{
  "email": "user@example.com",
  "task": "quantum_task_1",
  "date": "2025-03-20",
  "status": "En attente",
  "points": "0",
  "level": "Beginner",
  "referrals": "0",
  "plan": "Gratuit",
  "details": "Reçu, envoi à IBM Quantum",
  "quantumScore": "0"
}
*/

// Start server
app.listen(3000, '0.0.0.0', () => {
  console.log('Server running on port 3000');
});
