import { createServer } from "../../utils";
import supertest from "supertest";
import { client, friendsCollection, historyCollection, usersCollection, usersDatabase } from "../../services";
import {
    testUserA,
    testUserB,
    testFriendsA,
    testFriendsB,
    JEST_TIMEOUT_MS,
    testUserE,
    testFriendsE,
    testUserC,
    testUserD,
    testFriendsC,
    testFriendsD,
    testHistoryC,
    testHistoryD
} from "../res/data";
import jwt from "jsonwebtoken";

// Interface POST /friends/requests
describe("Mocked: POST /friends/requests", () => {
    
    const app = createServer();
    jest.setTimeout(JEST_TIMEOUT_MS);   

    beforeAll(async () => {
        await client.connect();
    });

    beforeEach(async () => {
        await usersDatabase.dropDatabase();
    });

    afterEach(async () => {
        jest.clearAllMocks();
        jest.resetAllMocks();
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        await usersDatabase.dropDatabase();
        await client.close();
    });

    // Input: Authenticated user token, valid friend UUID
    // Expected status code: 200
    // Expected behavior: Friend request and notification is sent
    // Expected output: Confirmation message
    test("Successfully sent friend request", async () => {
        const token = jwt.sign(testUserB, process.env.JWT_SECRET as string);

        await usersCollection.insertOne(testUserE);
        await usersCollection.insertOne(testUserB);
        await friendsCollection.insertOne(testFriendsE);
        await friendsCollection.insertOne(testFriendsB);

        jest.spyOn(require('firebase-admin/app'), 'getApps').mockReturnValue([{ name: 'mock-app' }]);

        jest.spyOn(require('firebase-admin/messaging'), 'getMessaging').mockReturnValue({
            send: jest.fn().mockResolvedValue({
                responses: [{
                    success: true,
                    fcm_messaging: "some_value"
                }]
            })
        });

        const res = await supertest(app)
            .post("/friends/requests")
            .set("token", token)
            .send({ user_uuid: testUserE.user_uuid });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("message", "Friend request sent.");

        const targetFriends = await friendsCollection.findOne({ user_uuid: testUserE.user_uuid });
        expect(targetFriends).not.toBeNull();
        expect(targetFriends?.incoming_requests).toContainEqual({
            user_uuid: testUserB.user_uuid,
            name: testUserB.name
        });
    });

    // Input: Authenticated user token, firebase error
    // Expected status code: 200
    // Expected behavior: Friend request but notification is not sent
    // Expected output: Confirmation message
    test("Friend request sent but notification not sent, firebase error", async () => {
        const token = jwt.sign(testUserB, process.env.JWT_SECRET as string);

        await usersCollection.insertOne(testUserE);
        await usersCollection.insertOne(testUserB);
        await friendsCollection.insertOne(testFriendsE);
        await friendsCollection.insertOne(testFriendsB);

        jest.spyOn(require('firebase-admin/app'), 'getApps').mockReturnValue([{ name: 'mock-app' }]);

        jest.spyOn(require('firebase-admin/messaging'), 'getMessaging').mockReturnValue({
            send: jest.fn().mockRejectedValue(new Error("Firebase error"))
        });

        const res = await supertest(app)
            .post("/friends/requests")
            .set("token", token)
            .send({ user_uuid: testUserE.user_uuid });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("message", "Friend request sent.");

        const targetFriends = await friendsCollection.findOne({ user_uuid: testUserE.user_uuid });
        expect(targetFriends).not.toBeNull();
        expect(targetFriends?.incoming_requests).toContainEqual({
            user_uuid: testUserB.user_uuid,
            name: testUserB.name
        });
    });

    // Input: Authenticated user token, database error
    // Expected status code: 500
    // Expected behavior: None
    // Expected output: Error message
    test("Database error, friends database", async () => {

        jest.spyOn(friendsCollection, "findOne").mockImplementationOnce(() => {
            throw new Error("Database error");
        });

        const token = jwt.sign(testUserB, process.env.JWT_SECRET as string);
        
        const res = await supertest(app)
            .post("/friends/requests")
            .set("token", token)
            .send({ user_uuid: testUserE.user_uuid });

        expect(res.status).toBe(500);
    });

    // Input: Authenticated user token, database error
    // Expected status code: 500
    // Expected behavior: None
    // Expected output: Error message
    test("Database error, users database", async () => {

        friendsCollection.insertOne(testFriendsB);

        jest.spyOn(usersCollection, "findOne").mockImplementationOnce(() => {
            throw new Error("Database error");
        });

        const token = jwt.sign(testUserB, process.env.JWT_SECRET as string);
        
        const res = await supertest(app)
            .post("/friends/requests")
            .set("token", token)
            .send({ user_uuid: testUserE.user_uuid });

        expect(res.status).toBe(500);
    });

});

