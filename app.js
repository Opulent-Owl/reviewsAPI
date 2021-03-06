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

// ~ 10 - 15 seconds W/O index
// ~ 400 ms with product_id reviews index
// ~ 30 - 40 ms with remove left join + reviews_id index
app.get('/reviews', (req, res) => {
  const sorting = {newest: ' date DESC ', helpful: ' helpfulness DESC '};
  const sortBy = sorting[req.query.sort] || ' helpfulness DESC, date DESC ';
  pool.query(`SELECT
    reviews.id AS review_id,
    to_timestamp(reviews.date/1000)::date AS date,
    reviews.summary,
    reviews.body,
    reviews.recommend AS recommended,
    reviews.reviewer_name,
    reviews.response,
    reviews.helpfulness,
    (SELECT (
      COALESCE(json_agg(json_build_object(
      'id', id,
      'url', url))
      , '[]')) FROM reviews_photos WHERE review_id=reviews.id
    ) AS photos
    FROM reviews
    WHERE reviews.product_id=$1
    AND reported=false
  GROUP By reviews.id
  ORDER BY${sortBy}LIMIT $2
  OFFSET $3`, [req.query.product_id, req.query.count || 5, (req.query.page -1) * req.query.count || 1], (err, result) => {
    err ? res.status(418).send(err.message) :
      res.status(200).json({'results': result.rows});
  });
});

// ~ 24 seconds W/O index
// ~ 3.5 seconds W reviews indexes
// ~ 30 ms with remove inner join + characteristic_id index
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
  (SELECT json_object_agg(characteristics.name,
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
// ~ 10-15ms W helpfulness index
app.put('/reviews/:review_id/helpful', (req, res) => {
  pool.query(`UPDATE reviews SET helpfulness=helpfulness+1 WHERE id=$1`, [req.params.review_id], (err, result) => {
    err ? res.status(418).send(err.message) :
      res.status(204).json();
  });
});

// ~ 12ms
app.put('/reviews/:review_id/report', (req, res) => {
  pool.query(`UPDATE reviews SET reported=true WHERE id=$1 AND reported=false`, [req.params.review_id], (err, result) => {
    err ? res.status(418).send(err.message) :
      res.status(204).json();
  });
});

// ~ 40ms
app.post('/reviews', (req, res) => {
  const photos = req.body.photos;
  const add_photos = photos.length === 0 ? '' :
    ', add_photos AS (INSERT INTO reviews_photos(review_id, url) VALUES ' +
    photos.map((url) => {
      return `((SELECT id FROM add_review), '${url}')`
      })
    + ')';
  const chars_scores = req.body.characteristics;
  const add_chars_revs = Object.keys(chars_scores).length === 0 ? '' :
    'INSERT INTO characteristic_reviews(characteristic_id, review_id, value) VALUES ' +
    Object.keys(chars_scores).map((id) => {
      return `(${id}, (SELECT id FROM add_review), ${chars_scores[id]})`
    });
  pool.query(`WITH add_review AS (
    INSERT INTO reviews (product_id, rating, date, summary, body, recommend, reviewer_name, reviewer_email)
      VALUES ($1, $2, ${Date.now()}, $3, $4, $5, $6, $7)
    RETURNING id)
    ${add_photos}
    ${add_chars_revs}`, [req.body.product_id, req.body.rating, req.body.summary, req.body.body, req.body.recommend, req.body.name, req.body.email], (err, result) => {
    err ? res.status(418).send(err.message) :
      res.status(201).json();
  });
});

module.exports = app;
