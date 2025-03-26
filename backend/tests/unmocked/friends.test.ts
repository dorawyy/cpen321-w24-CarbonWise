import { createServer } from "../../utils";
import supertest from "supertest";
import { client, friendsCollection, historyCollection, usersCollection, usersDatabase } from "../../services";
import { testUserA, testUserB, testFriendsA, testFriendsB, JEST_TIMEOUT_MS, testUserC, testUserD, testFriendsC, testFriendsD, testUserE, testFriendsE, testHistoryB, testHistoryC, testHistoryA, testHistoryD } from "../res/data";
import jwt from "jsonwebtoken";

// Interface POST /friends/requests
describe("Unmocked: POST /friends/requests", () => {
    
    const app = createServer();
    jest.setTimeout(JEST_TIMEOUT_MS);   

    beforeAll(async () => {
        await client.connect();
    });

    beforeEach(async () => {
        await usersDatabase.dropDatabase();
    });

    afterAll(async () => {
        await usersDatabase.dropDatabase();
        await client.close();
    });

    // Input: Authenticated user token, valid friend UUID
    // Expected status code: 200
    // Expected behavior: Friend request and notification is not sent
    // Expected output: Confirmation message
    test("Successfully sent friend request, target user not returned for sending notification", async () => {
        const token = jwt.sign(testUserB, process.env.JWT_SECRET as string);

        await usersCollection.insertOne(testUserA);
        await usersCollection.insertOne(testUserB);

        await friendsCollection.insertOne(testFriendsA);
        await friendsCollection.insertOne(testFriendsB);
        
        const res = await supertest(app)
            .post("/friends/requests")
            .set("token", token)
            .send({ user_uuid: testUserA.user_uuid });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("message", "Friend request sent.");

        const targetFriends = await friendsCollection.findOne({ user_uuid: testUserA.user_uuid });
        expect(targetFriends).not.toBeNull();
        expect(targetFriends?.incoming_requests).toContainEqual({ user_uuid: testUserB.user_uuid, name: testUserB.name });
    });

    // Input: Authenticated user token, already friends
    // Expected status code: 400
    // Expected behavior: None
    // Expected output: Error message
    test("Already friends", async () => {
        const token = jwt.sign(testUserC, process.env.JWT_SECRET as string);

        await usersCollection.insertOne(testUserC);
        await usersCollection.insertOne(testUserD);

        await friendsCollection.insertOne(testFriendsC);
        await friendsCollection.insertOne(testFriendsD);
        
        const res = await supertest(app)
            .post("/friends/requests")
            .set("token", token)
            .send({ user_uuid: testUserD.user_uuid });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("message", "Already friends.");
    });

    // Input: Authenticated user token, already sent request
    // Expected status code: 400
    // Expected behavior: None
    // Expected output: Error message
    test("Already sent request", async () => {
        const token = jwt.sign(testUserA, process.env.JWT_SECRET as string);

        await usersCollection.insertOne(testUserA);
        await usersCollection.insertOne(testUserB);

        await friendsCollection.insertOne(testFriendsA);
        await friendsCollection.insertOne(testFriendsB);
        
        const res = await supertest(app)
            .post("/friends/requests")
            .set("token", token)
            .send({ user_uuid: testUserB.user_uuid });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("message", "Friend request already sent.");
    });

    // Input: Authenticated user token, sending request to self
    // Expected status code: 400
    // Expected behavior: None
    // Expected output: Error message
    test("Cannot send friend request to yourself", async () => {
        const token = jwt.sign(testUserA, process.env.JWT_SECRET as string);

        const res = await supertest(app)
            .post("/friends/requests")
            .set("token", token)
            .send({ user_uuid: testUserA.user_uuid });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("message", "Cannot send friend request to yourself.");
    });

    // Input: Authenticated user token, non-existent friend UUID
    // Expected status code: 400
    // Expected behavior: None
    // Expected output: Error message
    test("Cannot send friend request to non-existent user", async () => {
        const token = jwt.sign(testUserA, process.env.JWT_SECRET as string);

        const res = await supertest(app)
            .post("/friends/requests")
            .set("token", token)
            .send({ user_uuid: "non_existent_uuid" });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("message", "User does not exist.");
    });

    // Input: No token provided
    // Expected status code: 401
    // Expected behavior: None
    // Expected output: Error message
    test("Access without token", async () => {
        const res = await supertest(app).post("/friends/requests");
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("message", "No token provided.");
    });

    // Input: Invalid token provided
    // Expected status code: 403
    // Expected behavior: None
    // Expected output: Error message
    test("Access with invalid token", async () => {
        const res = await supertest(app).post("/friends/requests").set("token", "invalid_token");
        expect(res.status).toBe(403);
        expect(res.body).toHaveProperty("message", "Authentication error.");
    });
});

