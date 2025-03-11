import { createServer } from "../../utils";
import supertest from "supertest";

const app = createServer();

// Interface GET /products/:product_id
describe("Unmocked: GET /products/:product_id", () => {
 
    // Input: Valid product_id that does not exist
    // Expected status code: 404
    // Expected behavior: Product is not found
    // Expected output: Error message
    test("Valid Product ID Not Found", async () => {
        const product_id = "0000000000000";

        const res = await supertest(app).get(`/products/${product_id}`);

        expect(res.status).toStrictEqual(404);
        expect(res.body).toHaveProperty("message");
        expect(res.body.message).toStrictEqual("Product not found or missing required fields.");
    });

});
