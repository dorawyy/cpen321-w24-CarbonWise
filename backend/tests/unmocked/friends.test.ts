import { createServer } from "../../utils";
import supertest from "supertest";

const app = createServer();

// Interface GET /friends/history/:user_uuid
describe("Unmocked: GET /friends/history/:user_uuid", () => {
    // Test: Access without token
    // Expected status code: 401
    // Expected behavior: Request is rejected
    // Expected output: Error message
    test("Access without token", async () => {
        const res = await supertest(app).get("/friends/history/user-123");
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("message", "No token provided.");
    });

    // Test: Access with invalid token
    // Expected status code: 403
    // Expected behavior: Request is rejected
    // Expected output: Error message
    test("Access with invalid token", async () => {
        const res = await supertest(app).get("/friends/history/user-123").set("token", "invalid_token");
        expect(res.status).toBe(403);
        expect(res.body).toHaveProperty("message", "Authentication error.");
    });
});

// Interface POST /friends/requests
describe("Unmocked: POST /friends/requests", () => {
    // Test: Send friend request without token
    // Expected status code: 401
    // Expected behavior: Request is rejected
    // Expected output: Error message
    test("Send friend request without token", async () => {
        const res = await supertest(app).post("/friends/requests").send({ user_uuid: "friend-123" });
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("message", "No token provided.");
    });

    // Test: Send friend request with invalid token
    // Expected status code: 403
    // Expected behavior: Request is rejected
    // Expected output: Error message
    test("Send friend request with invalid token", async () => {
        const res = await supertest(app).post("/friends/requests").set("token", "invalid_token").send({ user_uuid: "friend-123" });
        expect(res.status).toBe(403);
        expect(res.body).toHaveProperty("message", "Authentication error.");
    });
});

// Interface POST /friends/requests/accept
describe("Unmocked: POST /friends/requests/accept", () => {
    // Test: Accept friend request without token
    // Expected status code: 401
    // Expected behavior: Request is rejected
    // Expected output: Error message
    test("Accept friend request without token", async () => {
        const res = await supertest(app).post("/friends/requests/accept").send({ user_uuid: "friend-123" });
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("message", "No token provided.");
    });

    // Test: Accept friend request with invalid token
    // Expected status code: 403
    // Expected behavior: Request is rejected
    // Expected output: Error message
    test("Accept friend request with invalid token", async () => {
        const res = await supertest(app).post("/friends/requests/accept").set("token", "invalid_token").send({ user_uuid: "friend-123" });
        expect(res.status).toBe(403);
        expect(res.body).toHaveProperty("message", "Authentication error.");
    });
});

// Interface DELETE /friends
describe("Unmocked: DELETE /friends", () => {
    // Test: Remove friend without token
    // Expected status code: 401
    // Expected behavior: Request is rejected
    // Expected output: Error message
    test("Remove friend without token", async () => {
        const res = await supertest(app).delete("/friends").query({ user_uuid: "friend-123" });
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("message", "No token provided.");
    });

    // Test: Remove friend with invalid token
    // Expected status code: 403
    // Expected behavior: Request is rejected
    // Expected output: Error message
    test("Remove friend with invalid token", async () => {
        const res = await supertest(app).delete("/friends").set("token", "invalid_token").query({ user_uuid: "friend-123" });
        expect(res.status).toBe(403);
        expect(res.body).toHaveProperty("message", "Authentication error.");
    });
});

// Interface DELETE /friends/requests
describe("Unmocked: DELETE /friends/requests", () => {
    // Test: Reject friend request without token
    // Expected status code: 401
    // Expected behavior: Request is rejected
    // Expected output: Error message
    test("Reject friend request without token", async () => {
        const res = await supertest(app).delete("/friends/requests").query({ user_uuid: "friend-123" });
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("message", "No token provided.");
    });

    // Test: Reject friend request with invalid token
    // Expected status code: 403
    // Expected behavior: Request is rejected
    // Expected output: Error message
    test("Reject friend request with invalid token", async () => {
        const res = await supertest(app).delete("/friends/requests").set("token", "invalid_token").query({ user_uuid: "friend-123" });
        expect(res.status).toBe(403);
        expect(res.body).toHaveProperty("message", "Authentication error.");
    });
});