// Interface POST /friends/requests/accept
describe("Unmocked: POST /friends/requests/accept", () => {
    
    const app = createServer();
    jest.setTimeout(JEST_TIMEOUT_MS);   

    beforeAll(async () => {
        await client.connect();
    });

    beforeEach(async () => {
        await usersDatabase.dropDatabase();
    });

    afterAll(async () => {
        await usersDatabase.dropDatabase();
        await client.close();
    });

    // Input: Authenticated user token, valid friend UUID
    // Expected status code: 200
    // Expected behavior: Friend request is accepted
    // Expected output: Confirmation message
    test("Successfully accepted friend request", async () => {
        const token = jwt.sign(testUserB, process.env.JWT_SECRET as string);

        await usersCollection.insertOne(testUserA);
        await usersCollection.insertOne(testUserB);

        await friendsCollection.insertOne(testFriendsA);
        await friendsCollection.insertOne(testFriendsB);

        const res = await supertest(app)
            .post("/friends/requests/accept")
            .set("token", token)
            .send({ user_uuid: testUserA.user_uuid });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("message", "Friend request accepted.");

        const userAFriends = await friendsCollection.findOne({ user_uuid: testUserA.user_uuid });
        expect(userAFriends).not.toBeNull();
        expect(userAFriends?.friends).toContainEqual({ user_uuid: testUserB.user_uuid, name: testUserB.name });

        const userBFriends = await friendsCollection.findOne({ user_uuid: testUserB.user_uuid });
        expect(userBFriends).not.toBeNull();
        expect(userBFriends?.friends).toContainEqual({ user_uuid: testUserA.user_uuid, name: testUserA.name });
    });

    // Input: Authenticated user token, no such friend request
    // Expected status code: 400
    // Expected behavior: None
    // Expected output: Error message
    test("No such friend request", async () => {
        const token = jwt.sign(testUserB, process.env.JWT_SECRET as string);

        await usersCollection.insertOne(testUserA);
        await usersCollection.insertOne(testUserB);

        await friendsCollection.insertOne({
            user_uuid: testUserA.user_uuid,
            incoming_requests: [],
            friends: []
        });

        const res = await supertest(app)
            .post("/friends/requests/accept")
            .set("token", token)
            .send({ user_uuid: testUserA.user_uuid });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("message", "No such friend request.");
    });

    // Input: Authenticated user token, friends document does not exist
    // Expected status code: 200
    // Expected behavior: None
    // Expected output: Confirmation message
    test("Friend does not exist, make friends document and accept", async () => {
        const token = jwt.sign(testUserB, process.env.JWT_SECRET as string);

        await usersCollection.insertOne(testUserA);
        await usersCollection.insertOne(testUserB);

        await friendsCollection.insertOne(testFriendsB);

        const res = await supertest(app)
            .post("/friends/requests/accept")
            .set("token", token)
            .send({ user_uuid: testUserA.user_uuid });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("message", "Friend request accepted.");

        const userAFriends = await friendsCollection.findOne({ user_uuid: testUserA.user_uuid });
        expect(userAFriends).not.toBeNull();
        expect(userAFriends?.friends).toContainEqual({ user_uuid: testUserB.user_uuid, name: testUserB.name });

        const userBFriends = await friendsCollection.findOne({ user_uuid: testUserB.user_uuid });
        expect(userBFriends).not.toBeNull();
        expect(userBFriends?.friends).toContainEqual({ user_uuid: testUserA.user_uuid, name: testUserA.name });
    });

    // Input: Authenticated user token, accepting request from self
    // Expected status code: 400
    // Expected behavior: None
    // Expected output: Error message
    test("Cannot accept friend request from yourself", async () => {
        const token = jwt.sign(testUserA, process.env.JWT_SECRET as string);

        const res = await supertest(app)
            .post("/friends/requests/accept")
            .set("token", token)
            .send({ user_uuid: testUserA.user_uuid });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("message", "Cannot accept friend request from yourself.");
    });

    // Input: No token provided
    // Expected status code: 401
    // Expected behavior: None
    // Expected output: Error message
    test("Access without token", async () => {
        const res = await supertest(app).post("/friends/requests/accept");
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("message", "No token provided.");
    });

    // Input: Invalid token provided
    // Expected status code: 403
    // Expected behavior: None
    // Expected output: Error message
    test("Access with invalid token", async () => {
        const res = await supertest(app).post("/friends/requests/accept").set("token", "invalid_token");
        expect(res.status).toBe(403);
        expect(res.body).toHaveProperty("message", "Authentication error.");
    });
});


