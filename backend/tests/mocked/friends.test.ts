import { createServer } from "../../utils";
import supertest from "supertest";
import * as services from "../../services";
import { Friends, User } from "../../types";
import { Collection, ObjectId } from "mongodb";
import jwt from "jsonwebtoken";

jest.mock("../../services", () => {
    const findOneMockFriends = jest.fn();
    const updateOneMockFriends = jest.fn();
    const findOneMockUsers = jest.fn();
    const insertOneMockFriends = jest.fn();
    return {
        client: {
            db: jest.fn(() => ({
                collection: jest.fn((name) => {
                    if (name === "friends") {
                        return {
                            findOne: findOneMockFriends,
                            updateOne: updateOneMockFriends,
                            insertOne: insertOneMockFriends,
                        };
                    } else if (name === "users") {
                        return {
                            findOne: findOneMockUsers,
                        };
                    }
                    return {};
                }),
            })),
        },
        getFirebaseApp: jest.fn(),
    };
});

const sendMock = jest.fn().mockResolvedValue("mock-message-id");

jest.mock("firebase-admin/messaging", () => ({
    getMessaging: jest.fn(() => ({
        send: sendMock,
    })),
}));

jest.mock("jsonwebtoken", () => ({
    ...jest.requireActual("jsonwebtoken"),
    verify: jest.fn(),
}));

const app = createServer();

// Interface POST /friends/requests
describe("Mocked: POST /friends/requests", () => {
    let friendsCollection: jest.Mocked<Collection<Friends>>;
    let usersCollection: jest.Mocked<Collection<User>>;

    beforeEach(() => {
        friendsCollection = (services.client.db as jest.Mock)().collection("friends");
        usersCollection = (services.client.db as jest.Mock)().collection("users");

        (jwt.verify as jest.Mock).mockImplementation((token, secret) => {
            return user;
        });

        friendsCollection.findOne.mockClear();
        friendsCollection.updateOne.mockClear();
        usersCollection.findOne.mockClear();

        sendMock.mockClear();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        jest.clearAllMocks();
    });

    const user: User = {
        _id: "user-123",
        google_id: "google-123",
        email: "john.doe@example.com",
        fcm_registration_token: "fcm-token-123",
        user_uuid: "user-123",
        name: "John Doe",
    };

    const friend: User = {
        _id: "friend-123",
        google_id: "google-123",
        email: "jane.doe@example.com",
        fcm_registration_token: "fcm-token-123",
        user_uuid: "friend-123",
        name: "Jane Doe",
    };

    // Input: Valid user_uuid for friend request
    // Expected status code: 200
    // Expected behavior: Friend request is sent successfully
    // Expected output: Confirmation message and notification sent
    test("Send Friend Request Successfully", async () => {
        const userFriends = { user_uuid: user.user_uuid, friends: [], incoming_requests: [] };
        const targetFriends = { user_uuid: friend.user_uuid, friends: [], incoming_requests: [] };

        friendsCollection.findOne
            .mockResolvedValueOnce(userFriends)
            .mockResolvedValueOnce(targetFriends);

        friendsCollection.updateOne.mockResolvedValueOnce({
            acknowledged: true,
            modifiedCount: 1,
            matchedCount: 1,
            upsertedCount: 0,
            upsertedId: null,
        });

        usersCollection.findOne.mockResolvedValueOnce({
            user_uuid: friend.user_uuid,
            fcm_registration_token: friend.fcm_registration_token,
        });

        const res = await supertest(app)
            .post("/friends/requests")
            .set("token", `mock_token`)
            .send({ user_uuid: friend.user_uuid });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("message", "Friend request sent.");
        expect(friendsCollection.updateOne).toHaveBeenCalled();

        await expect(sendMock).toHaveBeenCalledWith({
            notification: {
                title: "CarbonWise",
                body: "John Doe has sent you a friend request",
            },
            token: friend.fcm_registration_token,
        });
    });

    // Input: User tries to send a friend request to themselves
    // Expected status code: 400
    // Expected behavior: Request is rejected
    // Expected output: Error message
    test("Send Friend Request to Self", async () => {
        const res = await supertest(app)
            .post("/friends/requests")
            .set("token", `mock_token`)
            .send({ user_uuid: user.user_uuid });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("message", "Cannot send friend request to yourself.");
    });

    // Input: Users are already friends
    // Expected status code: 400
    // Expected behavior: Request is rejected
    // Expected output: Error message
    test("Send Friend Request to Existing Friend", async () => {
        const userFriends = { user_uuid: user.user_uuid, friends: [{ user_uuid: friend.user_uuid }], incoming_requests: [] };
        const targetFriends = { user_uuid: friend.user_uuid, friends: [{ user_uuid: user.user_uuid }], incoming_requests: [] };

        friendsCollection.findOne
            .mockResolvedValueOnce(userFriends)
            .mockResolvedValueOnce(targetFriends);

        const res = await supertest(app)
            .post("/friends/requests")
            .set("token", `mock_token`)
            .send({ user_uuid: friend.user_uuid });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("message", "Already friends.");
    });

    // Input: Friend request already sent
    // Expected status code: 400
    // Expected behavior: Request is rejected
    // Expected output: Error message
    test("Send Duplicate Friend Request", async () => {
        const userFriends = { user_uuid: user.user_uuid, friends: [], incoming_requests: [] };
        const targetFriends = { user_uuid: friend.user_uuid, friends: [], incoming_requests: [{ user_uuid: user.user_uuid }] };

        friendsCollection.findOne
            .mockResolvedValueOnce(userFriends)
            .mockResolvedValueOnce(targetFriends);

        const res = await supertest(app)
            .post("/friends/requests")
            .set("token", `mock_token`)
            .send({ user_uuid: friend.user_uuid });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("message", "Friend request already sent.");
    });

    
});




