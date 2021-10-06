const { performance } = require("perf_hooks");
const { setUncaughtExceptionCaptureCallback } = require("process");
const request = require("supertest");
const app = require("./app.js");

const product_id = Math.floor(Math.random() * 1000000);
const review_id = 1;

let server;

beforeEach(async () => {
  server = await app.listen(3009);
});

afterEach(async () => {
  await server.close();
});

describe(`Reviews API Request Times for a Product ID: ${product_id}`, () => {
  test("should return reviews list GET request time", async () => {
    var start = performance.now();
    const res = await request(app).get(`/reviews?product_id=${product_id}`);
    var end = performance.now();
    console.log(`Request time for reviews: ${end - start} ms`);
    expect(res.statusCode).toEqual(200);
  });

  test("should return reviews meta data GET request time", async () => {
    var str = `/reviews/meta?product_id=${product_id}`;
    var start = performance.now();
    const res = await request(app).get(str);
    var end = performance.now();
    console.log(`Request time for meta data: ${end - start} ms`);
    expect(res.statusCode).toEqual(200);
  });

  test("should return reviews helpful PUT request time", async () => {
    var str = `/reviews/${review_id}/helpful`;
    var start = performance.now();
    const res = await request(app).put(str);
    var end = performance.now();
    console.log(`Request time for helpful: ${end - start} ms`);
    expect(res.statusCode).toEqual(204);
  });

  test("should return reviews report PUT request time", async () => {
    var str = `/reviews/${review_id}/report`;
    var start = performance.now();
    const res = await request(app).put(str);
    var end = performance.now();
    console.log(`Request time for reported: ${end - start} ms`);
    expect(res.statusCode).toEqual(204);
  });

  // test("should return add new review POST request time", async () => {
  //   var str = `/products/${product_id}/related`;
  //   var start = performance.now();
  //   const res = await request(app).get(str);
  //   var end = performance.now();
  //   console.log(`Request time for POST review: ${end - start} ms`);
  //   expect(res.statusCode).toEqual(200);
  // });
});