// Interface POST /friends/requests/accept
describe("Mocked: POST /friends/requests/accept", () => {
    
    const app = createServer();
    jest.setTimeout(JEST_TIMEOUT_MS);   

    beforeAll(async () => {
        await client.connect();
    });

    beforeEach(async () => {
        await usersDatabase.dropDatabase();
    });

    afterEach(async () => {
        jest.clearAllMocks();
        jest.resetAllMocks();
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        await usersDatabase.dropDatabase();
        await client.close();
    });

    // Input: Authenticated user token, valid friend UUID
    // Expected status code: 200
    // Expected behavior: Friend request accepted and notification is sent
    // Expected output: Confirmation message
    test("Successfully accepted friend request", async () => {
        const token = jwt.sign(testUserB, process.env.JWT_SECRET as string);

        await usersCollection.insertOne(testUserB);
        await usersCollection.insertOne(testUserA);
        await friendsCollection.insertOne(testFriendsB);
        await friendsCollection.insertOne(testFriendsA);

        jest.spyOn(require('firebase-admin/app'), 'getApps').mockReturnValue([{ name: 'mock-app' }]);

        jest.spyOn(require('firebase-admin/messaging'), 'getMessaging').mockReturnValue({
            send: jest.fn().mockResolvedValue({
                responses: [{
                    success: true,
                    fcm_messaging: "some_value"
                }]
            })
        });

        const res = await supertest(app)
            .post("/friends/requests/accept")
            .set("token", token)
            .send({ user_uuid: testUserA.user_uuid });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("message", "Friend request accepted.");

        const userFriends = await friendsCollection.findOne({ user_uuid: testUserB.user_uuid });
        expect(userFriends).not.toBeNull();
        expect(userFriends?.friends).toContainEqual({
            user_uuid: testUserA.user_uuid,
            name: testUserA.name
        });
    });

    // Input: Authenticated user token, firebase error
    // Expected status code: 200
    // Expected behavior: Friend request accepted but notification is not sent
    // Expected output: Confirmation message
    test("Friend request accepted but notification not sent, firebase error", async () => {
        const token = jwt.sign(testUserB, process.env.JWT_SECRET as string);

        await usersCollection.insertOne(testUserB);
        await usersCollection.insertOne(testUserA);
        await friendsCollection.insertOne(testFriendsB);
        await friendsCollection.insertOne(testFriendsA);

        jest.spyOn(require('firebase-admin/app'), 'getApps').mockReturnValue([{ name: 'mock-app' }]);

        jest.spyOn(require('firebase-admin/messaging'), 'getMessaging').mockReturnValue({
            send: jest.fn().mockRejectedValue(new Error("Firebase error"))
        });

        const res = await supertest(app)
            .post("/friends/requests/accept")
            .set("token", token)
            .send({ user_uuid: testUserA.user_uuid });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("message", "Friend request accepted.");

        const userFriends = await friendsCollection.findOne({ user_uuid: testUserB.user_uuid });
        expect(userFriends).not.toBeNull();
        expect(userFriends?.friends).toContainEqual({
            user_uuid: testUserA.user_uuid,
            name: testUserA.name
        });
    });

    // Input: Authenticated user token, database error
    // Expected status code: 500
    // Expected behavior: None
    // Expected output: Error message
    test("Database error, friends database", async () => {

        jest.spyOn(friendsCollection, "findOne").mockImplementationOnce(() => {
            throw new Error("Database error");
        });

        const token = jwt.sign(testUserB, process.env.JWT_SECRET as string);
        
        const res = await supertest(app)
            .post("/friends/requests/accept")
            .set("token", token)
            .send({ user_uuid: testUserA.user_uuid });

        expect(res.status).toBe(500);
    });

    // Input: Authenticated user token, database error
    // Expected status code: 500
    // Expected behavior: None
    // Expected output: Error message
    test("Database error, users database", async () => {

        friendsCollection.insertOne(testFriendsB);

        jest.spyOn(usersCollection, "findOne").mockImplementationOnce(() => {
            throw new Error("Database error");
        });

        const token = jwt.sign(testUserB, process.env.JWT_SECRET as string);
        
        const res = await supertest(app)
            .post("/friends/requests/accept")
            .set("token", token)
            .send({ user_uuid: testUserE.user_uuid });

        expect(res.status).toBe(500);
    });
});

