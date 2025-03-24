import { createServer } from "../../utils";
import supertest from "supertest";
import dotenv from "dotenv";
import { testProductBId, JEST_TIMEOUT_MS } from "../res/data";

// Interface: GET /products/:product_id
describe("Unmocked: GET /products/:product_id", () => {

    const app = createServer();
    jest.setTimeout(JEST_TIMEOUT_MS); 

    beforeAll(async () => {
        dotenv.config({ path: './res/.env.test' });
    }); 

    // Input: Valid product_id with query num_recommendations = 0
    // Expected status code: 400
    // Expected behavior: None
    // Expected output: Error message
    test("Request No Recommendations", async () => {
        const res = await supertest(app).get(`/products/${testProductBId}`).query({ num_recommendations: 0 });

        expect(res.status).toStrictEqual(400);
        expect(res.body).toHaveProperty("errors");
        expect(res.body.errors).toEqual([
            {
                type: 'field',
                value: '0',
                msg: 'Number of recommendations must be a positive integer',
                path: 'num_recommendations',
                location: 'query'
            }
        ]);
    });

    // Input: Invalid num_recommendations query, negative integer
    // Expected status code: 400
    // Expected behavior: None
    // Expected output: Error message
    test("Invalid num_recommendations query, negative integer", async () => {
        const res = await supertest(app).get(`/products/${testProductBId}`).query({ num_recommendations: -1 });

        expect(res.status).toStrictEqual(400);
        expect(res.body).toHaveProperty("errors");
        expect(res.body.errors).toEqual([
            {
                type: 'field',
                value: '-1',
                msg: 'Number of recommendations must be a positive integer',
                path: 'num_recommendations',
                location: 'query'
            }
        ]);
    });

    // Input: Invalid num_recommendations random string
    // Expected status code: 400
    // Expected behavior: None
    // Expected output: Error message
    test("Invalid num_recommendations query, random string", async () => {
        const res = await supertest(app).get(`/products/${testProductBId}`).query({ num_recommendations: "EIOHD()J@_##JE!@)+{JEJ!!---:;;;:!@#!@#!@$" });

        expect(res.status).toStrictEqual(400);
        expect(res.body).toHaveProperty("errors");
        expect(res.body.errors).toEqual([
            {
                type: 'field',
                value: "EIOHD()J@_##JE!@)+{JEJ!!---:;;;:!@#!@#!@$",
                msg: 'Number of recommendations must be a positive integer',
                path: 'num_recommendations',
                location: 'query'
            }
        ]);
    });

    // Input: Invalid include_languages: array instead of string
    // Expected status code: 400
    // Expected behavior: None
    // Expected output: Error message
    test("Invalid include_languages: array instead of string", async () => {
        const res = await supertest(app).get(`/products/${testProductBId}`).query({ include_languages: ["en", "fr"] });

        expect(res.status).toBe(400);
        expect(res.body.errors).toEqual([
            expect.objectContaining({
                path: "include_languages",
                msg: "Included languages must be a comma-separated string"
            })
        ]);
    });

    // Input: Invalid include_countries: array instead of string
    // Expected status code: 400
    // Expected behavior: None
    // Expected output: Error message
    test("Invalid include_countries: array instead of string", async () => {
        const res = await supertest(app).get(`/products/${testProductBId}`).query({ include_countries: ["en:france", "en:germany"] });

        expect(res.status).toBe(400);
        expect(res.body.errors).toEqual([
            expect.objectContaining({
                path: "include_countries",
                msg: "Included countries must be a comma-separated string"
            })
        ]);
    });

    // Input: Invalid product_id: empty string
    // Expected status code: 404
    // Expected behavior: None
    // Expected output: Not found
    test("Invalid product_id: empty string", async () => {
        const res = await supertest(app).get(`/products/`).query({ num_recommendations: 1 });

        expect(res.status).toBe(404);
    });

    // Input: Missing Product ID in query
    // Expected status code: 404
    // Expected behavior: None
    // Expected output: Not found
    test("Missing Product ID in query", async () => {
        const res = await supertest(app).get("/products/");

        expect(res.status).toBe(404);
    });

    // Input: Valid product ID but extra invalid query parameters
    // Expected status code: 200
    // Expected behavior: None
    // Expected output: Product info
    test("Extra unknown query params should be ignored", async () => {
        const res = await supertest(app).get(`/products/${testProductBId}`).query({
            num_recommendations: 1,
            fake_param: "shouldBeIgnored"
        });

        expect(res.status).toBeGreaterThanOrEqual(200);
        expect(res.status).toBeLessThan(500);
    });
});
