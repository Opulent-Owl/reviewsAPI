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

//COMMENTS ARE ALL FROM POSTMAN:

// ~ 10 - 15 seconds W/O index
// ~ 400 ms with product_id reviews index
// ~  with remove left join + reviews_id index - inner COALESCE
// GOAL: around 500req/second median time of 2ms, longest = 85ms
app.get('/reviews', (req, res) => {
  pool.query(`SELECT json_agg(results_list) AS results
  FROM (SELECT reviews.id AS review_id, to_timestamp(reviews.date/1000)::date AS date, reviews.summary, reviews.body, reviews.recommend, reviews.reviewer_name, reviews.response, reviews.helpfulness,
    COALESCE (
      json_agg(
        json_build_object(
          'id', reviews_photos.id,
          'url', reviews_photos.url
        )
      )
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

// ~ 24 seconds W/O indexes
// ~ 3.5 seconds W indexes
// ~ 30ms with remove inner join + characteristic_id index
app.get('/reviews/meta', (req, res) => {
  pool.query(`SELECT * FROM
  (SELECT json_build_object('true', COUNT(recommend) FILTER (WHERE recommend=true),
  'false', COUNT(recommend) FILTER (WHERE recommend=false)) AS recommended
  FROM reviews
  WHERE product_id=$1) AS recommended,
  (SELECT json_strip_nulls(json_build_object(
	  0, SUM(CASE WHEN rating=0 THEN 1
                ELSE null
           END),
  	1, SUM(CASE WHEN rating=1 THEN 1
                ELSE null
           END),
	  2, SUM(CASE WHEN rating=2 THEN 1
                ELSE null
           END),
	  3, SUM(CASE WHEN rating=3 THEN 1
                ELSE null
           END),
	  4, SUM(CASE WHEN rating=4 THEN 1
                ELSE null
           END),
	  5, SUM(CASE WHEN rating=5 THEN 1
                ELSE null
           END))) as ratings
  FROM reviews
  WHERE product_id=$1
  ) AS ratings,
  (SELECT json_object_agg( characteristics.name,
		json_build_object('value', (
		SELECT AVG(value)
		FROM characteristic_reviews
		WHERE characteristic_reviews.characteristic_id=characteristics.id),
		'id', characteristics.id)) AS characteristics
    FROM characteristics
    WHERE product_id=$1) AS characteristics`, [req.query.product_id], (err, result) => {
    err ? res.status(418).send(err.message) :
      res.status(200).json(result.rows[0]);
  });
});

// ~ 44ms
// ~ 10-15ms W index
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

module.exports = app;