// Interface GET /friends/requests
describe("Unmocked: GET /friends/requests", () => {
    // Test: Get friend requests without token
    // Expected status code: 401
    // Expected behavior: Request is rejected
    // Expected output: Error message
    test("Get friend requests without token", async () => {
        const res = await supertest(app).get("/friends/requests");
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("message", "No token provided.");
    });

    // Test: Get friend requests with invalid token
    // Expected status code: 403
    // Expected behavior: Request is rejected
    // Expected output: Error message
    test("Get friend requests with invalid token", async () => {
        const res = await supertest(app).get("/friends/requests").set("token", "invalid_token");
        expect(res.status).toBe(403);
        expect(res.body).toHaveProperty("message", "Authentication error.");
    });
});

// Interface GET /friends/requests/outgoing
describe("Unmocked: GET /friends/requests/outgoing", () => {
    // Test: Get outgoing friend requests without token
    // Expected status code: 401
    // Expected behavior: Request is rejected
    // Expected output: Error message
    test("Get outgoing friend requests without token", async () => {
        const res = await supertest(app).get("/friends/requests/outgoing");
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("message", "No token provided.");
    });

    // Test: Get outgoing friend requests with invalid token
    // Expected status code: 403
    // Expected behavior: Request is rejected
    // Expected output: Error message
    test("Get outgoing friend requests with invalid token", async () => {
        const res = await supertest(app).get("/friends/requests/outgoing").set("token", "invalid_token");
        expect(res.status).toBe(403);
        expect(res.body).toHaveProperty("message", "Authentication error.");
    });
});

// Interface GET /friends
describe("Unmocked: GET /friends", () => {
    // Test: Get current friends without token
    // Expected status code: 401
    // Expected behavior: Request is rejected
    // Expected output: Error message
    test("Get current friends without token", async () => {
        const res = await supertest(app).get("/friends");
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("message", "No token provided.");
    });

    // Test: Get current friends with invalid token
    // Expected status code: 403
    // Expected behavior: Request is rejected
    // Expected output: Error message
    test("Get current friends with invalid token", async () => {
        const res = await supertest(app).get("/friends").set("token", "invalid_token");
        expect(res.status).toBe(403);
        expect(res.body).toHaveProperty("message", "Authentication error.");
    });
});

// Interface POST /friends/notifications
describe("Unmocked: POST /friends/notifications", () => {
    // Test: Send product notification without token
    // Expected status code: 401
    // Expected behavior: Request is rejected
    // Expected output: Error message
    test("Send product notification without token", async () => {
        const res = await supertest(app).post("/friends/notifications").send({ user_uuid: "friend-123", scan_uuid: "scan-456", message_type: "praise" });
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("message", "No token provided.");
    });

    // Test: Send product notification with invalid token
    // Expected status code: 403
    // Expected behavior: Request is rejected
    // Expected output: Error message
    test("Send product notification with invalid token", async () => {
        const res = await supertest(app).post("/friends/notifications").set("token", "invalid_token").send({ user_uuid: "friend-123", scan_uuid: "scan-456", message_type: "praise" });
        expect(res.status).toBe(403);
        expect(res.body).toHaveProperty("message", "Authentication error.");
    });
});

// Interface GET /friends/ecoscore_score/:user_uuid
describe("Unmocked: GET /friends/ecoscore_score/:user_uuid", () => {
    // Test: Retrieve friend's ecoscore without token
    // Expected status code: 401
    // Expected behavior: Request is rejected
    // Expected output: Error message
    test("Retrieve friend's ecoscore without token", async () => {
        const res = await supertest(app).get("/friends/ecoscore_score/user-123");
        expect(res.status).toBe(401);
        expect(res.body.message).toBe("No token provided.");
    });

    // Test: Retrieve friend's ecoscore with invalid token
    // Expected status code: 403
    // Expected behavior: Request is rejected
    // Expected output: Error message
    test("Retrieve friend's ecoscore with invalid token", async () => {
        const res = await supertest(app).get("/friends/ecoscore_score/user-123").set("token", "invalid_token");
        expect(res.status).toBe(403);
        expect(res.body).toHaveProperty("message", "Authentication error.");
    });
});
