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

//~ 10 - 15 seconds
app.get('/reviews', (req, res) => {
  pool.query(`SELECT json_agg(results_list) AS results
  FROM (SELECT reviews.id AS review_id, to_timestamp(reviews.date/1000)::date AS date, reviews.summary, reviews.body, reviews.recommend, reviews.reviewer_name, reviews.response, reviews.helpfulness,
    COALESCE (json_agg(json_build_object('id', reviews_photos.id, 'url', reviews_photos.url))
    FILTER (WHERE reviews_photos.id IS NOT NULL), '[]')
    AS photos
    FROM reviews
    LEFT JOIN reviews_photos
    ON reviews_photos.review_id=reviews.id
    WHERE reviews.product_id=$1
    AND reported=false
  GROUP By reviews.id
  ORDER BY ${req.query.sort === 'newest' ? 'date' : 'helpfulness'} DESC
  LIMIT $2
  OFFSET $3) AS results_list`, [req.query.product_id, req.query.count || 5, (req.query.page -1) * req.query.count || 1], (err, result) => {
    err ? res.status(418).send(err.message) :
      res.status(200).json(result.rows);
  });
});

// ~ 23 seconds
app.get('/reviews/meta', (req, res) => {
  pool.query(`SELECT * FROM
  (SELECT json_build_object(0, COUNT(recommend)) AS recommended
  FROM reviews
  WHERE product_id=$1
  AND recommend=true) AS recommended,
  (SELECT json_strip_nulls(json_build_object(
	  0, SUM(CASE WHEN rating=0 THEN 1
                ELSE null
           END),
  	1, SUM(CASE WHEN rating=1 THEN 1
                ELSE null
           END),
	  2, SUM(CASE WHEN rating=1 THEN 1
                ELSE null
           END),
	  3, SUM(CASE WHEN rating=1 THEN 1
                ELSE null
           END),
	  4, SUM(CASE WHEN rating=1 THEN 1
                ELSE null
           END),
	  5, SUM(CASE WHEN rating=1 THEN 1
                ELSE null
           END))) AS ratings
  FROM reviews
  WHERE product_id=$1
  ) AS ratings,
  (SELECT json_object_agg(inner_characteristics.name, characteristics_list) AS characteristics
   FROM
   		(SELECT
    		characteristics.name, json_build_object('value', AVG(characteristic_reviews.value), 'id', characteristics.id)
    		AS characteristics_list
   			FROM characteristic_reviews
    		INNER JOIN characteristics
    		ON characteristics.product_id=48432
    		WHERE characteristic_reviews.characteristic_id=characteristics.id
    		GROUP BY characteristics.id)AS inner_characteristics) AS characteristics`, [req.query.product_id], (err, result) => {
    err ? res.status(418).send(err.message) :
      res.status(200).json(result.rows);
  });
});

// ~ 44ms
app.put('/reviews/:review_id/helpful', (req, res) => {
  pool.query(`UPDATE reviews SET helpfulness=helpfulness+1 WHERE id=$1`, [req.params.review_id], (err, result) => {
    err ? res.status(418).send(err.message) :
      res.status(204).json();
  });
});

// ~ 12ms
app.put('/reviews/:review_id/report', (req, res) => {
  pool.query(`UPDATE reviews SET reported=true WHERE id=$1`, [req.params.review_id], (err, result) => {
    err ? res.status(418).send(err.message) :
      res.status(204).json();
  });
});

//still needs to put photos and characteristics
app.post('/reviews', (req, res) => {
  pool.query(`INSERT INTO reviews (product_id, rating, date, summary, body, recommend, reviewer_name, reviewer_email) VALUES ($1, $2, EXTRACT(EPOCH FROM TIMESTAMP ${Date.now()}))::bigint, $3, $4, $5, $6, $7)`, [req.body.product_id, req.body.rating, req.body.summary, req.body.body, req.body.recommend, req.body.name, req.body.email], (err, result) => {
    err ? res.status(418).send(err.message) :
      res.status(201).json();
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
});
