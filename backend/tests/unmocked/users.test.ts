import { createServer } from "../../utils";
import supertest from "supertest";
import { client, historyCollection, usersCollection } from "../../services";
import { testUserA, testHistoryA, testHistoryB, testHistoryC, testUserB, testUserC, testProductA, testProductB, JEST_TIMEOUT_MS, testProductAId, testProductBId, testUserD, testHistoryD } from "../res/data";
import jwt from "jsonwebtoken";
import { checkHistory } from "../res/utils";

// Interface GET /users/history
describe("Unmocked: GET /users/history", () => {
    
    const app = createServer();
    jest.setTimeout(JEST_TIMEOUT_MS);   

    beforeAll(async () => {
        await client.connect();
        await historyCollection.drop();
    });

    

    afterEach(async () => {
        await historyCollection.drop();
    });

    afterAll(async () => {
        await client.close();
    });


    // Input: Authenticated user token
    // Expected status code: 200
    // Expected behavior: None
    // Expected output: User history with 1 product
    test("Successfully retrieved user history with 1 product", async () => {

  
        const token = jwt.sign(testUserA, process.env.JWT_SECRET as string);
        await historyCollection.insertOne(testHistoryA);

        const res = await supertest(app).get("/users/history").set("token", token);
        expect(res.status).toBe(200);

        const history = res.body[0];
        checkHistory(history, testHistoryA, [testProductA]);
    });

    // Input: Authenticated user token
    // Expected status code: 200
    // Expected behavior: None
    // Expected output: User history with no products
    test("Successfully retrieved user history with no products", async () => {

        const token = jwt.sign(testUserB, process.env.JWT_SECRET as string);
        await historyCollection.insertOne(testHistoryB);

        const res = await supertest(app).get("/users/history").set("token", token);
        expect(res.status).toBe(200);

        const history = res.body[0];
        checkHistory(history, testHistoryB, []);
    });

    // Input: Authenticated user token
    // Expected status code: 200
    // Expected behavior: None
    // Expected output: User history with more than 1 product
    test("Successfully retrieved user history with more than 1 product", async () => {

        const token = jwt.sign(testUserC, process.env.JWT_SECRET as string);
        await historyCollection.insertOne(testHistoryC);

        const res = await supertest(app).get("/users/history").set("token", token);
        expect(res.status).toBe(200);

        const history = res.body[0];
        checkHistory(history, testHistoryC, [testProductA, testProductB]);
    });

    // Input: Failed to find user history
    // Expected status code: 404
    // Expected behavior: None
    // Expected output: Error message
    test("Failed to find user history", async () => {

        const token = jwt.sign(testUserC, process.env.JWT_SECRET as string);

        const res = await supertest(app).get("/users/history").set("token", token);
        
        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty("message", "No history found for the user.");
    });
    
    // Input: No token provided
    // Expected status code: 401
    // Expected behavior: None
    // Expected output: Error message
    test("Access without token", async () => {
        const res = await supertest(app).get("/users/history");
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("message", "No token provided.");
    });

    // Input: Invalid token provided
    // Expected status code: 403
    // Expected behavior: None
    // Expected output: Error message
    test("Access with invalid token", async () => {
        const res = await supertest(app).get("/users/history").set("token", "invalid_token");
        expect(res.status).toBe(403);
        expect(res.body).toHaveProperty("message", "Authentication error.");
    });
});