// Interface DELETE /friends
describe("Unmocked: DELETE /friends", () => {
    
    const app = createServer();
    jest.setTimeout(JEST_TIMEOUT_MS);   

    beforeAll(async () => {
        await client.connect();
    });

    beforeEach(async () => {
        await usersDatabase.dropDatabase();
    });

    afterAll(async () => {
        await usersDatabase.dropDatabase();
        await client.close();
    });

    // Input: Authenticated user token, valid friend UUID
    // Expected status code: 200
    // Expected behavior: Friend is removed
    // Expected output: Confirmation message
    test("Successfully remove friend", async () => {
        const token = jwt.sign(testUserB, process.env.JWT_SECRET as string);

        await usersCollection.insertOne(testUserA);
        await usersCollection.insertOne(testUserB);

        await friendsCollection.insertOne({
            user_uuid: testUserA.user_uuid,
            friends: [{ user_uuid: testUserB.user_uuid, name: testUserB.name }],
            incoming_requests: []
        });

        await friendsCollection.insertOne({
            user_uuid: testUserB.user_uuid,
            friends: [{ user_uuid: testUserA.user_uuid, name: testUserA.name }],
            incoming_requests: []
        });

        const res = await supertest(app)
            .delete("/friends")
            .set("token", token)
            .query({ user_uuid: testUserA.user_uuid });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("message", "Friend removed.");

        const userAFriends = await friendsCollection.findOne({ user_uuid: testUserA.user_uuid });
        expect(userAFriends).not.toBeNull();
        expect(userAFriends?.friends).not.toContainEqual({ user_uuid: testUserB.user_uuid, name: testUserB.name });

        const userBFriends = await friendsCollection.findOne({ user_uuid: testUserB.user_uuid });
        expect(userBFriends).not.toBeNull();
        expect(userBFriends?.friends).not.toContainEqual({ user_uuid: testUserA.user_uuid, name: testUserA.name });
    });

    // Input: Authenticated user token, friend not found
    // Expected status code: 404
    // Expected behavior: None
    // Expected output: Error message
    test("Friend not found", async () => {
        const token = jwt.sign(testUserB, process.env.JWT_SECRET as string);

        await usersCollection.insertOne(testUserA);
        await usersCollection.insertOne(testUserB);

        await friendsCollection.insertOne({
            user_uuid: testUserA.user_uuid,
            friends: [],
            incoming_requests: []
        });

        const res = await supertest(app)
            .delete("/friends")
            .set("token", token)
            .query({ user_uuid: testUserA.user_uuid });

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty("message", "Friend not found.");
    });

    // Input: Authenticated user token, removing self as friend
    // Expected status code: 400
    // Expected behavior: None
    // Expected output: Error message
    test("Cannot remove yourself as a friend", async () => {
        const token = jwt.sign(testUserA, process.env.JWT_SECRET as string);

        const res = await supertest(app)
            .delete("/friends")
            .set("token", token)
            .query({ user_uuid: testUserA.user_uuid });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("message", "Cannot remove yourself as a friend.");
    });

    // Input: No token provided
    // Expected status code: 401
    // Expected behavior: None
    // Expected output: Error message
    test("Access without token", async () => {
        const res = await supertest(app).delete("/friends").query({ user_uuid: testUserA.user_uuid });
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("message", "No token provided.");
    });

    // Input: Invalid token provided
    // Expected status code: 403
    // Expected behavior: None
    // Expected output: Error message
    test("Access with invalid token", async () => {
        const res = await supertest(app).delete("/friends").set("token", "invalid_token").query({ user_uuid: testUserA.user_uuid });
        expect(res.status).toBe(403);
        expect(res.body).toHaveProperty("message", "Authentication error.");
    });
});

// Interface DELETE /friends/requests
describe("Unmocked: DELETE /friends/requests", () => {
    
    const app = createServer();
    jest.setTimeout(JEST_TIMEOUT_MS);   

    beforeAll(async () => {
        await client.connect();
    });

    beforeEach(async () => {
        await usersDatabase.dropDatabase();
    });

    afterAll(async () => {
        await usersDatabase.dropDatabase();
        await client.close();
    });

    // Input: Authenticated user token, valid friend request UUID
    // Expected status code: 200
    // Expected behavior: Friend request is rejected
    // Expected output: Confirmation message
    test("Successfully reject friend request", async () => {
        const token = jwt.sign(testUserB, process.env.JWT_SECRET as string);

        await usersCollection.insertOne(testUserA);
        await usersCollection.insertOne(testUserB);

        await friendsCollection.insertOne({
            user_uuid: testUserB.user_uuid,
            friends: [],
            incoming_requests: [{ user_uuid: testUserA.user_uuid, name: testUserA.name }]
        });

        const res = await supertest(app)
            .delete("/friends/requests")
            .set("token", token)
            .query({ user_uuid: testUserA.user_uuid });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("message", "Friend request rejected.");

        const userBFriends = await friendsCollection.findOne({ user_uuid: testUserB.user_uuid });
        expect(userBFriends).not.toBeNull();
        expect(userBFriends?.incoming_requests).not.toContainEqual({ user_uuid: testUserA.user_uuid, name: testUserA.name });
    });

    // Input: Authenticated user token, friend request not found
    // Expected status code: 404
    // Expected behavior: None
    // Expected output: Error message
    test("Friend request not found", async () => {
        const token = jwt.sign(testUserB, process.env.JWT_SECRET as string);

        await usersCollection.insertOne(testUserA);
        await usersCollection.insertOne(testUserB);

        await friendsCollection.insertOne({
            user_uuid: testUserB.user_uuid,
            friends: [],
            incoming_requests: []
        });

        const res = await supertest(app)
            .delete("/friends/requests")
            .set("token", token)
            .query({ user_uuid: testUserA.user_uuid });

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty("message", "Friend request not found.");
    });

    // Input: Authenticated user token, rejecting self friend request
    // Expected status code: 400
    // Expected behavior: None
    // Expected output: Error message
    test("Cannot reject your own friend request", async () => {
        const token = jwt.sign(testUserA, process.env.JWT_SECRET as string);

        const res = await supertest(app)
            .delete("/friends/requests")
            .set("token", token)
            .query({ user_uuid: testUserA.user_uuid });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("message", "Cannot reject friend request from yourself");
    });

    // Input: No token provided
    // Expected status code: 401
    // Expected behavior: None
    // Expected output: Error message
    test("Access without token", async () => {
        const res = await supertest(app).delete("/friends/requests").query({ user_uuid: testUserA.user_uuid });
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("message", "No token provided.");
    });

    // Input: Invalid token provided
    // Expected status code: 403
    // Expected behavior: None
    // Expected output: Error message
    test("Access with invalid token", async () => {
        const res = await supertest(app).delete("/friends/requests").set("token", "invalid_token").query({ user_uuid: testUserA.user_uuid });
        expect(res.status).toBe(403);
        expect(res.body).toHaveProperty("message", "Authentication error.");
    });
});

