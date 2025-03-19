import { createServer } from "../../utils";
import supertest from "supertest";

// Interface GET /users/history
describe("Unmocked: GET /users/history", () => {
    const app = createServer();

    // Test: Access without token
    // Input: No token provided
    // Expected status code: 401
    // Expected output: Error message indicating no token provided
    test("Access without token", async () => {
        const res = await supertest(app).get("/users/history");
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("message", "No token provided.");
    });

    // Test: Access with invalid token
    // Input: Invalid token provided
    // Expected status code: 403
    // Expected output: Error message indicating authentication error
    test("Access with invalid token", async () => {
        const res = await supertest(app).get("/users/history").set("token", "invalid_token");
        expect(res.status).toBe(403);
        expect(res.body).toHaveProperty("message", "Authentication error.");
    });
});

// Interface POST /users/history
describe("Unmocked: POST /users/history", () => {
    const app = createServer();

    // Test: Add to history without token
    // Input: No token provided, product_id in request body
    // Expected status code: 401
    // Expected output: Error message indicating no token provided
    test("Add to history without token", async () => {
        const res = await supertest(app).post("/users/history").send({ product_id: "12345" });
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("message", "No token provided.");
    });

    // Test: Add to history with invalid token
    // Input: Invalid token provided, product_id in request body
    // Expected status code: 403
    // Expected output: Error message indicating authentication error
    test("Add to history with invalid token", async () => {
        const res = await supertest(app).post("/users/history").set("token", "invalid_token").send({ product_id: "12345" });
        expect(res.status).toBe(403);
        expect(res.body).toHaveProperty("message", "Authentication error.");
    });
});

// Interface DELETE /users/history
describe("Unmocked: DELETE /users/history", () => {
    const app = createServer();

    // Test: Delete history entry without token
    // Input: No token provided, scan_uuid in query
    // Expected status code: 401
    // Expected output: Error message indicating no token provided
    test("Delete history entry without token", async () => {
        const res = await supertest(app).delete("/users/history").query({ scan_uuid: "scan-123" });
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("message", "No token provided.");
    });

    // Test: Delete history entry with invalid token
    // Input: Invalid token provided, scan_uuid in query
    // Expected status code: 403
    // Expected output: Error message indicating authentication error
    test("Delete history entry with invalid token", async () => {
        const res = await supertest(app).delete("/users/history").set("token", "invalid_token").query({ scan_uuid: "scan-123" });
        expect(res.status).toBe(403);
        expect(res.body).toHaveProperty("message", "Authentication error.");
    });
});

// Interface GET /users/ecoscore_score
describe("Unmocked: GET /users/ecoscore_score", () => {
    const app = createServer();

    // Test: Get ecoscore average without token
    // Input: No token provided
    // Expected status code: 401
    // Expected output: Error message indicating no token provided
    test("Get ecoscore average without token", async () => {
        const res = await supertest(app).get("/users/ecoscore_score");
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("message", "No token provided.");
    });

    // Test: Get ecoscore average with invalid token
    // Input: Invalid token provided
    // Expected status code: 403
    // Expected output: Error message indicating authentication error
    test("Get ecoscore average with invalid token", async () => {
        const res = await supertest(app).get("/users/ecoscore_score").set("token", "invalid_token");
        expect(res.status).toBe(403);
        expect(res.body).toHaveProperty("message", "Authentication error.");
    });
});

// Interface POST /users/fcm_registration_token
describe("Unmocked: POST /users/fcm_registration_token", () => {
    const app = createServer();

    // Test: Set FCM registration token without token
    // Input: No token provided, fcm_registration_token in request body
    // Expected status code: 401
    // Expected output: Error message indicating no token provided
    test("Set FCM registration token without token", async () => {
        const res = await supertest(app).post("/users/fcm_registration_token").send({ fcm_registration_token: "test_token" });
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("message", "No token provided.");
    });

    // Test: Set FCM registration token with invalid token
    // Input: Invalid token provided, fcm_registration_token in request body
    // Expected status code: 403
    // Expected output: Error message indicating authentication error
    test("Set FCM registration token with invalid token", async () => {
        const res = await supertest(app).post("/users/fcm_registration_token").set("token", "invalid_token").send({ fcm_registration_token: "test_token" });
        expect(res.status).toBe(403);
        expect(res.body).toHaveProperty("message", "Authentication error.");
    });
});

// Interface GET /users/uuid
describe("Unmocked: GET /users/uuid", () => {
    const app = createServer();

    // Test: Get user UUID without token
    // Input: No token provided
    // Expected status code: 401
    // Expected output: Error message indicating no token provided
    test("Get user UUID without token", async () => {
        const res = await supertest(app).get("/users/uuid");
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("message", "No token provided.");
    });

    // Test: Get user UUID with invalid token
    // Input: Invalid token provided
    // Expected status code: 403
    // Expected output: Error message indicating authentication error
    test("Get user UUID with invalid token", async () => {
        const res = await supertest(app).get("/users/uuid").set("token", "invalid_token");
        expect(res.status).toBe(403);
        expect(res.body).toHaveProperty("message", "Authentication error.");
    });
});
