import { createServer } from "../../utils";
import supertest from "supertest";

// Interface: GET /products/:product_id
describe("Unmocked: GET /products/:product_id", () => {

    const app = createServer();
    

    // Test: Missing Product ID
    // Input: No product ID provided
    // Expected status code: 404
    // Expected output: Error indicating missing product ID
    test("Missing Product ID", async () => {
        
        const res = await supertest(app).get("/products/");
        expect(res.status).toBe(404);
    });

    // Test: Invalid Product ID (Non-Existent)
    // Input: Non-existent product ID
    // Expected status code: 404
    // Expected output: Error message indicating product not found
    test("Invalid Product ID (Non-Existent)", async () => {
        
        const res = await supertest(app).get("/products/invalid_product_id");
        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty("message");
        expect(res.body.message).toBe("Product not found or missing required fields.");
    });

    // Test: Invalid Product ID Format (Special Characters)
    // Input: Product ID with special characters
    // Expected status code: 404
    // Expected output: Error message indicating product not found
    test("Invalid Product ID Format (Special Characters)", async () => {
        
        const res = await supertest(app).get("/products/@@@###$$$");
        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty("message");
        expect(res.body.message).toBe("Product not found or missing required fields.");
    });

    // Test: Valid Product ID but Not in Database or OpenFoodFacts
    // Input: Valid product ID not present in database or OpenFoodFacts
    // Expected status code: 404
    // Expected output: Error message indicating product not found
    test("Valid Product ID but Not in Database or OpenFoodFacts", async () => {
        
        const res = await supertest(app).get("/products/9999999999999");
        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty("message");
        expect(res.body.message).toBe("Product not found or missing required fields.");
    });

    // Test: Valid Product ID with Images and Default Number of Recommendations
    // Input: Valid product ID with default recommendations
    // Expected status code: 200
    // Expected output: Product with image and recommendations
    test("Valid Product ID with Images and Default Number of Recommendations", async () => {
        
        const res = await supertest(app).get("/products/3017620422003");
        expect(res.status).toBe(200);
        expect(res.body.product).toHaveProperty("image");
        expect(res.body.product.image).toMatch(/^[A-Za-z0-9+/=]+$/);
        expect(res.body).toHaveProperty("recommendations");
        expect(res.body.recommendations.length).toBeGreaterThanOrEqual(1);
    });

    // Test: Valid Product ID with Multiple Recommendations Requested
    // Input: Valid product ID with multiple recommendations requested
    // Expected status code: 200
    // Expected output: Product with image and multiple recommendations
    test("Valid Product ID with Multiple Recommendations Requested", async () => {
        
        const res = await supertest(app).get("/products/3017620422003").query({ num_recommendations: 2 });
        expect(res.status).toBe(200);
        expect(res.body.product).toHaveProperty("image");
        expect(res.body.product.image).toMatch(/^[A-Za-z0-9+/=]+$/);
        expect(res.body).toHaveProperty("recommendations");
        expect(res.body.recommendations.length).toBeGreaterThanOrEqual(2);
    });

    // Test: Valid Product ID with Specific Country Filtering
    // Input: Valid product ID with country filtering
    // Expected status code: 200
    // Expected output: Product with recommendations filtered by country
    test("Valid Product ID with Specific Country Filtering", async () => {
        
        const res = await supertest(app).get("/products/3017620422003").query({ countries: "en:germany" });
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("product");
        expect(res.body).toHaveProperty("recommendations");
        expect(res.body.recommendations.every((recommendation: any) => recommendation.countries.some((country: any) => country.code === "en" && country.name === "germany"))).toBe(true);
    });

    // Test: Valid Product ID but No Categories Hierarchy
    // Input: Valid product ID with no categories hierarchy
    // Expected status code: 404
    // Expected output: Error message indicating product not found
    test("Valid Product ID but No Categories Hierarchy", async () => {
        
        const res = await supertest(app).get("/products/1111111111111");
        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty("message");
        expect(res.body.message).toBe("Product not found or missing required fields.");
    });

    // Test: Valid Product ID with Empty Recommendations
    // Input: Valid product ID with zero recommendations requested
    // Expected status code: 400
    // Expected output: Error message indicating invalid number of recommendations
    test("Valid Product ID with Empty Recommendations", async () => {
        
        const res = await supertest(app).get("/products/4444444444444").query({ num_recommendations: 0 });
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("errors");
        expect(res.body.errors[0]).toHaveProperty("msg");
        expect(res.body.errors[0].msg).toBe("Number of recommendations must be a positive integer");
    });

    // Test: Valid Product ID with Language-Specific Recommendations
    // Input: Valid product ID with language-specific recommendations
    // Expected status code: 200
    // Expected output: Recommendations filtered by language
    test("Valid Product ID with Language-Specific Recommendations", async () => {
        
        const res = await supertest(app).get("/products/3017620422003").query({ languages: "en,fr" });
        expect(res.status).toBe(200);
        expect(res.body.recommendations.every((r: any) => r.categories_tags.some((tag: any) => tag.startsWith("en:") || tag.startsWith("fr:")))).toBe(true);
    });

    // Test: Invalid include_languages (Array Instead of String)
    // Input: Array provided for include_languages instead of string
    // Expected status code: 400
    // Expected output: Error message indicating invalid format
    test("Invalid include_languages (Array Instead of String)", async () => {
        
        const res = await supertest(app).get("/products/3017620422003").query({ include_languages: ["en", "fr"] });
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("errors");
        expect(res.body.errors[0].msg).toBe("Included languages must be a comma-separated string");
    });

    // Test: Invalid include_countries (Array Instead of String)
    // Input: Array provided for include_countries instead of string
    // Expected status code: 400
    // Expected output: Error message indicating invalid format
    test("Invalid include_countries (Array Instead of String)", async () => {
        
        const res = await supertest(app).get("/products/3017620422003").query({ include_countries: ["us", "fr"] });
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("errors");
        expect(res.body.errors[0].msg).toBe("Included countries must be a comma-separated string");
    });

    // Test: Valid include_languages (Comma-Separated String)
    // Input: Comma-separated string for include_languages
    // Expected status code: 200
    // Expected output: Successful response
    test("Valid include_languages (Comma-Separated String)", async () => {
        
        const res = await supertest(app).get("/products/3017620422003").query({ include_languages: "en,fr,de" });
        expect(res.status).toBe(200);
    });

});