// Interface POST /users/history
describe("Unmocked: POST /users/history", () => {
    
    const app = createServer();
    jest.setTimeout(JEST_TIMEOUT_MS);   

    beforeAll(async () => {
        await client.connect();
        await historyCollection.drop();
    });

    

    afterEach(async () => {
        await historyCollection.drop();
    });

    afterAll(async () => {
        await client.close();
    });

    // Input: Authenticated user token, valid product_id
    // Expected status code: 200
    // Expected behavior: User history is updated with the new product
    // Expected output: Confirmation message
    test("Successfully added product to empty user history", async () => {

        const token = jwt.sign(testUserA, process.env.JWT_SECRET as string);

        const res = await supertest(app).post("/users/history").set("token", token).send({ product_id: testProductAId });
        expect(res.status).toBe(200);

        const history = await historyCollection.findOne({ user_uuid: testUserA.user_uuid });
        expect(history).not.toBeNull();
        expect(history?.products).toHaveLength(1);
        expect(history?.products[0].product_id).toBe(testProductAId);
    });

    // Input: Authenticated user token, invalid product_id
    // Expected status code: 400
    // Expected behavior: None
    // Expected output: Error message
    test("Invalid product_id to empty user history", async () => {

        const token = jwt.sign(testUserA, process.env.JWT_SECRET as string);

        const res = await supertest(app).post("/users/history").set("token", token).send({ product_id: "invalid_product_id" });
        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty("message", "Product could not be added to user history.");
        const history = await historyCollection.findOne({ user_uuid: testUserA.user_uuid });
        expect(history).toBeNull();
    });

    // Input: Authenticated user token, valid product_id to non-empty user history
    // Expected status code: 200
    // Expected behavior: User history is updated with the new product
    // Expected output: Confirmation message
    test("Successfully added product to non-empty user history", async () => {

        const token = jwt.sign(testUserA, process.env.JWT_SECRET as string);
        await historyCollection.insertOne(testHistoryA);

        const res = await supertest(app).post("/users/history").set("token", token).send({ product_id: testProductBId });
        expect(res.status).toBe(200);

        const history = await historyCollection.findOne({ user_uuid: testUserA.user_uuid });
        expect(history).not.toBeNull();
        expect(history?.products).toHaveLength(2);
        expect(history?.products[1].product_id).toBe(testProductBId);
    });

    // Input: Authenticated user token, duplicate product_id to non-empty user history
    // Expected status code: 200
    // Expected behavior: Product is not added to user history
    // Expected output: Confirmation message
    test("Adding duplicate product_id to non-empty user history", async () => {

        const token = jwt.sign(testUserA, process.env.JWT_SECRET as string);
        await historyCollection.insertOne(testHistoryA);

        const res = await supertest(app).post("/users/history").set("token", token).send({ product_id: testProductAId });
        expect(res.status).toBe(200);
        const history = await historyCollection.findOne({ user_uuid: testUserA.user_uuid });
        expect(history).not.toBeNull();
        expect(history?.products).toHaveLength(2);
        expect(history?.products[0].scan_uuid).not.toBe(history?.products[1].scan_uuid);
    });

    // Input: Authenticated user token, invalid product_id to non-empty user history
    // Expected status code: 404
    // Expected behavior: None
    // Expected output: Error message
    test("Invalid product_id to non-empty user history", async () => {

        const token = jwt.sign(testUserA, process.env.JWT_SECRET as string);
        await historyCollection.insertOne(testHistoryA);

        const res = await supertest(app).post("/users/history").set("token", token).send({ product_id: "invalid_product_id" });
        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty("message", "Product could not be added to user history.");
    });

    // Input: Authenticated user token, manually add invalid product_id to history, then add another valid product_id
    // Expected status code: 200
    // Expected behavior: None
    // Expected output: Confirmation message
    test("Manually add invalid product_id to history, then add another valid product_id", async () => {

        const token = jwt.sign(testUserA, process.env.JWT_SECRET as string);
        await historyCollection.insertOne({
            user_uuid: testUserA.user_uuid,
            products: [{ product_id: "invalid_product_id_1", timestamp: new Date(), scan_uuid: "uuid_1" }],
            ecoscore_score: 0
        });

        const res = await supertest(app).post("/users/history").set("token", token).send({ product_id: testProductAId });
        expect(res.status).toBe(200);
        const history = await historyCollection.findOne({ user_uuid: testUserA.user_uuid });
        expect(history).not.toBeNull();
        expect(history?.products).toHaveLength(2);
        expect(history?.products[1].product_id).toBe(testProductAId);
        expect(history?.products[0].product_id).toBe("invalid_product_id_1");
        expect(history?.ecoscore_score).toBe(testProductA.ecoscore_score as number / 2);
    });

    // Input: No token provided
    // Expected status code: 401
    // Expected behavior: None
    // Expected output: Error message
    test("Access without token", async () => {
        const res = await supertest(app).post("/users/history");
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("message", "No token provided.");
    });

    // Input: Invalid token provided
    // Expected status code: 403
    // Expected behavior: None
    // Expected output: Error message
    test("Access with invalid token", async () => {
        const res = await supertest(app).post("/users/history").set("token", "invalid_token");
        expect(res.status).toBe(403);
        expect(res.body).toHaveProperty("message", "Authentication error.");
    });
});