// Interface GET /friends
describe("Unmocked: GET /friends", () => {
    
    const app = createServer();
    jest.setTimeout(JEST_TIMEOUT_MS);   

    beforeAll(async () => {
        await client.connect();
    });

    beforeEach(async () => {
        await usersDatabase.dropDatabase();
    });

    afterAll(async () => {
        await usersDatabase.dropDatabase();
        await client.close();
    });

    // Input: Authenticated user token, user with friends
    // Expected status code: 200
    // Expected behavior: None
    // Expected output: List of friends
    test("Successfully get friends list", async () => {
        const token = jwt.sign(testUserC, process.env.JWT_SECRET as string);

        await usersCollection.insertOne(testUserC);
        await usersCollection.insertOne(testUserD);

        await friendsCollection.insertOne({
            user_uuid: testUserC.user_uuid,
            friends: [{ user_uuid: testUserD.user_uuid, name: testUserD.name }],
            incoming_requests: []
        });

        const res = await supertest(app)
            .get("/friends")
            .set("token", token);

        expect(res.status).toBe(200);
        expect(res.body).toEqual([{ user_uuid: testUserD.user_uuid, name: testUserD.name }]);
    });

    // Input: Authenticated user token, user with no friends
    // Expected status code: 200
    // Expected behavior: None
    // Expected output: Empty list
    test("Get friends list when no friends", async () => {
        const token = jwt.sign(testUserE, process.env.JWT_SECRET as string);

        await usersCollection.insertOne(testUserE);

        await friendsCollection.insertOne(testFriendsE);

        const res = await supertest(app)
            .get("/friends")
            .set("token", token);

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });

    // Input: Authenticated user token, user has no friends document
    // Expected status code: 200
    // Expected behavior: None
    // Expected output: Empty list
    test("Get friends list when no friends", async () => {
        const token = jwt.sign(testUserE, process.env.JWT_SECRET as string);

        await usersCollection.insertOne(testUserE);

        const res = await supertest(app)
            .get("/friends")
            .set("token", token);

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });

    // Input: No token provided
    // Expected status code: 401
    // Expected behavior: None
    // Expected output: Error message
    test("Access without token", async () => {
        const res = await supertest(app).get("/friends");
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("message", "No token provided.");
    });

    // Input: Invalid token provided
    // Expected status code: 403
    // Expected behavior: None
    // Expected output: Error message
    test("Access with invalid token", async () => {
        const res = await supertest(app).get("/friends").set("token", "invalid_token");
        expect(res.status).toBe(403);
        expect(res.body).toHaveProperty("message", "Authentication error.");
    });
});