// Interface DELETE /friends
describe("Mocked: DELETE /friends", () => {
    
    const app = createServer();
    jest.setTimeout(JEST_TIMEOUT_MS);   

    beforeAll(async () => {
        await client.connect();
    });

    beforeEach(async () => {
        await usersDatabase.dropDatabase();
    });

    afterEach(async () => {
        jest.clearAllMocks();
        jest.resetAllMocks();
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        await usersDatabase.dropDatabase();
        await client.close();
    });

    // Input: Authenticated user token, database error
    // Expected status code: 500
    // Expected behavior: None
    // Expected output: Error message
    test("Database error, friends database", async () => {

        jest.spyOn(friendsCollection, "updateOne").mockImplementationOnce(() => {
            throw new Error("Database error");
        });

        const token = jwt.sign(testUserB, process.env.JWT_SECRET as string);
        
        const res = await supertest(app)
            .delete("/friends")
            .set("token", token)
            .query({ user_uuid: testUserA.user_uuid });

        expect(res.status).toBe(500);
    });
});

// Interface DELETE /friends/requests
describe("Mocked: DELETE /friends/requests", () => {
    
    const app = createServer();
    jest.setTimeout(JEST_TIMEOUT_MS);   

    beforeAll(async () => {
        await client.connect();
    });

    beforeEach(async () => {
        await usersDatabase.dropDatabase();
    });

    afterEach(async () => {
        jest.clearAllMocks();
        jest.resetAllMocks();
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        await usersDatabase.dropDatabase();
        await client.close();
    });

    // Input: Authenticated user token, database error
    // Expected status code: 500
    // Expected behavior: None
    // Expected output: Error message
    test("Database error, friends database", async () => {

        jest.spyOn(friendsCollection, "updateOne").mockImplementationOnce(() => {
            throw new Error("Database error");
        });

        const token = jwt.sign(testUserB, process.env.JWT_SECRET as string);
        
        const res = await supertest(app)
            .delete("/friends")
            .set("token", token)
            .query({ user_uuid: testUserA.user_uuid });

        expect(res.status).toBe(500);
    });
});

// Interface GET /friends
describe("Mocked: GET /friends", () => {
    
    const app = createServer();
    jest.setTimeout(JEST_TIMEOUT_MS);   

    beforeAll(async () => {
        await client.connect();
    });

    beforeEach(async () => {
        await usersDatabase.dropDatabase();
    });

    afterEach(async () => {
        jest.clearAllMocks();
        jest.resetAllMocks();
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        await usersDatabase.dropDatabase();
        await client.close();
    });

    // Input: Authenticated user token, database error
    // Expected status code: 500
    // Expected behavior: None
    // Expected output: Error message
    test("Database error, friends database", async () => {

        jest.spyOn(friendsCollection, "findOne").mockImplementationOnce(() => {
            throw new Error("Database error");
        });

        const token = jwt.sign(testUserB, process.env.JWT_SECRET as string);
        
        const res = await supertest(app)
            .get("/friends")
            .set("token", token);

        expect(res.status).toBe(500);
    });
});

// Interface GET /friends/requests
describe("Mocked: GET /friends/requests", () => {
    
    const app = createServer();
    jest.setTimeout(JEST_TIMEOUT_MS);   

    beforeAll(async () => {
        await client.connect();
    });

    beforeEach(async () => {
        await usersDatabase.dropDatabase();
    });

    afterEach(async () => {
        jest.clearAllMocks();
        jest.resetAllMocks();
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        await usersDatabase.dropDatabase();
        await client.close();
    });

    // Input: Authenticated user token, database error
    // Expected status code: 500
    // Expected behavior: None
    // Expected output: Error message
    test("Database error, friends database", async () => {

        jest.spyOn(friendsCollection, "findOne").mockImplementationOnce(() => {
            throw new Error("Database error");
        });

        const token = jwt.sign(testUserB, process.env.JWT_SECRET as string);
        
        const res = await supertest(app)
            .get("/friends/requests")
            .set("token", token);

        expect(res.status).toBe(500);
    });
});