// Interface POST /friends/requests/accept
describe("Mocked: POST /friends/requests/accept", () => {
    let friendsCollection: jest.Mocked<Collection<Friends>>;
    let usersCollection: jest.Mocked<Collection<User>>;

    beforeEach(() => {
        friendsCollection = (services.client.db as jest.Mock)().collection("friends");
        usersCollection = (services.client.db as jest.Mock)().collection("users");

        (jwt.verify as jest.Mock).mockImplementation((token, secret) => {
            return user;
        });

        friendsCollection.findOne.mockClear();
        friendsCollection.updateOne.mockClear();
        friendsCollection.insertOne.mockClear();

        usersCollection.findOne.mockClear();

        sendMock.mockClear();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        jest.clearAllMocks();
    });

    const user: User = {
        _id: "user-123",
        google_id: "google-123",
        email: "john.doe@example.com",
        fcm_registration_token: "fcm-token-123",
        user_uuid: "user-123",
        name: "John Doe",
    };

    const friend: User = {
        _id: "friend-123",
        google_id: "google-123",
        email: "jane.doe@example.com",
        fcm_registration_token: "fcm-token-123",
        user_uuid: "friend-123",
            name: "Jane Doe",
        };

    // Input: Valid user_uuid for accepting friend request
    // Expected status code: 200
    // Expected behavior: Friend request is accepted successfully
    // Expected output: Confirmation message and notification sent
    test("Accept Friend Request Successfully", async () => {
        const userFriends = { user_uuid: user.user_uuid, friends: [], incoming_requests: [{ user_uuid: friend.user_uuid }] };
        const targetFriends = { user_uuid: friend.user_uuid, friends: [], incoming_requests: [] };

        friendsCollection.findOne
            .mockResolvedValueOnce(userFriends)
            .mockResolvedValueOnce(targetFriends);

        friendsCollection.updateOne.mockResolvedValueOnce({
            acknowledged: true,
            modifiedCount: 1,
            matchedCount: 1,
            upsertedCount: 0,
            upsertedId: null,
        });

        usersCollection.findOne
            .mockResolvedValueOnce(friend)
            .mockResolvedValueOnce(friend);

        const res = await supertest(app)
            .post("/friends/requests/accept")
            .set("token", `mock_token`)
            .send({ user_uuid: friend.user_uuid });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("message", "Friend request accepted.");
        expect(friendsCollection.updateOne).toHaveBeenCalledWith(
            { user_uuid: user.user_uuid },
            { $pull: { incoming_requests: { user_uuid: friend.user_uuid } }, $addToSet: { friends: { user_uuid: friend.user_uuid, name: friend.name } } }
        );

        await expect(sendMock).toHaveBeenCalledWith({
            notification: {
                title: "CarbonWise",
                body: "John Doe has accepted your friend request",
            },
            token: friend.fcm_registration_token,
        }); 
    });

    // Input: User tries to accept a friend request from themselves
    // Expected status code: 400
    // Expected behavior: Request is rejected
    // Expected output: Error message
    test("Accept Friend Request from Self", async () => {
        const res = await supertest(app)
            .post("/friends/requests/accept")
            .set("token", `mock_token`)
            .send({ user_uuid: user.user_uuid });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("message", "Cannot accept friend request from yourself.");
    });

    // Input: No such friend request exists
    // Expected status code: 400
    // Expected behavior: Request is rejected
    // Expected output: Error message
    test("Accept Non-existent Friend Request", async () => {
        const userFriends = { user_uuid: user.user_uuid, friends: [], incoming_requests: [] };

        friendsCollection.findOne.mockResolvedValueOnce(userFriends);

        const res = await supertest(app)
            .post("/friends/requests/accept")
            .set("token", `mock_token`)
            .send({ user_uuid: friend.user_uuid });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("message", "No such friend request.");
    });

    // Input: Friend does not have a friends document
    // Expected status code: 200
    // Expected behavior: Friend request is accepted successfully, and a new friends document is created for the friend
    // Expected output: Confirmation message and notification sent
    test("Accept Friend Request when friend has no friends document", async () => {
            const userFriends = { user_uuid: user.user_uuid, friends: [], incoming_requests: [{ user_uuid: friend.user_uuid }] };
            const targetFriends = null;
    
            friendsCollection.findOne
                .mockResolvedValueOnce(userFriends)
                .mockResolvedValueOnce(targetFriends);
    
            friendsCollection.updateOne.mockResolvedValueOnce({
                acknowledged: true,
                modifiedCount: 1,
                matchedCount: 1,
                upsertedCount: 0,
                upsertedId: null,
            });

            friendsCollection.insertOne.mockResolvedValueOnce({
                acknowledged: true,
                insertedId: new ObjectId(),
            });
    
            usersCollection.findOne
                .mockResolvedValueOnce(friend)
                .mockResolvedValueOnce(friend);
    
            const res = await supertest(app)
                .post("/friends/requests/accept")
                .set("token", `mock_token`)
                .send({ user_uuid: friend.user_uuid });
    
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("message", "Friend request accepted.");
            expect(friendsCollection.updateOne).toHaveBeenCalledWith(
                { user_uuid: user.user_uuid },
                { $pull: { incoming_requests: { user_uuid: friend.user_uuid } }, $addToSet: { friends: { user_uuid: friend.user_uuid, name: friend.name } } }
            );

            expect(friendsCollection.insertOne).toHaveBeenCalledWith({
                user_uuid: friend.user_uuid,
                friends: [],
                incoming_requests: [],
            });
    
            await expect(sendMock).toHaveBeenCalledWith({
                notification: {
                    title: "CarbonWise",
                    body: "John Doe has accepted your friend request",
                },
                token: friend.fcm_registration_token,
            }); 
        });



});
