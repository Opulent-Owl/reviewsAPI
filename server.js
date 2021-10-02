const express = require('express');
const app = express();
const port = 3000;
const cors = require('cors');
const { Pool } = require('pg');

app.use(express.json());
app.use(cors());

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'bryanna',
  password: 'ele6969doo',
  database: 'reviews_api',
  idleTimeoutMillis: 50000,
})

app.get('/', (req, res) => {
  console.log(req.body)
  pool.query(`SELECT AVG(characteristic_reviews.value), characteristics.name
      FROM characteristic_reviews
      INNER JOIN characteristics
      ON characteristics.product_id=$1
      AND characteristic_reviews.characteristic_id=characteristics.id
      GROUP BY characteristics.name`, [req.body], (err, result) => {
    err ? res.status(418).send(err.message) :
      res.status(200).json(result.rows);
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
});
