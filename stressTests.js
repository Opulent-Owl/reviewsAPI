import http from 'k6/http';
import { sleep } from 'k6';

export let options = {
  stages: [
    { duration: '1s', target: 1 }, // below normal load
    { duration: '1s', target: 10 },
    { duration: '1s', target: 100 }, // normal load
    { duration: '1s', target: 100 },
    { duration: '1s', target: 500 },
    { duration: '1s', target: 1000 }, // around the breaking point
    { duration: '1s', target: 2000 }, // beyond the breaking point
    { duration: '1s', target: 500 },
    { duration: '1s', target: 10 },
    { duration: '1s', target: 0 }, // scale down. Recovery stage.
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2000'], //95% of req should be under 2000ms
  }
};

export default function () {
  const BASE_URL = 'http://localhost:3000';
  const product_id = Math.floor(Math.random() * 100000 + 900000);
  //const params = { headers: { 'Content-Type': 'application/json' } };
  //http.request('GET', `http://localhost:3000/reviews?product_id=${product_id}`, params);

  let responses = http.batch([
    // [
    //   'GET',
    //   `${BASE_URL}/reviews?product_id=${product_id}`,
    //   null,
    //   { tags: { name: 'GET reviews' } },
    // ],
    // [
    //   'GET',
    //   `${BASE_URL}/reviews/meta?product_id=${product_id}`,
    //   null,
    //   { tags: { name: 'GET meta' } },
    // ],
    // [
    //   'PUT',
    //   `${BASE_URL}/reviews/ /helpful`,
    //   null,
    //   { tags: { name: 'Helpful' } },
    // ],
    // [
    //   'PUT',
    //   `${BASE_URL}/reviews/ /report`,
    //   null,
    //   { tags: { name: 'Reported' } },
    // ],
    // [
    //   'POST',
    //   `${BASE_URL}/reviews`,
    //   {
    //     "product_id": 48432,
    //     "rating": 4,
    //     "summary": "it cool",
    //     "body": "i bought 3",
    //     "recommend" :true,
    //     "name": "bry",
    //     "email": "bry@gmail.com",
    //     "photos": [],
    //     "characteristics": {"162510": 0, "162511": 2, "162512": 2, "162513": 4}
    // },
    //   { tags: { name: 'PublicCrocs' } },
    // ],
  ]);

  sleep(1);
}