// Interface GET /friends/requests
describe("Unmocked: GET /friends/requests", () => {
    
    const app = createServer();
    jest.setTimeout(JEST_TIMEOUT_MS);   

    beforeAll(async () => {
        await client.connect();
    });

    beforeEach(async () => {
        await usersDatabase.dropDatabase();
    });

    afterAll(async () => {
        await usersDatabase.dropDatabase();
        await client.close();
    });

    // Input: Authenticated user token, user with incoming friend requests
    // Expected status code: 200
    // Expected behavior: None
    // Expected output: List of incoming friend requests
    test("Successfully get incoming friend requests", async () => {
        const token = jwt.sign(testUserB, process.env.JWT_SECRET as string);

        await usersCollection.insertOne(testUserA);
        await usersCollection.insertOne(testUserB);

        await friendsCollection.insertOne(testFriendsB);

        const res = await supertest(app)
            .get("/friends/requests")
            .set("token", token);

        expect(res.status).toBe(200);
        expect(res.body).toEqual([{ user_uuid: testUserA.user_uuid, name: testUserA.name }]);
    });

    // Input: Authenticated user token, user with no incoming friend requests
    // Expected status code: 200
    // Expected behavior: None
    // Expected output: Empty list
    test("Get incoming friend requests when none exist", async () => {
        const token = jwt.sign(testUserE, process.env.JWT_SECRET as string);

        await usersCollection.insertOne(testUserE);

        await friendsCollection.insertOne(testFriendsE);

        const res = await supertest(app)
            .get("/friends/requests")
            .set("token", token);

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });

    // Input: Authenticated user token, user has no friends document
    // Expected status code: 200
    // Expected behavior: None
    // Expected output: Empty list
    test("Get incoming friend requests when no friends document", async () => {
        const token = jwt.sign(testUserE, process.env.JWT_SECRET as string);

        await usersCollection.insertOne(testUserE);

        const res = await supertest(app)
            .get("/friends/requests")
            .set("token", token);

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });

    // Input: No token provided
    // Expected status code: 401
    // Expected behavior: None
    // Expected output: Error message
    test("Access without token", async () => {
        const res = await supertest(app).get("/friends/requests");
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("message", "No token provided.");
    });

    // Input: Invalid token provided
    // Expected status code: 403
    // Expected behavior: None
    // Expected output: Error message
    test("Access with invalid token", async () => {
        const res = await supertest(app).get("/friends/requests").set("token", "invalid_token");
        expect(res.status).toBe(403);
        expect(res.body).toHaveProperty("message", "Authentication error.");
    });
});

// Interface GET /friends/requests/outgoing
describe("Unmocked: GET /friends/requests/outgoing", () => {
    
    const app = createServer();
    jest.setTimeout(JEST_TIMEOUT_MS);   

    beforeAll(async () => {
        await client.connect();
    });

    beforeEach(async () => {
        await usersDatabase.dropDatabase();
    });

    afterAll(async () => {
        await usersDatabase.dropDatabase();
        await client.close();
    });

    // Input: Authenticated user token, user with outgoing friend requests
    // Expected status code: 200
    // Expected behavior: None
    // Expected output: List of outgoing friend requests
    test("Successfully get outgoing friend requests", async () => {
        const token = jwt.sign(testUserA, process.env.JWT_SECRET as string);

        await usersCollection.insertOne(testUserA);
        await usersCollection.insertOne(testUserB);

        await friendsCollection.insertOne(testFriendsB);

        const res = await supertest(app)
            .get("/friends/requests/outgoing")
            .set("token", token);

        expect(res.status).toBe(200);
        expect(res.body).toEqual([{ user_uuid: testUserB.user_uuid, name: testUserB.name }]);
    });

    // Input: Authenticated user token, user with no outgoing friend requests
    // Expected status code: 200
    // Expected behavior: None
    // Expected output: Empty list
    test("Get outgoing friend requests when none exist", async () => {
        const token = jwt.sign(testUserE, process.env.JWT_SECRET as string);

        await usersCollection.insertOne(testUserE);

        await friendsCollection.insertOne(testFriendsE);

        const res = await supertest(app)
            .get("/friends/requests/outgoing")
            .set("token", token);

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });

    // Input: Authenticated user token, user has no friends document
    // Expected status code: 200
    // Expected behavior: None
    // Expected output: Empty list
    test("Get outgoing friend requests when no friends document", async () => {
        const token = jwt.sign(testUserE, process.env.JWT_SECRET as string);

        await usersCollection.insertOne(testUserE);

        const res = await supertest(app)
            .get("/friends/requests/outgoing")
            .set("token", token);

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });

    // Input: No token provided
    // Expected status code: 401
    // Expected behavior: None
    // Expected output: Error message
    test("Access without token", async () => {
        const res = await supertest(app).get("/friends/requests/outgoing");
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("message", "No token provided.");
    });

    // Input: Invalid token provided
    // Expected status code: 403
    // Expected behavior: None
    // Expected output: Error message
    test("Access with invalid token", async () => {
        const res = await supertest(app).get("/friends/requests/outgoing").set("token", "invalid_token");
        expect(res.status).toBe(403);
        expect(res.body).toHaveProperty("message", "Authentication error.");
    });
});

