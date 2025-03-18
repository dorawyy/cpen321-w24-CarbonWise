import { createServer } from "../../utils";
import supertest from "supertest";

describe("Unmocked: GET /products/:product_id", () => {
    const app = createServer();

    test("Missing Product ID", async () => {
        const res = await supertest(app).get("/products/");
        expect(res.status).toBe(404);
    });

    
    test("Invalid Product ID (Non-Existent)", async () => {
        const res = await supertest(app).get("/products/invalid_product_id");
        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty("message");
        expect(res.body.message).toBe("Product not found or missing required fields.");
    });

    
    test("Invalid Product ID Format (Special Characters)", async () => {
        const res = await supertest(app).get("/products/@@@###$$$");
        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty("message");
        expect(res.body.message).toBe("Product not found or missing required fields.");
    });

    
    test("Valid Product ID but Not in Database or OpenFoodFacts", async () => {
        const res = await supertest(app).get("/products/9999999999999");
        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty("message");
        expect(res.body.message).toBe("Product not found or missing required fields.");
    });

    
    test("Valid Product ID with Images and Default Number of Recommendations", async () => {
        const res = await supertest(app).get("/products/1234567890123");
        expect(res.status).toBe(200);
        expect(res.body.product).toHaveProperty("image");
        expect(res.body.product.image).toMatch(/^[A-Za-z0-9+/=]+$/);
        expect(res.body).toHaveProperty("recommendations");
        expect(res.body.recommendations.length).toBeGreaterThanOrEqual(1);
    });


    test("Valid Product ID with Multiple Recommendations Requested", async () => {
        const res = await supertest(app).get("/products/1234567890123").query({ num_recommendations: 2 });
        expect(res.status).toBe(200);
        expect(res.body.product).toHaveProperty("image");
        expect(res.body.product.image).toMatch(/^[A-Za-z0-9+/=]+$/);
        expect(res.body).toHaveProperty("recommendations");
        expect(res.body.recommendations.length).toBeGreaterThanOrEqual(2);
    });


    test("Valid Product ID with Specific Country Filtering", async () => {
        const res = await supertest(app).get("/products/1234567890123").query({ countries: "en:germany" });
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("product");
        expect(res.body).toHaveProperty("recommendations");
        expect(res.body.recommendations.every((recommendation: any) => recommendation.countries.some((country: any) => country.code === "en" && country.name === "germany"))).toBe(true);
    });

    test("Valid Product ID but No Categories Hierarchy", async () => {
        const res = await supertest(app).get("/products/1111111111111");
        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty("message");
        expect(res.body.message).toBe("Product not found or missing required fields.");
    });
    
    test("Valid Product ID with Empty Recommendations", async () => {
        const res = await supertest(app).get("/products/4444444444444").query({ num_recommendations: 0 });
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("errors");
        expect(res.body.errors[0]).toHaveProperty("msg");
        expect(res.body.errors[0].msg).toBe("Number of recommendations must be a positive integer");
    });
    
    test("Valid Product ID with Language-Specific Recommendations", async () => {
        const res = await supertest(app).get("/products/1234567890123").query({ languages: "en,fr" });
        expect(res.status).toBe(200);
        expect(res.body.recommendations.every((r: any) => r.categories_tags.some((tag: any) => tag.startsWith("en:") || tag.startsWith("fr:")))).toBe(true);
    });


    test("Invalid include_languages (Array Instead of String)", async () => {
        const res = await supertest(app).get("/products/1234567890123").query({ include_languages: ["en", "fr"] });
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("errors");
        expect(res.body.errors[0].msg).toBe("Included languages must be a comma-separated string");
    });

    test("Invalid include_countries (Array Instead of String)", async () => {
        const res = await supertest(app).get("/products/1234567890123").query({ include_countries: ["us", "fr"] });
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("errors");
        expect(res.body.errors[0].msg).toBe("Included countries must be a comma-separated string");
    });

    test("Valid include_languages (Comma-Separated String)", async () => {
        const res = await supertest(app).get("/products/1234567890123").query({ include_languages: "en,fr,de" });
        expect(res.status).toBe(200);
    });

    test("Valid include_countries (Comma-Separated String)", async () => {
        const res = await supertest(app).get("/products/1234567890123").query({ include_countries: "usa,france,germany" });
        expect(res.status).toBe(200);
    });

});
