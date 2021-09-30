
-- select to_timestamp(cast({field name}/1000 as bigint))::date

COPY reviews
FROM '/Users/bryanna/Desktop/HRsprints/reviews/CSVs/reviews.csv'
WITH (FORMAT CSV, HEADER true, NULL 'null');

COPY reviews_photos
FROM '/Users/bryanna/Desktop/HRsprints/reviews/CSVs/reviews_photos.csv'
WITH (FORMAT CSV, HEADER true, NULL 'null');

COPY characteristics
FROM '/Users/bryanna/Desktop/HRsprints/reviews/CSVs/characteristics.csv'
WITH (FORMAT CSV, HEADER true, NULL 'null');

COPY characteristic_reviews
FROM '/Users/bryanna/Desktop/HRsprints/reviews/CSVs/characteristic_reviews.csv'
WITH (FORMAT CSV, HEADER true, NULL 'null');