// Interface GET /friends/history/:user_uuid
describe("Unmocked: GET /friends/history/:user_uuid", () => {
    
    const app = createServer();
    jest.setTimeout(JEST_TIMEOUT_MS);   

    beforeAll(async () => {
        await client.connect();
    });

    beforeEach(async () => {
        await usersDatabase.dropDatabase();
    });

    afterAll(async () => {
        await usersDatabase.dropDatabase();
        await client.close();
    });

    // Input: Authenticated user token, valid friend UUID
    // Expected status code: 200
    // Expected behavior: None
    // Expected output: Friend's detailed history
    test("Successfully get friend's history by UUID, friend has no history", async () => {
        const token = jwt.sign(testUserA, process.env.JWT_SECRET as string);

        await usersCollection.insertOne(testUserA);
        await usersCollection.insertOne(testUserB);

        await friendsCollection.insertOne({
            user_uuid: testUserA.user_uuid,
            friends: [{ user_uuid: testUserB.user_uuid, name: testUserB.name }],
            incoming_requests: []
        });

        await historyCollection.insertOne(testHistoryB);

        const res = await supertest(app)
            .get(`/friends/history/${testUserB.user_uuid}`)
            .set("token", token);

        expect(res.status).toBe(200);
        expect(res.body).toEqual(expect.any(Array));
    });

    // Input: Authenticated user token, valid friend UUID
    // Expected status code: 200
    // Expected behavior: None
    // Expected output: Friend's detailed history
    test("Successfully get friend's history by UUID, friend has history", async () => {
        const token = jwt.sign(testUserB, process.env.JWT_SECRET as string);

        await usersCollection.insertOne(testUserC);
        await usersCollection.insertOne(testUserB);

        await friendsCollection.insertOne({
            user_uuid: testUserB.user_uuid,
            friends: [{ user_uuid: testUserC.user_uuid, name: testUserC.name }],
            incoming_requests: []
        });

        await historyCollection.insertOne(testHistoryC);

        const res = await supertest(app)
            .get(`/friends/history/${testUserC.user_uuid}`)
            .set("token", token);

        expect(res.status).toBe(200);
        expect(res.body).toEqual(expect.any(Array));
    });

    // Input: Authenticated user token, users are not friends
    // Expected status code: 404
    // Expected behavior: None
    // Expected output: Error message
    test("Get friend's history by UUID, users are not friends", async () => {
        const token = jwt.sign(testUserB, process.env.JWT_SECRET as string);

        await usersCollection.insertOne(testUserC);
        await usersCollection.insertOne(testUserB);

        await friendsCollection.insertOne({
            user_uuid: testUserB.user_uuid,
            friends: [],
            incoming_requests: []
        });

        await historyCollection.insertOne(testHistoryC);

        const res = await supertest(app)
            .get(`/friends/history/${testUserC.user_uuid}`)
            .set("token", token);

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty("message", "User does not exist or is not a friend.");
    });

    // Input: Authenticated user token, invalid friend UUID
    // Expected status code: 404
    // Expected behavior: None
    // Expected output: Error message
    test("Get friend's history with invalid UUID", async () => {
        const token = jwt.sign(testUserA, process.env.JWT_SECRET as string);

        await usersCollection.insertOne(testUserA);

        const res = await supertest(app)
            .get("/friends/history/invalid-uuid")
            .set("token", token);

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty("message", "User does not exist or is not a friend.");
    });

    // Input: No token provided
    // Expected status code: 401
    // Expected behavior: None
    // Expected output: Error message
    test("Access friend's history without token", async () => {
        const res = await supertest(app).get(`/friends/history/${testUserB.user_uuid}`);
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("message", "No token provided.");
    });

    // Input: Invalid token provided
    // Expected status code: 403
    // Expected behavior: None
    // Expected output: Error message
    test("Access friend's history with invalid token", async () => {
        const res = await supertest(app).get(`/friends/history/${testUserB.user_uuid}`).set("token", "invalid_token");
        expect(res.status).toBe(403);
        expect(res.body).toHaveProperty("message", "Authentication error.");
    });
});

