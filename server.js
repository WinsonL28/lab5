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