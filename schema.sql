-- SET check_function_bodies = false;
SELECT reviews_api;

CREATE TABLE reviews(
  id SERIAL,
  product_id INT NOT NULL,
  rating smallint NOT NULL,
  date bigint NOT NULL,
  summary varchar(500) NOT NULL,
  body varchar(4000) NOT NULL,
  recommend boolean DEFAULT false,
  reported boolean DEFAULT false,
  reviewer_name varchar(100) NOT NULL,
  reviewer_email varchar(200),
  response varchar(4000) DEFAULT NULL,
  helpfulness INT DEFAULT 0,
  PRIMARY KEY(id)
);

CREATE TABLE reviews_photos(
  id SERIAL,
  review_id INT NOT NULL,
  url varchar(6000) NOT NULL,
  PRIMARY KEY(id),
  CONSTRAINT reviews_photos
    FOREIGN KEY (review_id)
      REFERENCES reviews (id)
);

CREATE TABLE characteristic_reviews(
  id SERIAL PRIMARY KEY,
  characteristic_id INT NOT NULL,
  review_id INT NOT NULL,
  value smallint NOT NULL,
  CONSTRAINT reviews_characteristics
    FOREIGN KEY (review_id)
      REFERENCES reviews (id),
  CONSTRAINT characteristics_characteristic_reviews
    FOREIGN KEY (characteristic_id)
      REFERENCES characteristics (id)
);
CREATE TYPE char_name AS ENUM ('Size', 'Fit', 'Comfort', 'Quality', 'Length', 'Width');

CREATE TABLE characteristics(
  id SERIAL PRIMARY KEY,
  product_id INT NOT NULL,
  name char_name
);