// Interface POST /friends/notifications
describe("Unmocked: POST /friends/notifications", () => {
    
    const app = createServer();
    jest.setTimeout(JEST_TIMEOUT_MS);   

    beforeAll(async () => {
        await client.connect();
    });

    beforeEach(async () => {
        await usersDatabase.dropDatabase();
    });

    afterAll(async () => {
        await usersDatabase.dropDatabase();
        await client.close();
    });

    // Input: Authenticated user token, invalid friend UUID
    // Expected status code: 404
    // Expected behavior: None
    // Expected output: Error message
    test("Send product notification with invalid friend UUID", async () => {
        const token = jwt.sign(testUserA, process.env.JWT_SECRET as string);

        await usersCollection.insertOne(testUserA);

        const res = await supertest(app)
            .post("/friends/notifications")
            .set("token", token)
            .send({
                user_uuid: "invalid-uuid",
                scan_uuid: "valid-scan-uuid",
                message_type: "praise"
            });

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty("message", "User does not exist or is not a friend.");
    });

    // Input: Authenticated user token, valid friend UUID, invalid scan UUID
    // Expected status code: 404
    // Expected behavior: None
    // Expected output: Error message
    test("Send product notification with invalid scan UUID", async () => {
        const token = jwt.sign(testUserA, process.env.JWT_SECRET as string);

        await usersCollection.insertOne(testUserA);
        await usersCollection.insertOne(testUserB);

        await friendsCollection.insertOne({
            user_uuid: testUserA.user_uuid,
            friends: [{ user_uuid: testUserB.user_uuid, name: testUserB.name }],
            incoming_requests: []
        });

        const res = await supertest(app)
            .post("/friends/notifications")
            .set("token", token)
            .send({
                user_uuid: testUserB.user_uuid,
                scan_uuid: "invalid-scan-uuid",
                message_type: "praise"
            });

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty("message", "User history not found.");
    });

    // Input: Authenticated user token, valid friend UUID, valid scan UUID, invalid message type
    // Expected status code: 400
    // Expected behavior: None
    // Expected output: Error message
    test("Send product notification with invalid message type", async () => {
        const token = jwt.sign(testUserA, process.env.JWT_SECRET as string);

        await usersCollection.insertOne(testUserA);
        await usersCollection.insertOne(testUserB);

        await friendsCollection.insertOne({
            user_uuid: testUserA.user_uuid,
            friends: [{ user_uuid: testUserB.user_uuid, name: testUserB.name }],
            incoming_requests: []
        });

        await historyCollection.insertOne({
            user_uuid: testUserB.user_uuid,
            products: [{ scan_uuid: "valid-scan-uuid", product_id: "valid-product-id", timestamp: new Date() }],
            ecoscore_score: 50
        });

        const res = await supertest(app)
            .post("/friends/notifications")
            .set("token", token)
            .send({
                user_uuid: testUserB.user_uuid,
                scan_uuid: "valid-scan-uuid"
            });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("errors");
        expect(res.body.errors).toEqual([{
            location: "body",
            msg: "Message type should be either 'praise' or 'shame'",
            path: "message_type",
            type: "field",
        }]);
    });

    // Input: No token provided
    // Expected status code: 401
    // Expected behavior: None
    // Expected output: Error message
    test("Send product notification without token", async () => {
        const res = await supertest(app).post("/friends/notifications").send({
            user_uuid: testUserB.user_uuid,
            scan_uuid: "valid-scan-uuid",
            message_type: "praise"
        });
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("message", "No token provided.");
    });

    // Input: Invalid token provided
    // Expected status code: 403
    // Expected behavior: None
    // Expected output: Error message
    test("Send product notification with invalid token", async () => {
        const res = await supertest(app).post("/friends/notifications").set("token", "invalid_token").send({
            user_uuid: testUserB.user_uuid,
            scan_uuid: "valid-scan-uuid",
            message_type: "praise"
        });
        expect(res.status).toBe(403);
        expect(res.body).toHaveProperty("message", "Authentication error.");
    });

    // Input: Authenticated user token, sending notification to self
    // Expected status code: 400
    // Expected behavior: None
    // Expected output: Error message
    test("Send product notification to self", async () => {
        const token = jwt.sign(testUserA, process.env.JWT_SECRET as string);

        await usersCollection.insertOne(testUserA);

        const res = await supertest(app)
            .post("/friends/notifications")
            .set("token", token)
            .send({
                user_uuid: testUserA.user_uuid,
                scan_uuid: "valid-scan-uuid",
                message_type: "praise"
            });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("message", "Cannot send notification to yourself.");
    });

    // Input: Authenticated user token, valid friend UUID, scan UUID not in history
    // Expected status code: 404
    // Expected behavior: None
    // Expected output: Error message
    test("Send product notification with scan UUID not in history", async () => {
        const token = jwt.sign(testUserA, process.env.JWT_SECRET as string);

        await usersCollection.insertOne(testUserA);
        await usersCollection.insertOne(testUserB);

        await friendsCollection.insertOne({
            user_uuid: testUserA.user_uuid,
            friends: [{ user_uuid: testUserB.user_uuid, name: testUserB.name }],
            incoming_requests: []
        });

        await historyCollection.insertOne({
            user_uuid: testUserB.user_uuid,
            products: [{ scan_uuid: "another-valid-scan-uuid", product_id: "valid-product-id", timestamp: new Date() }],
            ecoscore_score: 50
        });

        const res = await supertest(app)
            .post("/friends/notifications")
            .set("token", token)
            .send({
                user_uuid: testUserB.user_uuid,
                scan_uuid: "valid-scan-uuid",
                message_type: "praise"
            });

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty("message", "Product not found in user's history.");
    });

    // Input: Authenticated user token, valid friend UUID, valid scan UUID, product not found
    // Expected status code: 404
    // Expected behavior: None
    // Expected output: Error message
    test("Send product notification with product not found", async () => {
        const token = jwt.sign(testUserA, process.env.JWT_SECRET as string);

        await usersCollection.insertOne(testUserA);
        await usersCollection.insertOne(testUserB);

        await friendsCollection.insertOne({
            user_uuid: testUserA.user_uuid,
            friends: [{ user_uuid: testUserB.user_uuid, name: testUserB.name }],
            incoming_requests: []
        });

        await historyCollection.insertOne({
            user_uuid: testUserB.user_uuid,
            products: [{ scan_uuid: "valid-scan-uuid", product_id: "non-existent-product-id", timestamp: new Date() }],
            ecoscore_score: 50
        });

        const res = await supertest(app)
            .post("/friends/notifications")
            .set("token", token)
            .send({
                user_uuid: testUserB.user_uuid,
                scan_uuid: "valid-scan-uuid",
                message_type: "praise"
            });

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty("message", "Product not found.");
    });

    // Input: Authenticated user token, valid friend UUID, valid scan UUID, target user without FCM token
    // Expected status code: 404
    // Expected behavior: None
    // Expected output: Error message
    test("Send product notification to user without FCM token, praise", async () => {
        const token = jwt.sign(testUserD, process.env.JWT_SECRET!);

        await usersCollection.insertOne(testUserC);
        await usersCollection.insertOne(testUserD);

        await friendsCollection.insertOne(testFriendsD);
        await friendsCollection.insertOne(testFriendsC);

        await historyCollection.insertOne(testHistoryD);
        await historyCollection.insertOne(testHistoryC);

        const res = await supertest(app)
            .post("/friends/notifications")
            .set("token", token)
            .send({
                user_uuid: testUserC.user_uuid,
                scan_uuid: testHistoryC.products[0].scan_uuid,
                message_type: "praise"
            });

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty("message", "Target user does not have notifications enabled.");
    });

    // Input: Authenticated user token, valid friend UUID, valid scan UUID, target user without FCM token
    // Expected status code: 404
    // Expected behavior: None
    // Expected output: Error message
    test("Send product notification to user without FCM token, shame", async () => {
        const token = jwt.sign(testUserD, process.env.JWT_SECRET!);

        await usersCollection.insertOne(testUserC);
        await usersCollection.insertOne(testUserD);

        await friendsCollection.insertOne(testFriendsD);
        await friendsCollection.insertOne(testFriendsC);

        await historyCollection.insertOne(testHistoryD);
        await historyCollection.insertOne(testHistoryC);

        const res = await supertest(app)
            .post("/friends/notifications")
            .set("token", token)
            .send({
                user_uuid: testUserC.user_uuid,
                scan_uuid: testHistoryC.products[0].scan_uuid,
                message_type: "shame"
            });

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty("message", "Target user does not have notifications enabled.");
    });
});

