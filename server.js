const express = require('express');
const app = express();
const port = 3000;
const cors = require('cors');
const config = require('./config.js');
const { Pool } = require('pg');

app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  database: config.DB_NAME,
  idleTimeoutMillis: 50000,
});

//works in admin but objs not staying in order here
//~ 13 seconds
//need photos array with ids
app.get('/:sortBy/:id', (req, res) => {
  pool.query(`SELECT * FROM reviews WHERE product_id=$1 AND reported=false ORDER BY $2 DESC`, [req.param('id'), req.param('sortBy')], (err, result) => {
    err ? res.status(418).send(err.message) :
      res.status(200).json(result.rows);
  });
});

//need recommended and ratings too
app.get('/meta/:id', (req, res) => {
  pool.query(`SELECT AVG(characteristic_reviews.value), characteristics.name
  from characteristic_reviews
  inner join characteristics
  on characteristics.product_id=$1 AND
  characteristic_reviews.characteristic_id=characteristics.id
  Group By characteristics.name;`, [req.param('id')], (err, result) => {
    err ? res.status(418).send(err.message) :
      res.status(200).json(result.rows);
  });
});

// ~ 44ms
app.put('/:review_id/helpful', (req, res) => {
  pool.query(`UPDATE reviews SET helpfulness=helpfulness+1 WHERE id=$1`, [req.param('review_id')], (err, result) => {
    err ? res.status(418).send(err.message) :
      res.status(204).json();
  });
});

// ~ 12ms
app.put('/:review_id/report', (req, res) => {
  pool.query(`UPDATE reviews SET reported=true WHERE id=$1`, [req.param('review_id')], (err, result) => {
    err ? res.status(418).send(err.message) :
      res.status(204).json();
  });
});

//still needs to put photos and characteristics
app.post('/reviews', (req, res) => {
  pool.query(`INSERT INTO reviews (product_id, rating, date, summary, body, recommend, reviewer_name, reviewer_email) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [req.body.product_id, req.body.rating, Date.now(), req.body.summary, req.body.body, req.body.recommend, req.body.name, req.body.email], (err, result) => {
    err ? res.status(418).send(err.message) :
      res.status(201).json();
  });
});
// pool.getConnection(function (err, conn) {
//   if (err) return callback(err);

//   conn.query('SELECT 1 AS seq', function (err, rows) {
//     if (err) throw err;

//     conn.query('SELECT 2 AS seq', function (err, rows) {
//       if (err) throw err;

//       conn.release();
//       callback();
//     });
//   });
// });

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
});