// Interface GET /friends/requests/outgoing
describe("Mocked: GET /friends/requests/outgoing", () => {
    
    const app = createServer();
    jest.setTimeout(JEST_TIMEOUT_MS);   

    beforeAll(async () => {
        await client.connect();
    });

    beforeEach(async () => {
        await usersDatabase.dropDatabase();
    });

    afterEach(async () => {
        jest.clearAllMocks();
        jest.resetAllMocks();
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        await usersDatabase.dropDatabase();
        await client.close();
    });

    // Input: Authenticated user token, database error
    // Expected status code: 500
    // Expected behavior: None
    // Expected output: Error message
    test("Database error, friends database", async () => {

        jest.spyOn(friendsCollection, "find").mockImplementationOnce(() => {
            throw new Error("Database error");
        });

        const token = jwt.sign(testUserB, process.env.JWT_SECRET as string);
        
        const res = await supertest(app)
            .get("/friends/requests/outgoing")
            .set("token", token);

        expect(res.status).toBe(500);
    });

    // Input: Authenticated user token, database error
    // Expected status code: 500
    // Expected behavior: None
    // Expected output: Error message
    test("Database error, users database", async () => {

        await usersCollection.insertOne(testUserA);
        await usersCollection.insertOne(testUserB);
        await friendsCollection.insertOne(testFriendsA);
        await friendsCollection.insertOne(testFriendsB);

        jest.spyOn(usersCollection, "findOne").mockImplementationOnce(() => {
            throw new Error("Database error");
        });

        const token = jwt.sign(testUserA, process.env.JWT_SECRET as string);
        
        const res = await supertest(app)
            .get("/friends/requests/outgoing")
            .set("token", token);

        expect(res.status).toBe(500);
    });
});

// Interface GET /friends/history/:user_uuid
describe("Mocked: GET /friends/history/:user_uuid", () => {
    
    const app = createServer();
    jest.setTimeout(JEST_TIMEOUT_MS);   

    beforeAll(async () => {
        await client.connect();
    });

    beforeEach(async () => {
        await usersDatabase.dropDatabase();
    });

    afterEach(async () => {
        jest.clearAllMocks();
        jest.resetAllMocks();
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        await usersDatabase.dropDatabase();
        await client.close();
    });

    // Input: Authenticated user token, database error on friends collection
    // Expected status code: 500
    // Expected behavior: None
    // Expected output: Error message
    test("Database error, friends collection", async () => {

        jest.spyOn(friendsCollection, "findOne").mockImplementationOnce(() => {
            throw new Error("Database error");
        });

        await usersCollection.insertOne(testUserC);
        await usersCollection.insertOne(testUserD);
        await friendsCollection.insertOne(testFriendsC);
        await friendsCollection.insertOne(testFriendsD);

        const token = jwt.sign(testUserC, process.env.JWT_SECRET as string);
        
        const res = await supertest(app)
            .get(`/friends/history/${testUserD.user_uuid}`)
            .set("token", token);

        expect(res.status).toBe(500);
    });

    // Input: Authenticated user token, database error on history collection
    // Expected status code: 500
    // Expected behavior: None
    // Expected output: Error message
    test("Database error, history collection", async () => {

        jest.spyOn(historyCollection, "find").mockImplementationOnce(() => {
            throw new Error("Database error");
        });

        await usersCollection.insertOne(testUserC);
        await usersCollection.insertOne(testUserD);
        await friendsCollection.insertOne(testFriendsC);
        await friendsCollection.insertOne(testFriendsD);

        const token = jwt.sign(testUserC, process.env.JWT_SECRET as string);
        
        const res = await supertest(app)
            .get(`/friends/history/${testUserD.user_uuid}`)
            .set("token", token);

        expect(res.status).toBe(500);
    });
});