// Interface GET /friends/ecoscore_score/:user_uuid
describe("Unmocked: GET /friends/ecoscore_score/:user_uuid", () => {
    
    const app = createServer();
    jest.setTimeout(JEST_TIMEOUT_MS);   

    beforeAll(async () => {
        await client.connect();
    });

    beforeEach(async () => {
        await usersDatabase.dropDatabase();
    });

    afterAll(async () => {
        await usersDatabase.dropDatabase();
        await client.close();
    });

    // Input: Authenticated user token, invalid friend UUID
    // Expected status code: 404
    // Expected behavior: None
    // Expected output: Error message
    test("Get friend ecoscore with invalid friend UUID", async () => {
        const token = jwt.sign(testUserA, process.env.JWT_SECRET as string);

        await usersCollection.insertOne(testUserA);

        const res = await supertest(app)
            .get("/friends/ecoscore_score/invalid-uuid")
            .set("token", token);

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty("message", "User does not exist or is not a friend.");
    });

    // Input: Authenticated user token, valid friend UUID, friend without history
    // Expected status code: 404
    // Expected behavior: None
    // Expected output: Error message
    test("Get friend ecoscore with friend without history", async () => {
        const token = jwt.sign(testUserC, process.env.JWT_SECRET as string);

        await usersCollection.insertOne(testUserC);
        await usersCollection.insertOne(testUserD);

        await friendsCollection.insertOne(testFriendsC);
        await friendsCollection.insertOne(testFriendsD);

        const res = await supertest(app)
            .get(`/friends/ecoscore_score/${testUserD.user_uuid}`)
            .set("token", token);

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty("message", "No history found for the friend.");
    });

    // Input: Authenticated user token, valid friend UUID, friend with history
    // Expected status code: 200
    // Expected behavior: None
    // Expected output: Friend's ecoscore
    test("Get friend ecoscore with friend with history", async () => {
        const token = jwt.sign(testUserD, process.env.JWT_SECRET!);

        await usersCollection.insertOne(testUserD);
        await usersCollection.insertOne(testUserC);

        await friendsCollection.insertOne(testFriendsD);
        await friendsCollection.insertOne(testFriendsC);

        await historyCollection.insertOne(testHistoryC);

        const res = await supertest(app)
            .get(`/friends/ecoscore_score/${testUserC.user_uuid}`)
            .set("token", token);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("ecoscore_score", testHistoryC.ecoscore_score);
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