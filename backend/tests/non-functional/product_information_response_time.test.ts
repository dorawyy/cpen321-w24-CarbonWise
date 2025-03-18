import supertest from "supertest";
import { performance } from "perf_hooks";
import { createServer } from "../../utils";

// Non-Functional: Test the response time for product information retrieval
describe("Non-Functional: Product Information Response Time", () => {
    
    const app = createServer();

    // Non-Functional Test: Ensure product response time is under 5 seconds and product is returned
    // Input: Valid product ID
    // Expected status code: 200
    // Expected output: Product information is returned within 5 seconds
    test("Product response time is under 5 seconds and product is returned", async () => {
        const start = performance.now();
        const res = await supertest(app).get("/products/1234567890123");
        const end = performance.now();
        const responseTime = end - start;

        expect(responseTime).toBeLessThanOrEqual(5000);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("product");
        expect(res.body.product).toHaveProperty("_id", "1234567890123");
    });
});