// Interface POST /friends/notifications
describe("Mocked: POST /friends/notifications", () => {
    
    const app = createServer();
    jest.setTimeout(JEST_TIMEOUT_MS);   

    beforeAll(async () => {
        await client.connect();
    });

    beforeEach(async () => {
        await usersDatabase.dropDatabase();
    });

    afterEach(async () => {
        jest.clearAllMocks();
        jest.resetAllMocks();
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        await usersDatabase.dropDatabase();
        await client.close();
    });

    // Input: Authenticated user token, valid friend UUID, valid scan UUID
    // Expected status code: 200
    // Expected behavior: Notification sent
    // Expected output: Confirmation message
    test("Send product notification to user without FCM token, shame", async () => {
        const token = jwt.sign(testUserD, process.env.JWT_SECRET as string);

        await usersCollection.insertOne({...testUserC, fcm_registration_token: "fcm-token-C"});
        await usersCollection.insertOne(testUserD);

        await friendsCollection.insertOne(testFriendsD);
        await friendsCollection.insertOne(testFriendsC);

        await historyCollection.insertOne(testHistoryD);
        await historyCollection.insertOne(testHistoryC);

        jest.spyOn(require('firebase-admin/app'), 'getApps').mockReturnValue([{ name: 'mock-app' }]);

        jest.spyOn(require('firebase-admin/messaging'), 'getMessaging').mockReturnValue({
            send: jest.fn().mockResolvedValue({
                responses: [{
                    success: true,
                    fcm_messaging: "some_value"
                }]
            })
        });

        const res = await supertest(app)
            .post("/friends/notifications")
            .set("token", token)
            .send({
                user_uuid: testUserC.user_uuid,
                scan_uuid: testHistoryC.products[0].scan_uuid,
                message_type: "shame"
            });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("message", "Notification sent.");
    });

    // Input: Authenticated user token, valid friend UUID, valid scan UUID, firebase error
    // Expected status code: 500
    // Expected behavior: None
    // Expected output: Error message
    test("Send product notification to user without FCM token, praise", async () => {
        const token = jwt.sign(testUserD, process.env.JWT_SECRET as string);

        await usersCollection.insertOne({...testUserC, fcm_registration_token: "fcm-token-C"});
        await usersCollection.insertOne(testUserD);

        await friendsCollection.insertOne(testFriendsD);
        await friendsCollection.insertOne(testFriendsC);

        await historyCollection.insertOne(testHistoryD);
        await historyCollection.insertOne(testHistoryC);

        jest.spyOn(require('firebase-admin/app'), 'getApps').mockReturnValue([{ name: 'mock-app' }]);

        jest.spyOn(require('firebase-admin/messaging'), 'getMessaging').mockReturnValue({
            send: jest.fn().mockRejectedValue(new Error("Firebase error"))
        });

        const res = await supertest(app)
            .post("/friends/notifications")
            .set("token", token)
            .send({
                user_uuid: testUserC.user_uuid,
                scan_uuid: testHistoryC.products[0].scan_uuid,
                message_type: "praise"
            });

        expect(res.status).toBe(500);
        expect(res.body).toHaveProperty("message", "Error sending notification.");
    });

    // Input: Authenticated user token, database error on friends collection
    // Expected status code: 500
    // Expected behavior: None
    // Expected output: Error message
    test("Database error, friends collection", async () => {

        jest.spyOn(friendsCollection, "findOne").mockImplementationOnce(() => {
            throw new Error("Database error");
        });

        await usersCollection.insertOne(testUserD);
        await usersCollection.insertOne(testUserC);
        await friendsCollection.insertOne(testFriendsD);
        await friendsCollection.insertOne(testFriendsC);

        await historyCollection.insertOne(testHistoryD);
        await historyCollection.insertOne(testHistoryC);

        const token = jwt.sign(testUserD, process.env.JWT_SECRET as string);
        
        const res = await supertest(app)
            .post("/friends/notifications")
            .set("token", token)
            .send({
                user_uuid: testUserC.user_uuid,
                scan_uuid: testHistoryC.products[0].scan_uuid,
                message_type: "praise"
            });

        expect(res.status).toBe(500);
    });

    // Input: Authenticated user token, database error on users collection
    // Expected status code: 500
    // Expected behavior: None
    // Expected output: Error message
    test("Database error, users collection", async () => {

        jest.spyOn(usersCollection, "find").mockImplementationOnce(() => {
            throw new Error("Database error");
        });

        await usersCollection.insertOne(testUserD);
        await usersCollection.insertOne(testUserC);
        await friendsCollection.insertOne(testFriendsD);
        await friendsCollection.insertOne(testFriendsC);

        await historyCollection.insertOne(testHistoryD);
        await historyCollection.insertOne(testHistoryC);

        const token = jwt.sign(testUserD, process.env.JWT_SECRET as string);
        
        const res = await supertest(app)
            .post("/friends/notifications")
            .set("token", token)
            .send({
                user_uuid: testUserC.user_uuid,
                scan_uuid: testHistoryC.products[0].scan_uuid,
                message_type: "praise"
            });

        expect(res.status).toBe(500);
    });

    // Input: Authenticated user token, database error on history collection
    // Expected status code: 500
    // Expected behavior: None
    // Expected output: Error message
    test("Database error, history collection", async () => {

        jest.spyOn(historyCollection, "findOne").mockImplementationOnce(() => {
            throw new Error("Database error");
        });

        await usersCollection.insertOne(testUserD);
        await usersCollection.insertOne(testUserC);
        await friendsCollection.insertOne(testFriendsD);
        await friendsCollection.insertOne(testFriendsC);
        await historyCollection.insertOne(testHistoryD);
        await historyCollection.insertOne(testHistoryC);

        const token = jwt.sign(testUserD, process.env.JWT_SECRET as string);
        
        const res = await supertest(app)
            .post("/friends/notifications")
            .set("token", token)
            .send({
                user_uuid: testUserC.user_uuid,
                scan_uuid: testHistoryC.products[0].scan_uuid,
                message_type: "praise"
            });

        expect(res.status).toBe(500);
    });
});