// Interface DELETE /users/history
describe("Unmocked: DELETE /users/history", () => {
    
    const app = createServer();
    jest.setTimeout(JEST_TIMEOUT_MS);   

    beforeAll(async () => {
        await client.connect();
        await historyCollection.drop();
    });

    

    afterEach(async () => {
        await historyCollection.drop();
    });

    afterAll(async () => {
        await client.close();
    });

    // Input: Authenticated user token, valid scan_uuid
    // Expected status code: 200
    // Expected behavior: History entry is deleted
    // Expected output: Confirmation message
    test("Successfully deleted history entry with valid scan_uuid", async () => {

        const token = jwt.sign(testUserA, process.env.JWT_SECRET as string);
        await historyCollection.insertOne(testHistoryA);

        const res = await supertest(app).delete("/users/history").set("token", token).query({ scan_uuid: testHistoryA.products[0].scan_uuid });
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("message", "History entry deleted");

        const history = await historyCollection.findOne({ user_uuid: testUserA.user_uuid });
        expect(history).not.toBeNull();
        expect(history?.products).toHaveLength(testHistoryA.products.length - 1);
    });

    // Input: Authenticated user token, invalid scan_uuid
    // Expected status code: 404
    // Expected behavior: None
    // Expected output: Error message
    test("Failed to delete history entry with invalid scan_uuid", async () => {

        const token = jwt.sign(testUserA, process.env.JWT_SECRET as string);
        await historyCollection.insertOne(testHistoryA);

        const res = await supertest(app).delete("/users/history").set("token", token).query({ scan_uuid: "invalid_scan_uuid" });
        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty("message", "History entry not found.");
    });

    // Input: No token provided
    // Expected status code: 401
    // Expected behavior: None
    // Expected output: Error message
    test("Access without token", async () => {
        const res = await supertest(app).delete("/users/history").query({ scan_uuid: "some_scan_uuid" });
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("message", "No token provided.");
    });

    // Input: Invalid token provided
    // Expected status code: 403
    // Expected behavior: None
    // Expected output: Error message
    test("Access with invalid token", async () => {
        const res = await supertest(app).delete("/users/history").set("token", "invalid_token").query({ scan_uuid: "some_scan_uuid" });
        expect(res.status).toBe(403);
        expect(res.body).toHaveProperty("message", "Authentication error.");
    });
});

// Interface POST /users/fcm_registration_token
describe("Unmocked: POST /users/fcm_registration_token", () => {
    
    const app = createServer();
    jest.setTimeout(JEST_TIMEOUT_MS);   

    beforeAll(async () => {
        await client.connect();
        await usersCollection.drop();
    });

    

    afterEach(async () => {
        await usersCollection.drop();
    });

    afterAll(async () => {
        await client.close();
    });

    // Input: Authenticated user token, valid FCM registration token
    // Expected status code: 200
    // Expected behavior: FCM registration token is updated
    // Expected output: Confirmation message
    test("Successfully updated FCM registration token", async () => {

        const token = jwt.sign(testUserA, process.env.JWT_SECRET as string);
        const fcmToken = "valid_fcm_token";

        const res = await supertest(app).post("/users/fcm_registration_token").set("token", token).send({ fcm_registration_token: fcmToken });
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("message", "FCM registration token updated.");
    });

    // Input: Authenticated user token, missing FCM registration token
    // Expected status code: 400
    // Expected behavior: None
    // Expected output: Error message
    test("Failed to update FCM registration token due to missing token", async () => {

        const token = jwt.sign(testUserA, process.env.JWT_SECRET as string);

        const res = await supertest(app).post("/users/fcm_registration_token").set("token", token).send({});
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("errors");
        expect(res.body.errors).toEqual([
            {
                type: "field",
                msg: "FCM Registration Token should be a string",
                path: "fcm_registration_token",
                location: "body"
            }
        ]);
    });

    // Input: Update FCM registration token to the same token
    // Expected status code: 200
    // Expected behavior: FCM registration token is updated to the same token
    // Expected output: Confirmation message
    test("Update FCM registration token to the same token", async () => {

        const token = jwt.sign(testUserB, process.env.JWT_SECRET as string);

        const res = await supertest(app).post("/users/fcm_registration_token").set("token", token).send({ fcm_registration_token: testUserB.fcm_registration_token });
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("message", "FCM registration token updated.");
    });

    // Input: No token provided
    // Expected status code: 401
    // Expected behavior: None
    // Expected output: Error message
    test("Access without token", async () => {
        const res = await supertest(app).post("/users/fcm_registration_token").send({ fcm_registration_token: "valid_fcm_token" });
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("message", "No token provided.");
    });

    // Input: Invalid token provided
    // Expected status code: 403
    // Expected behavior: None
    // Expected output: Error message
    test("Access with invalid token", async () => {
        const res = await supertest(app).post("/users/fcm_registration_token").set("token", "invalid_token").send({ fcm_registration_token: "valid_fcm_token" });
        expect(res.status).toBe(403);
        expect(res.body).toHaveProperty("message", "Authentication error.");
    });
});

