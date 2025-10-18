require('dotenv').config();
const http = require('http');
const url = require('url');
const mysql = require('mysql2');
const { parse } = require('querystring');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.PORT
};

// Create connection
const connection = mysql.createConnection(dbConfig);

// Create patient table if it doesn't exist
const createTableQuery = `
CREATE TABLE IF NOT EXISTS patient (
  patientid INT(11) AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  dateOfBirth DATETIME
) ENGINE=InnoDB;
`;

connection.query(createTableQuery, (err) => {
  if (err) console.error('Error creating patient table:', err.message);
  else console.log('Patient table ready.');
});

// Utility: Validate query type
function isSafeQuery(query) {
  const lower = query.trim().toLowerCase();
  return lower.startsWith('select') || lower.startsWith('insert');
}

// Server
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method;

  // Allow CORS for client origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (path.startsWith('/lab5/api/v1/sql')) {
    if (method === 'GET') {
      const rawQuery = decodeURIComponent(path.split('/sql/')[1] || '');
      if (!isSafeQuery(rawQuery)) {
        res.writeHead(403);
        return res.end(JSON.stringify({ error: 'Only SELECT or INSERT queries allowed' }));
      }
      connection.query(rawQuery, (err, results) => {
        if (err) {
          res.writeHead(400);
          return res.end(JSON.stringify({ error: err.message }));
        }
        res.writeHead(200);
        res.end(JSON.stringify(results));
      });
    } else if (method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        const { query } = parse(body);

        // Handle default insert trigger
        if (query === 'insert_default_rows') {
          const insertDefaults = `
            INSERT INTO patient (name, dateOfBirth) VALUES
            ('Sara Brown', '1981-01-01'),
            ('John Smith', '1961-01-01'),
            ('Jack Ma', '1964-01-01'),
            ('Elon Musk', '1999-01-01');
          `;
          connection.query(insertDefaults, (err, results) => {
            if (err) {
              res.writeHead(400);
              return res.end(JSON.stringify({ error: err.message }));
            }
            res.writeHead(200);
            return res.end(JSON.stringify({ message: 'Default patients inserted', results }));
          });
          return;
        }

        // Validate and execute custom query
        if (!isSafeQuery(query)) {
          res.writeHead(403);
          return res.end(JSON.stringify({ error: 'Only SELECT or INSERT queries allowed' }));
        }

        connection.query(query, (err, results) => {
          if (err) {
            res.writeHead(400);
            return res.end(JSON.stringify({ error: err.message }));
          }
          res.writeHead(200);
          res.end(JSON.stringify(results));
        });
      });
    } else {
      res.writeHead(405);
      res.end(JSON.stringify({ error: 'Method not allowed' }));
    }
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

// Start server
server.listen(4000, () => {
  console.log('Server2 running on http://localhost:4000');
});