// Interface GET /friends/ecoscore_score/:user_uuid
describe("Mocked: GET /friends/ecoscore_score/:user_uuid", () => {
    
    const app = createServer();
    jest.setTimeout(JEST_TIMEOUT_MS);   

    beforeAll(async () => {
        await client.connect();
    });

    beforeEach(async () => {
        await usersDatabase.dropDatabase();
    });

    afterEach(async () => {
        jest.clearAllMocks();
        jest.resetAllMocks();
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        await usersDatabase.dropDatabase();
        await client.close();
    });

    // Input: Authenticated user token, database error on friends collection
    // Expected status code: 500
    // Expected behavior: None
    // Expected output: Error message
    test("Database error, friends collection", async () => {

        jest.spyOn(friendsCollection, "findOne").mockImplementationOnce(() => {
            throw new Error("Database error");
        });

        await usersCollection.insertOne(testUserD);
        await usersCollection.insertOne(testUserC);

        const token = jwt.sign(testUserD, process.env.JWT_SECRET as string);
        
        const res = await supertest(app)
            .get(`/friends/ecoscore_score/${testUserC.user_uuid}`)
            .set("token", token);

        expect(res.status).toBe(500);
    });

    // Input: Authenticated user token, database error on history collection
    // Expected status code: 500
    // Expected behavior: None
    // Expected output: Error message
    test("Database error, history collection", async () => {

        jest.spyOn(historyCollection, "findOne").mockImplementationOnce(() => {
            throw new Error("Database error");
        });

        await usersCollection.insertOne(testUserD);
        await usersCollection.insertOne(testUserC);
        await friendsCollection.insertOne(testFriendsD);
        await friendsCollection.insertOne(testFriendsC);

        const token = jwt.sign(testUserD, process.env.JWT_SECRET as string);
        
        const res = await supertest(app)
            .get(`/friends/ecoscore_score/${testUserC.user_uuid}`)
            .set("token", token);

        expect(res.status).toBe(500);
    });

    // Input: No token provided
    // Expected status code: 401
    // Expected behavior: None
    // Expected output: Error message
    test("Get friend ecoscore without token", async () => {
        const res = await supertest(app).get(`/friends/ecoscore_score/${testUserB.user_uuid}`);
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("message", "No token provided.");
    });

    // Input: Invalid token provided
    // Expected status code: 403
    // Expected behavior: None
    // Expected output: Error message
    test("Get friend ecoscore with invalid token", async () => {
        const res = await supertest(app).get(`/friends/ecoscore_score/${testUserB.user_uuid}`).set("token", "invalid_token");
        expect(res.status).toBe(403);
        expect(res.body).toHaveProperty("message", "Authentication error.");
    });
});