// Interface GET /users/uuid
describe("Unmocked: GET /users/uuid", () => {
    
    const app = createServer();
    jest.setTimeout(JEST_TIMEOUT_MS);   

    beforeAll(async () => {
        await client.connect();
        await usersCollection.drop();
    });

    

    afterEach(async () => {
        await usersCollection.drop();
    });

    afterAll(async () => {
        await client.close();
    });

    // Input: Authenticated user token
    // Expected status code: 200
    // Expected behavior: None
    // Expected output: User UUID
    test("Successfully retrieve user UUID with valid token", async () => {

        const token = jwt.sign(testUserA, process.env.JWT_SECRET as string);
        await usersCollection.insertOne(testUserA);
        const res = await supertest(app).get("/users/uuid").set("token", token);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("user_uuid", testUserA.user_uuid);
    });

    // Input: Authenticated user token
    // Expected status code: 404
    // Expected behavior: None
    // Expected output: Error message
    test("User not found", async () => {
        const token = jwt.sign(testUserA, process.env.JWT_SECRET as string);    
        const res = await supertest(app).get("/users/uuid").set("token", token);
        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty("message", "User not found.");
    });

    // Input: No token provided
    // Expected status code: 401
    // Expected behavior: None
    // Expected output: Error message
    test("Access without token", async () => {
        const res = await supertest(app).get("/users/uuid");
        
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("message", "No token provided.");
    });

    // Input: Invalid token provided
    // Expected status code: 403
    // Expected behavior: None
    // Expected output: Error message
    test("Access with invalid token", async () => {
        const res = await supertest(app).get("/users/uuid").set("token", "invalid_token");
        expect(res.status).toBe(403);
        expect(res.body).toHaveProperty("message", "Authentication error.");
    });
});


// Interface GET /users/ecoscore_score
describe("Unmocked: GET /users/ecoscore_score", () => {
    
    const app = createServer();
    jest.setTimeout(JEST_TIMEOUT_MS);   

    beforeAll(async () => {
        await client.connect();
        await usersCollection.drop();
        await historyCollection.drop();
    });

    

    afterEach(async () => {
        await usersCollection.drop();
        await historyCollection.drop();
    });

    afterAll(async () => {
        await client.close();
    });

    // Input: Authenticated user token without products in history
    // Expected status code: 404
    // Expected behavior: None
    // Expected output: Error message
    test("User has no history", async () => {

        const token = jwt.sign(testUserB, process.env.JWT_SECRET as string);

        await historyCollection.insertOne(testHistoryB);

        const res = await supertest(app).get("/users/ecoscore_score").set("token", token);
        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty("message", "No history found for the user.");
    });

    // Input: Authenticated user token with history
    // Expected status code: 200
    // Expected behavior: Return ecoscore
    // Expected output: Ecoscore
    test("Successfully retrieve ecoscore with valid token", async () => {

        const token = jwt.sign(testUserC, process.env.JWT_SECRET as string);

        await historyCollection.insertOne(testHistoryC);

        const res = await supertest(app).get("/users/ecoscore_score").set("token", token);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("ecoscore_score", 51);
    });

    // Input: Authenticated user token without history document
    // Expected status code: 404
    // Expected behavior: None
    // Expected output: Error message
    test("User has no history document", async () => {
        const token = jwt.sign(testUserA, process.env.JWT_SECRET as string);

        const res = await supertest(app).get("/users/ecoscore_score").set("token", token);
        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty("message", "No history found for the user.");
    });

    // Input: Authenticated user token with no longer valid product_id in history
    // Expected status code: 404
    // Expected behavior: None
    // Expected output: Error message
    test("User has no longer valid product_id in history", async () => {
        const token = jwt.sign(testUserD, process.env.JWT_SECRET!);

        await historyCollection.insertOne(testHistoryD);

        const res = await supertest(app).get("/users/ecoscore_score").set("token", token);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("ecoscore_score", 0);
    });

    // Input: No token provided
    // Expected status code: 401
    // Expected behavior: None
    // Expected output: Error message
    test("Access without token", async () => {
        const res = await supertest(app).get("/users/ecoscore_score");
        
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("message", "No token provided.");
    });

    // Input: Invalid token provided
    // Expected status code: 403
    // Expected behavior: None
    // Expected output: Error message
    test("Access with invalid token", async () => {
        const res = await supertest(app).get("/users/ecoscore_score").set("token", "invalid_token");
        expect(res.status).toBe(403);
        expect(res.body).toHaveProperty("message", "Authentication error.");
    });
});