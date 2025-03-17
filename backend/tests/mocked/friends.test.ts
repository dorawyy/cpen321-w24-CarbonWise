import { createServer } from "../../utils";
import supertest, { Response } from "supertest";
import * as services from "../../services";
import { Friends, User, Product, History } from "../../types";
import { Collection, ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import axios from "axios";
import { getMessaging } from "firebase-admin/messaging";

jest.mock("../../services", () => {
    const findOneMockFriends = jest.fn();
    const updateOneMockFriends = jest.fn();
    const findOneMockUsers = jest.fn();
    const insertOneMockFriends = jest.fn();
    const findOneMockHistory = jest.fn();
    const findOneMockProducts = jest.fn();
    const insertOneMockProducts = jest.fn();
    
    const findMockFriends = jest.fn(() => {
        const cursor = {
            limit: jest.fn().mockReturnThis(),
            toArray: jest.fn(),
        };
        return cursor;
    });

    const findMockHistory = jest.fn(() => {
        const cursor = {
            limit: jest.fn().mockReturnThis(),
            toArray: jest.fn(),
        };
        return cursor;
    });

    const findMockProducts = jest.fn(() => {
        const cursor = {
            limit: jest.fn().mockReturnThis(),
            toArray: jest.fn(),
        };
        return cursor;
    });

    return {
        ...jest.requireActual("../../services"),
        client: {
            db: jest.fn(() => ({
                collection: jest.fn((name: string) => {
                    if (name === "friends") {
                        return {
                            findOne: findOneMockFriends,
                            updateOne: updateOneMockFriends,
                            insertOne: insertOneMockFriends,
                            find: findMockFriends,
                        };
                    } else if (name === "users") {
                        return {
                            findOne: findOneMockUsers,
                        };
                    } else if (name === "history") {
                        return {
                            findOne: findOneMockHistory,
                            find: findMockHistory,
                        };
                    } else if (name === "products") {
                        return {
                            findOne: findOneMockProducts,
                            insertOne: insertOneMockProducts,
                            find: findMockProducts,
                        };
                    }
                    return {};
                }),
            })),
        },
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

jest.mock("axios", () => ({
    get: jest.fn((url: string) => {
        if (url.includes("/api/v2/product/")) {
            return Promise.resolve({
                data: {
                    status: 1,
                    product: {
                        _id: "67890",
                        product_name: "API Fetched Product",
                        ecoscore_grade: "B",
                        ecoscore_score: 75,
                        categories_tags: ["tagA", "tagB"],
                        categories_hierarchy: ["hierarchyA", "hierarchyB"],
                        countries_tags: ["usa"],
                    },
                },
            });
        } else if (url.includes("openfoodfacts-images.s3.eu-west-3.amazonaws.com")) {
            return Promise.resolve({
                data: Buffer.from("mockImageBinaryData").toString("binary"),
            });
        }
        return Promise.reject(new Error("Unknown API call"));
    }),
}));

jest.mock("firebase-admin/app", () => ({
    getApps: jest.fn(() => []),
    initializeApp: jest.fn(),
}));

const app = createServer();

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

const mockProduct: Product = {
    _id: "12345",
    product_name: "Mock Product",
    ecoscore_grade: "A",
    ecoscore_score: 90,
    ecoscore_data: {},
    categories_tags: ["tag1", "tag2"],
    categories_hierarchy: ["hierarchy1", "hierarchy2"],
    countries_tags: ["france"],
    lang: "en",
};

const mockRecommendationA: Product = {
    _id: "67890",
    product_name: "Recommended Product A",
    ecoscore_grade: "B",
    ecoscore_score: 75,
    categories_tags: ["tag1", "tag2"],
    categories_hierarchy: ["hierarchy1", "hierarchy2"],
    countries_tags: ["france"],
    lang: "en",
};

const friendHistory: History = {
    user_uuid: friend.user_uuid,
    ecoscore_score: 75,
    products: [
        {
            product_id: "12345",
            timestamp: new Date("2024-01-01"),
            scan_uuid: "scan-123",
        },
    ],
};

// Interface POST /friends/requests
describe("Mocked: POST /friends/requests", () => {
    let friendsCollection: jest.Mocked<Collection<Friends>>;
    let usersCollection: jest.Mocked<Collection<User>>;

    beforeEach(() => {
        friendsCollection = (services.client.db as jest.Mock)().collection("friends");
        usersCollection = (services.client.db as jest.Mock)().collection("users");

        (jwt.verify as jest.Mock).mockImplementation((token: string, secret: string) => {
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

    // Input: Valid user_uuid for friend request
    // Expected status code: 200
    // Expected behavior: Friend request is sent successfully
    // Expected output: Confirmation message and notification sent
    test("Send Friend Request Successfully", async () => {
        const userFriends: Friends = { user_uuid: user.user_uuid, friends: [], incoming_requests: [] };
        const targetFriends: Friends = { user_uuid: friend.user_uuid, friends: [], incoming_requests: [] };

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

        const res: Response = await supertest(app)
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
    test("Send Friend Request, to Self", async () => {
        const res: Response = await supertest(app)
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
    test("Send Friend Request, to Existing Friend", async () => {
        const userFriends: Friends = { user_uuid: user.user_uuid, friends: [{ user_uuid: friend.user_uuid, name: "Lebron James" }], incoming_requests: [] };
        const targetFriends: Friends = { user_uuid: friend.user_uuid, friends: [{ user_uuid: user.user_uuid, name: "Stephen Curry" }], incoming_requests: [] };

        friendsCollection.findOne
            .mockResolvedValueOnce(userFriends)
            .mockResolvedValueOnce(targetFriends);

        const res: Response = await supertest(app)
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
    test("Send Friend Request, Duplicate Request", async () => {
        const userFriends: Friends = { user_uuid: user.user_uuid, friends: [], incoming_requests: [] };
        const targetFriends: Friends = { user_uuid: friend.user_uuid, friends: [], incoming_requests: [{ user_uuid: user.user_uuid, name: "Stephen Curry" }] };

        friendsCollection.findOne
            .mockResolvedValueOnce(userFriends)
            .mockResolvedValueOnce(targetFriends);

        const res: Response = await supertest(app)
            .post("/friends/requests")
            .set("token", `mock_token`)
            .send({ user_uuid: friend.user_uuid });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("message", "Friend request already sent.");
    });

    // Input: Valid user_uuid for friend request, firebase error
    // Expected status code: 200
    // Expected behavior: Friend request is sent successfully, but notification fails
    // Expected output: Confirmation message
    test("Send Friend Request, Firebase Error", async () => {
        const userFriends: Friends = { user_uuid: user.user_uuid, friends: [], incoming_requests: [] };
        const targetFriends: Friends = { user_uuid: friend.user_uuid, friends: [], incoming_requests: [] };

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

        sendMock.mockRejectedValueOnce(new Error("Firebase error"));

        const res: Response = await supertest(app)
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
    
});

// Interface POST /friends/requests/accept
describe("Mocked: POST /friends/requests/accept", () => {
    let friendsCollection: jest.Mocked<Collection<Friends>>;
    let usersCollection: jest.Mocked<Collection<User>>;

    beforeEach(() => {
        friendsCollection = (services.client.db as jest.Mock)().collection("friends");
        usersCollection = (services.client.db as jest.Mock)().collection("users");

        (jwt.verify as jest.Mock).mockImplementation((token: string, secret: string) => {
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

    // Input: Valid user_uuid for accepting friend request
    // Expected status code: 200
    // Expected behavior: Friend request is accepted successfully
    // Expected output: Confirmation message and notification sent
    test("Accept Friend Request Successfully", async () => {
        const userFriends: Friends = { user_uuid: user.user_uuid, friends: [], incoming_requests: [{ user_uuid: friend.user_uuid, name: "Lebron James" }] };
        const targetFriends: Friends = { user_uuid: friend.user_uuid, friends: [], incoming_requests: [] };

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

        const res: Response = await supertest(app)
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
    test("Accept Friend Request, from Self", async () => {
        const res: Response = await supertest(app)
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
    test("Accept Friend Request, Non-existent Request", async () => {
        const userFriends: Friends = { user_uuid: user.user_uuid, friends: [], incoming_requests: [] };

        friendsCollection.findOne.mockResolvedValueOnce(userFriends);

        const res: Response = await supertest(app)
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
    test("Accept Friend Request, Friend has no Friends Document", async () => {
        const userFriends: Friends = { user_uuid: user.user_uuid, friends: [], incoming_requests: [{ user_uuid: friend.user_uuid, name: "Lebron James" }] };
        const targetFriends: Friends | null = null;

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

        const res: Response = await supertest(app)
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

    // Input: Valid user_uuid for accepting friend request, no fcm_registration_token
    // Expected status code: 200
    // Expected behavior: Friend request is accepted successfully, but no notification is sent
    // Expected output: Confirmation message
    test("Accept Friend Request, No fcm_registration_token", async () => {
        const userFriends: Friends = { user_uuid: user.user_uuid, friends: [], incoming_requests: [{ user_uuid: friend.user_uuid, name: "Lebron James" }] };
        const targetFriends: Friends = { user_uuid: friend.user_uuid, friends: [], incoming_requests: [] };

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

        const friendWithoutToken = {
            _id: "user-123",
            google_id: "google-123",
            email: "john.doe@example.com",
            user_uuid: "user-123",
            name: "John Doe",
            fcm_registration_token: "",
        };

        usersCollection.findOne
            .mockResolvedValueOnce(friend)
            .mockResolvedValueOnce(friendWithoutToken);

        const res: Response = await supertest(app)
            .post("/friends/requests/accept")
            .set("token", `mock_token`)
            .send({ user_uuid: friend.user_uuid });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("message", "Friend request accepted.");
        expect(friendsCollection.updateOne).toHaveBeenCalledWith(
            { user_uuid: user.user_uuid },
            { $pull: { incoming_requests: { user_uuid: friend.user_uuid } }, $addToSet: { friends: { user_uuid: friend.user_uuid, name: friend.name } } }
        );

        await expect(sendMock).not.toHaveBeenCalled();
    });
    
});

// Interface GET /friends/requests
describe("Mocked: GET /friends/requests", () => {
    let friendsCollection: jest.Mocked<Collection<Friends>>;

    beforeEach(() => {
        friendsCollection = (services.client.db as jest.Mock)().collection("friends");

        (jwt.verify as jest.Mock).mockImplementation(() => user);

        friendsCollection.findOne.mockClear();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        jest.clearAllMocks();
    });

    // Input: User has incoming friend requests
    // Expected status code: 200
    // Expected behavior: Returns list of incoming friend requests
    // Expected output: List of user UUIDs and names of users who sent friend requests
    test("User has incoming friend requests", async () => {
        const mockFriends: Friends = {
            user_uuid: user.user_uuid,
            friends: [],
            incoming_requests: [
                { user_uuid: "friend-123", name: "Jane Doe" },
                { user_uuid: "friend-456", name: "Mike Smith" },
            ],
        };

        friendsCollection.findOne.mockResolvedValueOnce(mockFriends);

        const res: Response = await supertest(app)
            .get("/friends/requests")
            .set("token", "mock_token");

        expect(res.status).toBe(200);
        expect(res.body).toEqual(mockFriends.incoming_requests);
    });

    // Input: User has no incoming friend requests
    // Expected status code: 200
    // Expected behavior: Returns an empty array
    // Expected output: []
    test("User has no incoming friend requests", async () => {
        const mockFriends: Friends = {
            user_uuid: user.user_uuid,
            friends: [],
            incoming_requests: [],
        };

        friendsCollection.findOne.mockResolvedValueOnce(mockFriends);

        const res: Response = await supertest(app)
            .get("/friends/requests")
            .set("token", "mock_token");

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });

    // Input: User does not have a friends document
    // Expected status code: 200
    // Expected behavior: Returns an empty array
    // Expected output: []
    test("User does not have a friends document", async () => {
        friendsCollection.findOne.mockResolvedValueOnce(null);

        const res: Response = await supertest(app)
            .get("/friends/requests")
            .set("token", "mock_token");

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });

    // Input: User has multiple pending friend requests
    // Expected status code: 200
    // Expected behavior: Returns all pending friend requests
    // Expected output: List of all incoming friend requests
    test("User has multiple pending friend requests", async () => {
        const mockFriends: Friends = {
            user_uuid: user.user_uuid,
            friends: [],
            incoming_requests: [
                { user_uuid: "friend-123", name: "Jane Doe" },
                { user_uuid: "friend-456", name: "Mike Smith" },
                { user_uuid: "friend-789", name: "Alice Johnson" },
                { user_uuid: "friend-101", name: "Bob Williams" },
            ],
        };

        friendsCollection.findOne.mockResolvedValueOnce(mockFriends);

        const res: Response = await supertest(app)
            .get("/friends/requests")
            .set("token", "mock_token");

        expect(res.status).toBe(200);
        expect(res.body).toEqual(mockFriends.incoming_requests);
        expect(res.body.length).toBe(4);
    });
});

// Interface GET /friends/requests/outgoing
describe("Mocked: GET /friends/requests/outgoing", () => {
    let friendsCollection: jest.Mocked<Collection<Friends>>;

    beforeEach(() => {
        friendsCollection = (services.client.db as jest.Mock)().collection("friends");

        (jwt.verify as jest.Mock).mockImplementation(() => user);

        friendsCollection.find.mockClear();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        jest.clearAllMocks();
    });

    // Input: User has outgoing friend requests
    // Expected status code: 200
    // Expected behavior: Returns list of outgoing friend requests
    // Expected output: List of user UUIDs of users who received friend requests
    test("User has outgoing friend requests", async () => {
        const mockOutgoingRequests = [
            { user_uuid: "friend-123" },
            { user_uuid: "friend-456" },
        ];

        friendsCollection.find.mockReturnValueOnce({
            toArray: jest.fn().mockResolvedValueOnce(mockOutgoingRequests),
        } as any);

        const res: Response = await supertest(app)
            .get("/friends/requests/outgoing")
            .set("token", "mock_token");

        expect(res.status).toBe(200);
        expect(res.body).toEqual(["friend-123", "friend-456"]);
    });

    // Input: User has no outgoing friend requests
    // Expected status code: 200
    // Expected behavior: Returns an empty array
    // Expected output: []
    test("User has no outgoing friend requests", async () => {
        friendsCollection.find.mockReturnValueOnce({
            toArray: jest.fn().mockResolvedValueOnce([]),
        } as any);

        const res: Response = await supertest(app)
            .get("/friends/requests/outgoing")
            .set("token", "mock_token");

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });
    
});

// Interface GET /friends/history/:user_uuid
describe("Mocked: GET /friends/history/:user_uuid", () => {
    let friendsCollection: jest.Mocked<Collection<Friends>>;
    let historyCollection: jest.Mocked<Collection<History>>;
    let productCollection: jest.Mocked<Collection<Product>>;

    beforeEach(() => {
        friendsCollection = (services.client.db as jest.Mock)().collection("friends");
        historyCollection = (services.client.db as jest.Mock)().collection("history");
        productCollection = (services.client.db as jest.Mock)().collection("products");

        (jwt.verify as jest.Mock).mockImplementation(() => user);

        friendsCollection.findOne.mockClear();
        historyCollection.find.mockClear();
        productCollection.findOne.mockClear();
        productCollection.find.mockClear();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        jest.clearAllMocks();
    });

    // Input: Valid user_uuid for friend's history
    // Expected status code: 200
    // Expected behavior: Returns friend's history successfully
    // Expected output: Friend's history with product details
    test("Get Friend's History Successfully", async () => {
        const userFriends: Friends = {
            user_uuid: user.user_uuid,
            friends: [{ user_uuid: friend.user_uuid, name: friend.name }],
            incoming_requests: [],
        };

        // Mock friends collection to return user's friends list
        friendsCollection.findOne.mockResolvedValueOnce(userFriends);

        // Mock history collection find().toArray() to return history
        historyCollection.find.mockReturnValueOnce({
            limit: jest.fn().mockReturnThis(),
            toArray: jest.fn().mockResolvedValueOnce([friendHistory]),
        } as any);

        // Mock product collection to return the product details for scanned products
        productCollection.findOne.mockResolvedValueOnce(mockProduct);

        // Mock recommendation system to return an alternative product
        productCollection.find.mockReturnValueOnce({
            limit: jest.fn().mockReturnThis(),
            toArray: jest.fn().mockResolvedValueOnce([mockRecommendationA]),
        } as any);

        (axios.get as jest.Mock).mockResolvedValueOnce(null);

        const res: Response = await supertest(app)
            .get(`/friends/history/${friend.user_uuid}`)
            .set("token", "mock_token");

        expect(res.status).toBe(200);
        expect(res.body).toEqual([
            {
                ...friendHistory,
                products: [
                    {
                        ...friendHistory.products[0],
                        product: {
                            ...mockProduct,
                            image: null
                        },
                        timestamp: friendHistory.products[0].timestamp.toISOString(),
                    },
                ],
            },
        ]);
    });

    // Input: User is not friends with the target user
    // Expected status code: 404
    // Expected behavior: Request is rejected
    // Expected output: Error message
    test("Get Friend's History, cannot find friends", async () => {
        const userFriends: Friends = {
            user_uuid: user.user_uuid,
            friends: [],
            incoming_requests: [],
        };

        // Mock friends collection to return user's friends list
        friendsCollection.findOne.mockResolvedValueOnce(userFriends);

        const res: Response = await supertest(app)
            .get(`/friends/history/${friend.user_uuid}`)
            .set("token", "mock_token");

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ message: "User does not exist or is not a friend." });
    });

    // Input: User does not have a friends document
    // Expected status code: 404
    // Expected behavior: Request is rejected
    // Expected output: Error message
    test("Get Friend's History, cannot find user's friend document", async () => {
        // Mock friends collection to return user's friends list
        friendsCollection.findOne.mockResolvedValueOnce(null);

        const res: Response = await supertest(app)
            .get(`/friends/history/${friend.user_uuid}`)
            .set("token", "mock_token");

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ message: "User does not exist or is not a friend." });
    });
});

// Interface DELETE /friends/requests (Reject Friend Request)
describe("Mocked: DELETE /friends/requests (Reject Friend Request)", () => {
    let friendsCollection: jest.Mocked<Collection<Friends>>;

    beforeEach(() => {
        friendsCollection = (services.client.db as jest.Mock)().collection("friends");

        (jwt.verify as jest.Mock).mockImplementation(() => user);

        friendsCollection.findOne.mockClear();
        friendsCollection.updateOne.mockClear();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        jest.clearAllMocks();
    });

    // Input: Valid user_uuid for rejecting friend request
    // Expected status code: 200
    // Expected behavior: Friend request is rejected successfully
    // Expected output: Confirmation message
    test("Successfully reject a friend request", async () => {
        const userFriends: Friends = {
            user_uuid: user.user_uuid,
            friends: [],
            incoming_requests: [{ user_uuid: friend.user_uuid, name: friend.name }],
        };

        friendsCollection.findOne.mockResolvedValueOnce(userFriends);
        friendsCollection.updateOne.mockResolvedValueOnce({ modifiedCount: 1, acknowledged: true, matchedCount: 1, upsertedCount: 0, upsertedId: null } as any);

        const res: Response = await supertest(app)
            .delete("/friends/requests")
            .set("token", "mock_token")
            .query({ user_uuid: friend.user_uuid });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("message", "Friend request rejected.");
        expect(friendsCollection.updateOne).toHaveBeenCalledWith(
            { user_uuid: user.user_uuid },
            { $pull: { incoming_requests: { user_uuid: friend.user_uuid } } }
        );
    });

    // Input: Rejecting a non-existent friend request
    // Expected status code: 404
    // Expected behavior: Request is rejected
    // Expected output: Error message
    test("Reject Friend Request, Non-existent Request", async () => {
        const userFriends: Friends = {
            user_uuid: user.user_uuid,
            friends: [],
            incoming_requests: [],
        };

        friendsCollection.findOne.mockResolvedValueOnce(userFriends);
        friendsCollection.updateOne.mockResolvedValueOnce({ modifiedCount: 0, acknowledged: true, matchedCount: 1, upsertedCount: 0, upsertedId: null } as any);

        const res: Response = await supertest(app)
            .delete("/friends/requests")
            .set("token", "mock_token")
            .query({ user_uuid: friend.user_uuid });

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty("message", "Friend request not found.");
        expect(friendsCollection.updateOne).toHaveBeenCalledWith(
            { user_uuid: user.user_uuid },
            { $pull: { incoming_requests: { user_uuid: friend.user_uuid } } }
        );
    });

    // Input: User tries to reject a friend request from themselves
    // Expected status code: 400
    // Expected behavior: Request is rejected
    // Expected output: Error message
    test("Reject Friend Request, from Self", async () => {
        const res: Response = await supertest(app)
            .delete("/friends/requests")
            .set("token", "mock_token")
            .query({ user_uuid: user.user_uuid });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("message", "Cannot reject friend request from yourself");
    });
});

// Interface DELETE /friends (Remove Friend)
describe("Mocked: DELETE /friends (Remove Friend)", () => {
    let friendsCollection: jest.Mocked<Collection<Friends>>;

    beforeEach(() => {
        friendsCollection = (services.client.db as jest.Mock)().collection("friends");

        (jwt.verify as jest.Mock).mockImplementation(() => user);

        friendsCollection.findOne.mockClear();
        friendsCollection.updateOne.mockClear();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        jest.clearAllMocks();
    });

    // Input: Valid user_uuid for removing a friend
    // Expected status code: 200
    // Expected behavior: Friend is removed successfully
    // Expected output: Confirmation message
    test("Successfully remove a friend", async () => {
        const userFriends: Friends = {
            user_uuid: user.user_uuid,
            friends: [{ user_uuid: friend.user_uuid, name: friend.name }],
            incoming_requests: [],
        };

        friendsCollection.findOne.mockResolvedValueOnce(userFriends);
        friendsCollection.updateOne.mockResolvedValueOnce({ modifiedCount: 1, acknowledged: true } as any);
        friendsCollection.updateOne.mockResolvedValueOnce({ modifiedCount: 1, acknowledged: true } as any);

        const res: Response = await supertest(app)
            .delete("/friends")
            .set("token", "mock_token")
            .query({ user_uuid: friend.user_uuid });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("message", "Friend removed.");
        expect(friendsCollection.updateOne).toHaveBeenCalledWith(
            { user_uuid: user.user_uuid },
            { $pull: { friends: { user_uuid: friend.user_uuid } } }
        );
        expect(friendsCollection.updateOne).toHaveBeenCalledWith(
            { user_uuid: friend.user_uuid },
            { $pull: { friends: { user_uuid: user.user_uuid } } }
        );
    });

    // Input: Removing a non-existent friend
    // Expected status code: 404
    // Expected behavior: Request is rejected
    // Expected output: Error message
    test("Return 404 when trying to remove a non-existent friend", async () => {
        const userFriends: Friends = {
            user_uuid: user.user_uuid,
            friends: [],
            incoming_requests: [],
        };

        friendsCollection.findOne.mockResolvedValueOnce(userFriends);
        friendsCollection.updateOne.mockResolvedValueOnce({ modifiedCount: 0, acknowledged: true } as any);
        friendsCollection.updateOne.mockResolvedValueOnce({ modifiedCount: 0, acknowledged: true } as any);

        const res: Response = await supertest(app)
            .delete("/friends")
            .set("token", "mock_token")
            .query({ user_uuid: friend.user_uuid });

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty("message", "Friend not found.");
        expect(friendsCollection.updateOne).toHaveBeenCalledWith(
            { user_uuid: user.user_uuid },
            { $pull: { friends: { user_uuid: friend.user_uuid } } }
        );
        expect(friendsCollection.updateOne).toHaveBeenCalledWith(
            { user_uuid: friend.user_uuid },
            { $pull: { friends: { user_uuid: user.user_uuid } } }
        );
    });

    // Input: User tries to remove themselves
    // Expected status code: 400
    // Expected behavior: Request is rejected
    // Expected output: Error message
    test("Return 400 when user tries to remove themselves", async () => {
        const res: Response = await supertest(app)
            .delete("/friends")
            .set("token", "mock_token")
            .query({ user_uuid: user.user_uuid });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("message", "Cannot remove yourself as a friend.");
    });
});

// Interface GET /friends (Get Current Friends)
describe("Mocked: GET /friends (Get Current Friends)", () => {
    let friendsCollection: jest.Mocked<Collection<Friends>>;

    beforeEach(() => {
        jest.clearAllMocks();
        friendsCollection = (services.client.db as jest.Mock)().collection("friends");
    
        friendsCollection.findOne.mockReset();

        (jwt.verify as jest.Mock).mockImplementation(() => user);
    
        friendsCollection.findOne.mockClear();
    });
    

    afterEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        jest.clearAllMocks();
    });

    const friend1: Friends["friends"][0] = { user_uuid: "friend-123", name: "Jane Doe" };
    const friend2: Friends["friends"][0] = { user_uuid: "friend-456", name: "Mike Smith" };

    // Input: User has friends
    // Expected status code: 200
    // Expected behavior: Returns list of current friends
    // Expected output: List of user UUIDs and names of current friends
    test("User has friends", async () => {
        const userFriends: Friends = {
            user_uuid: user.user_uuid,
            friends: [{ user_uuid: friend1.user_uuid, name: friend1.name }, { user_uuid: friend2.user_uuid, name: friend2.name }],
            incoming_requests: [],
        };

        friendsCollection.findOne.mockResolvedValueOnce(userFriends);

        const res: Response = await supertest(app)
            .get("/friends")
            .set("token", "mock_token");

        expect(res.status).toBe(200);
        expect(res.body).toEqual(userFriends.friends);
    });

    // Input: User has no friends
    // Expected status code: 200
    // Expected behavior: Returns an empty array
    // Expected output: []
    test("User has no friends", async () => {
        const userFriends: Friends = {
            user_uuid: user.user_uuid,
            friends: [],
            incoming_requests: [],
        };

        friendsCollection.findOne.mockResolvedValueOnce(userFriends);

        const res: Response = await supertest(app)
            .get("/friends")
            .set("token", "mock_token");

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });

    // Input: Database error
    // Expected status code: 200
    // Expected behavior: Returns an empty array
    // Expected output: []
    test("Database error", async () => {
        friendsCollection.findOne.mockResolvedValueOnce(null);

        const res: Response = await supertest(app)
            .get("/friends")
            .set("token", "mock_token");

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });
});

// Interface GET /friends/ecoscore_score/:user_uuid (Get Friend Ecoscore)
describe("Mocked: GET /friends/ecoscore_score/:user_uuid (Get Friend Ecoscore)", () => {
    let friendsCollection: jest.Mocked<Collection<Friends>>;
    let historyCollection: jest.Mocked<Collection<History>>;

    beforeEach(() => {
        jest.clearAllMocks();
        friendsCollection = (services.client.db as jest.Mock)().collection("friends");
        historyCollection = (services.client.db as jest.Mock)().collection("history");

        (jwt.verify as jest.Mock).mockImplementation(() => user);
        friendsCollection.findOne.mockClear();
        historyCollection.findOne.mockClear();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        jest.clearAllMocks();
    });

    // Input: Valid user_uuid for friend's ecoscore
    // Expected status code: 200
    // Expected behavior: Returns friend's ecoscore successfully
    // Expected output: Friend's ecoscore
    test("Successfully retrieve a friend's ecoscore", async () => {
        const userFriends: Friends = {
            user_uuid: user.user_uuid,
            friends: [{ user_uuid: friend.user_uuid, name: friend.name }],
            incoming_requests: [],
        };

        friendsCollection.findOne.mockResolvedValueOnce(userFriends);
        historyCollection.findOne.mockResolvedValueOnce(friendHistory);

        const res: Response = await supertest(app)
            .get(`/friends/ecoscore_score/${friend.user_uuid}`)
            .set("token", "mock_token");

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ ecoscore_score: friendHistory.ecoscore_score });
    });

    // Input: Friend is not in the user's friend list
    // Expected status code: 404
    // Expected behavior: Request is rejected
    // Expected output: Error message
    test("Return 404 when friend is not in the user's friend list", async () => {
        const userFriends: Friends = {
            user_uuid: user.user_uuid,
            friends: [], // No friends
            incoming_requests: [],
        };

        friendsCollection.findOne.mockResolvedValueOnce(userFriends);

        const res: Response = await supertest(app)
            .get(`/friends/ecoscore_score/${friend.user_uuid}`)
            .set("token", "mock_token");

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ message: "User does not exist or is not a friend." });
    });

    test("Return 404 when friend's history does not exist", async () => {
        const userFriends: Friends = {
            user_uuid: user.user_uuid,
            friends: [{ user_uuid: friend.user_uuid, name: friend.name }],
            incoming_requests: [],
        };

        friendsCollection.findOne.mockResolvedValueOnce(userFriends);
        historyCollection.findOne.mockResolvedValueOnce(null); // No history found

        const res: Response = await supertest(app)
            .get(`/friends/ecoscore_score/${friend.user_uuid}`)
            .set("token", "mock_token");

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ message: "No history found for the friend." });
    });

    test("Return 400 when user tries to get their own ecoscore", async () => {
        const res: Response = await supertest(app)
            .get(`/friends/ecoscore_score/${user.user_uuid}`)
            .set("token", "mock_token");

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ message: "User does not exist or is not a friend." });
    });
});


describe("Mocked: POST /friends/notifications", () => {
    let friendsCollection: jest.Mocked<Collection<Friends>>;
    let usersCollection: jest.Mocked<Collection<User>>;
    let historyCollection: jest.Mocked<Collection<History>>;
    let productCollection: jest.Mocked<Collection<Product>>;

    beforeEach(() => {
        jest.clearAllMocks();
        friendsCollection = (services.client.db as jest.Mock)().collection("friends");
        usersCollection = (services.client.db as jest.Mock)().collection("users");
        historyCollection = (services.client.db as jest.Mock)().collection("history");
        productCollection = (services.client.db as jest.Mock)().collection("products");
        productCollection.findOne.mockReset();
        productCollection.insertOne.mockClear();

        (jwt.verify as jest.Mock).mockImplementation(() => user);
        friendsCollection.findOne.mockClear();
        usersCollection.findOne.mockClear();
        historyCollection.findOne.mockClear();
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
        fcm_registration_token: "fcm-token-456",
        user_uuid: "friend-123",
        name: "Jane Doe",
    };

    const friendHistory: History = {
        user_uuid: friend.user_uuid,
        ecoscore_score: 75,
        products: [
            {
                product_id: "12345",
                timestamp: new Date("2024-01-01"),
                scan_uuid: "scan-123",
            },
        ],
    };

    const productDetails: Partial<Product> = {
        _id: "12345",
        product_name: "Eco-Friendly Product",
    };

    const mockProduct: Product = {
        _id: "12345",
        product_name: "Mock Product",
        ecoscore_grade: "A",
        ecoscore_score: 90,
        ecoscore_data: {},
        categories_tags: ["tag1", "tag2"],
        categories_hierarchy: ["hierarchy1", "hierarchy2"],
        countries_tags: ["france"],
        lang: "en"
    };

    const mockRecommendationA: Product = {
        _id: "67890",
        product_name: "Recommended Product A",
        ecoscore_grade: "B",
        ecoscore_score: 75,
        categories_tags: ["tag1", "tag2"],
        categories_hierarchy: ["hierarchy1", "hierarchy2"],
        countries_tags: ["france"],
        lang: "en"
    };

    test("Successfully send a product notification (praise)", async () => {
        friendsCollection.findOne.mockResolvedValueOnce({
            user_uuid: user.user_uuid,
            friends: [{ user_uuid: friend.user_uuid, name: friend.name }],
        });

        usersCollection.findOne.mockResolvedValueOnce(friend);
        historyCollection.findOne.mockResolvedValueOnce(friendHistory);
    
        productCollection.findOne.mockResolvedValueOnce(mockProduct);
        (productCollection.find as jest.Mock).mockReturnValue({
            limit: jest.fn().mockReturnThis(),
            toArray: jest.fn().mockResolvedValueOnce([mockRecommendationA]),
        });

        const res: Response = await supertest(app)
            .post("/friends/notifications")
            .set("token", "mock_token")
            .send({ user_uuid: friend.user_uuid, scan_uuid: "scan-123", message_type: "praise" });

        

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ message: "Notification sent." });

        expect(sendMock).toHaveBeenCalledWith({
            notification: {
                title: "CarbonWise",
                body: "John Doe has praised you for buying Mock Product",
            },
            token: friend.fcm_registration_token,
        });
    });

    test("Successfully send a product notification (shame)", async () => {
        friendsCollection.findOne.mockResolvedValueOnce({
            user_uuid: user.user_uuid,
            friends: [{ user_uuid: friend.user_uuid, name: friend.name }],
        });

        usersCollection.findOne.mockResolvedValueOnce(friend);
        historyCollection.findOne.mockResolvedValueOnce(friendHistory);

        productCollection.findOne.mockResolvedValueOnce(mockProduct);
        (productCollection.find as jest.Mock).mockReturnValue({
            limit: jest.fn().mockReturnThis(),
            toArray: jest.fn().mockResolvedValueOnce([mockRecommendationA]),
        });

        const res: Response = await supertest(app)
            .post("/friends/notifications")
            .set("token", "mock_token")
            .send({ user_uuid: friend.user_uuid, scan_uuid: "scan-123", message_type: "shame" });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ message: "Notification sent." });

        expect(sendMock).toHaveBeenCalledWith({
            notification: {
                title: "CarbonWise",
                body: "John Doe has shamed you for buying Mock Product",
            },
            token: friend.fcm_registration_token,
        });
    });

    test("Return 400 when user tries to send notification to themselves", async () => {
        const res: Response = await supertest(app)
            .post("/friends/notifications")
            .set("token", "mock_token")
            .send({ user_uuid: user.user_uuid, scan_uuid: "scan-123", message_type: "praise" });

        expect(res.status).toBe(400);
        expect(res.body).toEqual({ message: "Cannot send notification to yourself." });
    });

    test("Return 404 when recipient is not a friend", async () => {
        friendsCollection.findOne.mockResolvedValueOnce({ user_uuid: user.user_uuid, friends: [] });

        const res: Response = await supertest(app)
            .post("/friends/notifications")
            .set("token", "mock_token")
            .send({ user_uuid: friend.user_uuid, scan_uuid: "scan-123", message_type: "praise" });

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ message: "User does not exist or is not a friend." });
    });

    test("Return 404 when recipient has no history", async () => {
        friendsCollection.findOne.mockResolvedValueOnce({
            user_uuid: user.user_uuid,
            friends: [{ user_uuid: friend.user_uuid, name: friend.name }],
        });

        historyCollection.findOne.mockResolvedValueOnce(null);

        const res: Response = await supertest(app)
            .post("/friends/notifications")
            .set("token", "mock_token")
            .send({ user_uuid: friend.user_uuid, scan_uuid: "scan-123", message_type: "praise" });

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ message: "User history not found." });
    });

    test("Return 404 when product is not found in friend's history", async () => {
        const emptyHistory: History = { user_uuid: friend.user_uuid, ecoscore_score: 75, products: [] };

        friendsCollection.findOne.mockResolvedValueOnce({
            user_uuid: user.user_uuid,
            friends: [{ user_uuid: friend.user_uuid, name: friend.name }],
        });

        historyCollection.findOne.mockResolvedValueOnce(emptyHistory);

        const res: Response = await supertest(app)
            .post("/friends/notifications")
            .set("token", "mock_token")
            .send({ user_uuid: friend.user_uuid, scan_uuid: "scan-999", message_type: "praise" });

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ message: "Product not found in user's history." });
    });

    test("Return 400 when invalid message type is sent", async () => {
        const res: Response = await supertest(app)
            .post("/friends/notifications")
            .set("token", "mock_token")
            .send({ user_uuid: friend.user_uuid, scan_uuid: "scan-123", message_type: "invalid_type" });

        expect(res.status).toBe(400);
        expect(res.body).toEqual({
            errors: [
                {
                    location: "body",
                    msg: "Message type should be either 'praise' or 'shame'",
                    path: "message_type",
                    type: "field",
                    value: "invalid_type",
                },
            ],
        });
    });

    test("Return 404 when friend is not found due to friend collection not returning a document", async () => {
        const emptyHistory: History = { user_uuid: friend.user_uuid, ecoscore_score: 75, products: [] };

        friendsCollection.findOne.mockResolvedValueOnce(null);

        historyCollection.findOne.mockResolvedValueOnce(emptyHistory);

        const res: Response = await supertest(app)
            .post("/friends/notifications")
            .set("token", "mock_token")
            .send({ user_uuid: friend.user_uuid, scan_uuid: "scan-999", message_type: "praise" });

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ message: "User does not exist or is not a friend." });
    });


    test("Return 404 when target user does not exist", async () => {
        friendsCollection.findOne.mockResolvedValueOnce({
            user_uuid: user.user_uuid,
            friends: [{ user_uuid: friend.user_uuid, name: friend.name }],
        });

        usersCollection.findOne.mockResolvedValueOnce(null); // Target user does not exist
        historyCollection.findOne.mockResolvedValueOnce(friendHistory);

        productCollection.findOne.mockResolvedValueOnce({ _id: "12345", product_name: "Mock Product" });

        const res: Response = await supertest(app)
            .post("/friends/notifications")
            .set("token", "mock_token")
            .send({ user_uuid: friend.user_uuid, scan_uuid: "scan-123", message_type: "praise" });

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ message: "Product not found in user's history." });
    });

    test("Return 404 when target user has no fcm_registration_token", async () => {
        const friendWithoutToken: User = { ...friend, fcm_registration_token: ""  };

        friendsCollection.findOne.mockResolvedValueOnce({
            user_uuid: user.user_uuid,
            friends: [{ user_uuid: friendWithoutToken.user_uuid, name: friendWithoutToken.name }],
        });

        usersCollection.findOne.mockResolvedValueOnce(friendWithoutToken);
        historyCollection.findOne.mockResolvedValueOnce(friendHistory);

        productCollection.findOne.mockResolvedValueOnce({ _id: "12345", product_name: "Mock Product" });

        const res: Response = await supertest(app)
            .post("/friends/notifications")
            .set("token", "mock_token")
            .send({ user_uuid: friendWithoutToken.user_uuid, scan_uuid: "scan-123", message_type: "praise" });

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ message: "Target user does not have notifications enabled." });
    });

    test("Return 500 when Firebase messaging send fails", async () => {
        friendsCollection.findOne.mockResolvedValueOnce({
            user_uuid: user.user_uuid,
            friends: [{ user_uuid: friend.user_uuid, name: friend.name }],
        });

        usersCollection.findOne.mockResolvedValueOnce(friend);
        historyCollection.findOne.mockResolvedValueOnce(friendHistory);

        productCollection.findOne.mockResolvedValueOnce({ _id: "12345", product_name: "Mock Product" });

        // Mock Firebase send to reject with an error
        sendMock.mockRejectedValue(new Error("Firebase error"));

        const res: Response = await supertest(app)
            .post("/friends/notifications")
            .set("token", "mock_token")
            .send({ user_uuid: friend.user_uuid, scan_uuid: "scan-123", message_type: "praise" });

        expect(res.status).toBe(500);
        expect(res.body).toEqual({ message: "Error sending notification." });

        expect(sendMock).toHaveBeenCalledWith({
            notification: {
                title: "CarbonWise",
                body: "John Doe has praised you for buying Mock Product",
            },
            token: friend.fcm_registration_token,
        });
    });

    test("Product not found", async () => {
        friendsCollection.findOne.mockResolvedValueOnce({
            user_uuid: user.user_uuid,
            friends: [{ user_uuid: friend.user_uuid, name: friend.name }],
        });

        usersCollection.findOne.mockResolvedValueOnce(friend);
        historyCollection.findOne.mockResolvedValueOnce(friendHistory);

        productCollection.findOne.mockResolvedValueOnce(null);
        (axios.get as jest.Mock).mockRejectedValue(new Error("OpenFoodFacts error"));

        const res: Response = await supertest(app)
            .post("/friends/notifications")
            .set("token", "mock_token")
            .send({ user_uuid: friend.user_uuid, scan_uuid: "scan-123", message_type: "praise" });

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ message: "Product not found." });

    });
    
    
    
    

});
