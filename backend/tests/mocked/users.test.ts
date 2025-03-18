import { createServer } from "../../utils";
import supertest, { Response } from "supertest";
import * as services from "../../services";
import { User, Product, History } from "../../types";
import jwt from "jsonwebtoken";
import { Collection, FindCursor } from "mongodb";

jest.mock("../../services", () => {
    const findOneMockUsers = jest.fn();
    const updateOneMockUsers = jest.fn();
    const findOneMockHistory = jest.fn();
    const insertOneMockHistory = jest.fn();
    const deleteOneMockHistory = jest.fn();
    const updateOneMockHistory = jest.fn();
    
    const findMockHistory = jest.fn(() => {
        const cursor: Partial<FindCursor> = {
            limit: jest.fn().mockReturnThis(),
            toArray: jest.fn(),
        };
        return cursor;
    });

    const findOneMockProducts = jest.fn();
    const insertOneMockProducts = jest.fn();
    const toArrayMockProducts = jest.fn();

    const findMockProducts = jest.fn(() => {
        const cursor: Partial<FindCursor> = {
            limit: jest.fn().mockReturnThis(),
            toArray: toArrayMockProducts,
        };
        return cursor;
    });

    const findMockFriends = jest.fn(() => {
        const cursor: Partial<FindCursor> = {
            limit: jest.fn().mockReturnThis(),
            toArray: jest.fn(),
        };
        return cursor;
    });


    const findOneMockFriends = jest.fn();

    return {
        client: {
            db: jest.fn(() => ({
                collection: jest.fn((name: string) => {
                    if (name === "users") {
                        return {
                            findOne: findOneMockUsers,
                            updateOne: updateOneMockUsers,
                        };
                    } else if (name === "history") {
                        return {
                            findOne: findOneMockHistory,
                            insertOne: insertOneMockHistory,
                            deleteOne: deleteOneMockHistory,
                            find: findMockHistory,
                            updateOne: updateOneMockHistory,
                        };
                    } else if (name === "products") {
                        return {
                            findOne: findOneMockProducts,
                            insertOne: insertOneMockProducts,
                            find: findMockProducts,
                        };
                    } else if (name === "friends") {
                        return {
                            findOne: findOneMockFriends,
                            find: findMockFriends,
                        };
                    }
                    return {};
                }),
            })),
        },
    };
});

jest.mock("jsonwebtoken", () => ({
    ...jest.requireActual("jsonwebtoken"),
    verify: jest.fn(),
}));

jest.mock("axios");

const app = createServer();

const user: User = {
    _id: "user-123",
    google_id: "google-123",
    email: "john.doe@example.com",
    fcm_registration_token: "fcm-token-123",
    user_uuid: "user-123",
    name: "John Doe",
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

// Interface POST /users/history
describe("Mocked: POST /users/history", () => {
    let historyCollection: jest.Mocked<Collection<History>>;
    let productCollection: jest.Mocked<Collection<Product>>;

    beforeEach(() => {
        historyCollection = (services.client.db as jest.Mock)().collection("history");
        productCollection = (services.client.db as jest.Mock)().collection("products");

        (jwt.verify as jest.Mock).mockImplementation(() => user);

        historyCollection.findOne.mockClear();
        productCollection.findOne.mockClear();
        productCollection.find.mockClear();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        jest.clearAllMocks();
    });

    // Input: Mock product found in the collection
    // Expected status code: 200
    // Expected output: Product added to user's history
    // Behavior: Send POST request to add product to history
    test("Add Product to User's History Successfully", async () => {
        productCollection.findOne.mockResolvedValueOnce(mockProduct);

        historyCollection.updateOne.mockResolvedValueOnce({
            acknowledged: true,
            modifiedCount: 1,
            matchedCount: 1,
            upsertedCount: 0,
            upsertedId: null,
        });

        const res: Response = await supertest(app)
            .post("/users/history")
            .set("token", `mock_token`)
            .send({ product_id: mockProduct._id });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("product_id", mockProduct._id);
        expect(res.body).toHaveProperty("scan_uuid");
        expect(historyCollection.updateOne).toHaveBeenCalledWith(
            { user_uuid: user.user_uuid },
            { $push: { products: expect.objectContaining({ product_id: mockProduct._id }) } },
            { upsert: true }
        );
    });

    // Input: Nonexistent product ID
    // Expected status code: 404
    // Expected output: Error message indicating product not found
    // Behavior: Send POST request to add nonexistent product to history
    test("Fail to Add Product to User's History - Product Not Found", async () => {
        productCollection.findOne.mockResolvedValueOnce(null);

        const res: Response = await supertest(app)
            .post("/users/history")
            .set("token", `mock_token`)
            .send({ product_id: "nonexistent_product_id" });

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty("message", "Product could not be added to user history.");
        expect(historyCollection.updateOne).not.toHaveBeenCalled();
    });

    // Input: Missing product ID in request body
    // Expected status code: 400
    // Expected output: Error message indicating missing product ID
    // Behavior: Send POST request without product ID
    test("Fail to Add Product to User's History - Missing Product ID", async () => {
        const res: Response = await supertest(app)
            .post("/users/history")
            .set("token", `mock_token`)
            .send({});

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("errors");
        expect(historyCollection.updateOne).not.toHaveBeenCalled();
    });

    // Input: Mock product found in the collection
    // Expected status code: 200
    // Expected output: Product added to user's history, ecoscore_score not updated
    // Behavior: Send POST request to add product to history
    test("Update Ecoscore Average Successfully, fails to get ecoscore_score", async () => {
        productCollection.findOne.mockResolvedValueOnce(mockProduct);

        historyCollection.updateOne.mockResolvedValueOnce({
            acknowledged: true,
            modifiedCount: 1,
            matchedCount: 1,
            upsertedCount: 0,
            upsertedId: null,
        });

        historyCollection.findOne.mockResolvedValueOnce({
            user_uuid: user.user_uuid,
            products: [{ product_id: mockProduct._id, timestamp: new Date() }],
            ecoscore_score: 0,
        });

        const res: Response = await supertest(app)
            .post("/users/history")
            .set("token", `mock_token`)
            .send({ product_id: mockProduct._id });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("product_id", mockProduct._id);
        expect(res.body).toHaveProperty("scan_uuid");
        expect(historyCollection.updateOne).toHaveBeenCalledWith(
            { user_uuid: user.user_uuid },
            { $push: { products: expect.objectContaining({ product_id: mockProduct._id }) } },
            { upsert: true }
        );
    });

    // Input: Mock product found in the collection
    // Expected status code: 200
    // Expected output: Product added to user's history, ecoscore_score updated
    // Behavior: Send POST request to add product to history
    test("Update Ecoscore Average Successfully, successfully gets ecoscore_score", async () => {
        productCollection.findOne.mockResolvedValueOnce(mockProduct);

        historyCollection.updateOne.mockResolvedValueOnce({
            acknowledged: true,
            modifiedCount: 1,
            matchedCount: 1,
            upsertedCount: 0,
            upsertedId: null,
        });

        historyCollection.findOne.mockResolvedValueOnce({
            user_uuid: user.user_uuid,
            products: [{ product_id: mockProduct._id, timestamp: new Date() }],
            ecoscore_score: 20,
        });

        productCollection.findOne.mockResolvedValueOnce({
            _id: mockProduct._id,
            ecoscore_score: 20,
        });

        const res: Response = await supertest(app)
            .post("/users/history")
            .set("token", `mock_token`)
            .send({ product_id: mockProduct._id });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("product_id", mockProduct._id);
        expect(res.body).toHaveProperty("scan_uuid");
        expect(historyCollection.updateOne).toHaveBeenCalledWith(
            { user_uuid: user.user_uuid },
            { $push: { products: expect.objectContaining({ product_id: mockProduct._id }) } },
            { upsert: true }
        );
    });

    // Input: Mock product found in the collection
    // Expected status code: 200
    // Expected output: Product added to user's history, timestamps sorted
    // Behavior: Send POST request to add product to history
    test("Update Ecoscore Average Successfully, timestamp sorting", async () => {
        productCollection.findOne.mockResolvedValueOnce(mockProduct);

        historyCollection.updateOne.mockResolvedValueOnce({
            acknowledged: true,
            modifiedCount: 1,
            matchedCount: 1,
            upsertedCount: 0,
            upsertedId: null,
        });

        historyCollection.findOne.mockResolvedValueOnce({
            user_uuid: user.user_uuid,
            products: [
                { product_id: mockProduct._id, timestamp: new Date("2023-01-01T12:00:00Z") },
                { product_id: mockProduct._id, timestamp: new Date("2023-01-02T12:00:00Z") },
                { product_id: mockProduct._id, timestamp: new Date("2023-01-03T12:00:00Z") }
            ],
            ecoscore_score: 20,
        });

        const res: Response = await supertest(app)
            .post("/users/history")
            .set("token", `mock_token`)
            .send({ product_id: mockProduct._id });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("product_id", mockProduct._id);
        expect(res.body).toHaveProperty("scan_uuid");
        expect(historyCollection.updateOne).toHaveBeenCalledWith(
            { user_uuid: user.user_uuid },
            { $push: { products: expect.objectContaining({ product_id: mockProduct._id }) } },
            { upsert: true }
        );
    });

    // Input: Mock database error
    // Expected status code: 500
    // Expected output: Error message indicating database error
    // Behavior: Send POST request to add product to history
    test("Database error", async () => {
        productCollection.findOne.mockRejectedValueOnce(new Error("Database error"));

        const res: Response = await supertest(app)
            .post("/users/history")
            .set("token", `mock_token`)
            .send({ product_id: "nonexistent_product_id" });

        expect(res.status).toBe(500);
        expect(historyCollection.updateOne).not.toHaveBeenCalled();
    });

});

// Interface GET /users/history
describe("Mocked: GET /users/history", () => {
    let historyCollection: jest.Mocked<Collection<History>>;
    let productCollection: jest.Mocked<Collection<Product>>;

    beforeEach(() => {
        historyCollection = (services.client.db as jest.Mock)().collection("history");
        productCollection = (services.client.db as jest.Mock)().collection("products");

        (jwt.verify as jest.Mock).mockImplementation(() => user);

        historyCollection.find.mockClear();
        productCollection.findOne.mockClear();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        jest.clearAllMocks();
    });

    // Input: Valid token
    // Expected status code: 200
    // Expected output: User's history retrieved successfully
    // Behavior: Send GET request to retrieve user's history
    test("Get User's History Successfully", async () => {
        const mockHistory = [
            {
                user_uuid: user.user_uuid,
                products: [{ product_id: mockProduct._id }]
            }
        ];

        historyCollection.find.mockReturnValueOnce({
            limit: jest.fn().mockReturnThis(),
            toArray: jest.fn().mockResolvedValueOnce(mockHistory)
        } as unknown as FindCursor);

        productCollection.findOne.mockResolvedValueOnce(mockProduct);

        const res: Response = await supertest(app)
            .get("/users/history")
            .set("token", `mock_token`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].products[0]).toHaveProperty("product_id", mockProduct._id);
        expect(res.body[0].products[0].product).toHaveProperty("product_name", mockProduct.product_name);
    });

    // Input: Valid token, no history found
    // Expected status code: 404
    // Expected output: Error message indicating no history found
    // Behavior: Send GET request to retrieve user's history
    test("Fail to Get User's History - No History Found", async () => {
        historyCollection.find.mockReturnValueOnce({
            limit: jest.fn().mockReturnThis(),
            toArray: jest.fn().mockResolvedValueOnce([])
        } as unknown as FindCursor);

        const res: Response = await supertest(app)
            .get("/users/history")
            .set("token", `mock_token`);

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty("message", "No history found for the user.");
    });

    // Input: No token provided
    // Expected status code: 401
    // Expected output: Error message indicating no token provided
    // Behavior: Send GET request to retrieve user's history without token
    test("Fail to Get User's History, no token provided", async () => {
        const res: Response = await supertest(app)
            .get("/users/history")

        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("message", "No token provided.");
    });

    // Input: Invalid token
    // Expected status code: 403
    // Expected output: Error message indicating authentication error
    // Behavior: Send GET request to retrieve user's history with invalid token
    test("Fail to Get User's History, token error", async () => {
        (jwt.verify as jest.Mock).mockImplementation(() => {
            throw new Error("Token error");
        });

        const res: Response = await supertest(app)
            .get("/users/history")
            .set("token", `invalid_token`);

        expect(res.status).toBe(403);
        expect(res.body).toHaveProperty("message", "Authentication error.");
    });

});

// Interface DELETE /users/history
describe("Mocked: DELETE /users/history", () => {
    let historyCollection: jest.Mocked<Collection<History>>;

    beforeEach(() => {
        historyCollection = (services.client.db as jest.Mock)().collection("history");

        (jwt.verify as jest.Mock).mockImplementation(() => user);

        historyCollection.updateOne.mockClear();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        jest.clearAllMocks();
    });

    // Input: Valid token, valid scan_uuid
    // Expected status code: 200
    // Expected output: Success message indicating history entry deleted
    // Behavior: Send DELETE request to delete product from user's history
    test("Delete Product from User's History Successfully", async () => {
        historyCollection.updateOne.mockResolvedValueOnce({
            acknowledged: true,
            modifiedCount: 1,
            matchedCount: 1,
            upsertedCount: 0,
            upsertedId: null,
        });

        const res: Response = await supertest(app)
            .delete("/users/history")
            .set("token", `mock_token`)
            .query({ scan_uuid: "scan-123" });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("message", "History entry deleted");
        expect(historyCollection.updateOne).toHaveBeenCalledWith(
            { user_uuid: user.user_uuid },
            { $pull: { products: { scan_uuid: "scan-123" } } }
        );
    });

    // Input: Valid token, nonexistent scan_uuid
    // Expected status code: 404
    // Expected output: Error message indicating history entry not found
    // Behavior: Send DELETE request to delete nonexistent product from user's history
    test("Fail to Delete Product from User's History - History Entry Not Found", async () => {
        historyCollection.updateOne.mockResolvedValueOnce({
            acknowledged: true,
            modifiedCount: 0,
            matchedCount: 0,
            upsertedCount: 0,
            upsertedId: null,
        });

        const res: Response = await supertest(app)
            .delete("/users/history")
            .set("token", `mock_token`)
            .query({ scan_uuid: "nonexistent_scan_uuid" });

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty("message", "History entry not found.");
        expect(historyCollection.updateOne).toHaveBeenCalledWith(
            { user_uuid: user.user_uuid },
            { $pull: { products: { scan_uuid: "nonexistent_scan_uuid" } } }
        );
    });
});

// Interface POST /users/fcm_registration_token
describe("Mocked: POST /users/fcm_registration_token", () => {
    let userCollection: jest.Mocked<Collection<User>>;

    beforeEach(() => {
        userCollection = (services.client.db as jest.Mock)().collection("users");

        (jwt.verify as jest.Mock).mockImplementation(() => user);

        userCollection.updateOne.mockClear();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        jest.clearAllMocks();
    });

    // Input: Valid token, new FCM registration token
    // Expected status code: 200
    // Expected output: Success message indicating FCM registration token updated
    // Behavior: Send POST request to update FCM registration token
    test("Update FCM Registration Token Successfully", async () => {
        userCollection.updateOne.mockResolvedValueOnce({
            acknowledged: true,
            matchedCount: 1,
            modifiedCount: 1,
            upsertedCount: 0,
            upsertedId: null,
        });

        const res: Response = await supertest(app)
            .post("/users/fcm_registration_token")
            .set("token", `mock_token`)
            .send({ fcm_registration_token: "new_fcm_token" });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("message", "FCM registration token updated.");
        expect(userCollection.updateOne).toHaveBeenCalledWith(
            { user_uuid: user.user_uuid },
            { $set: { fcm_registration_token: "new_fcm_token" } },
            { upsert: true }
        );
    });

    // Input: Valid token, new FCM registration token, user not found
    // Expected status code: 404
    // Expected output: Error message indicating user not found
    // Behavior: Send POST request to update FCM registration token
    test("Fail to Update FCM Registration Token - User Not Found", async () => {
        userCollection.updateOne.mockResolvedValueOnce({
            acknowledged: true,
            matchedCount: 0,
            modifiedCount: 0,
            upsertedCount: 0,
            upsertedId: null,
        });

        const res: Response = await supertest(app)
            .post("/users/fcm_registration_token")
            .set("token", `mock_token`)
            .send({ fcm_registration_token: "new_fcm_token" });

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty("message", "User not found.");
        expect(userCollection.updateOne).toHaveBeenCalledWith(
            { user_uuid: user.user_uuid },
            { $set: { fcm_registration_token: "new_fcm_token" } },
            { upsert: true }
        );
    });
});

// Interface GET /users/uuid
describe("Mocked: GET /users/uuid", () => {
    beforeEach(() => {
        (jwt.verify as jest.Mock).mockImplementation(() => user);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        jest.clearAllMocks();
    });

    // Input: Valid token
    // Expected status code: 200
    // Expected output: User UUID retrieved successfully
    // Behavior: Send GET request to retrieve user UUID
    test("Get User UUID Successfully", async () => {
        const res: Response = await supertest(app)
            .get("/users/uuid")
            .set("token", `mock_token`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("user_uuid", user.user_uuid);
    });
});

// Interface GET /users/ecoscore_score
describe("Mocked: GET /users/ecoscore_score", () => {
    let historyCollection: jest.Mocked<Collection<History>>;

    beforeEach(() => {
        historyCollection = (services.client.db as jest.Mock)().collection("history");

        (jwt.verify as jest.Mock).mockImplementation(() => user);

        historyCollection.findOne.mockClear();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        jest.clearAllMocks();
    });

    // Input: Valid token
    // Expected status code: 200
    // Expected output: User's ecoscore average retrieved successfully
    // Behavior: Send GET request to retrieve user's ecoscore average
    test("Get User Ecoscore Average Successfully", async () => {
        const mockHistory = {
            user_uuid: user.user_uuid,
            products: [
                { product_id: mockProduct._id, timestamp: new Date() }
            ]
        };

        historyCollection.findOne.mockResolvedValueOnce(mockHistory);

        const res: Response = await supertest(app)
            .get("/users/ecoscore_score")
            .set("token", `mock_token`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("ecoscore_score");
    });

    // Input: Valid token, no history found
    // Expected status code: 404
    // Expected output: Error message indicating no history found
    // Behavior: Send GET request to retrieve user's ecoscore average
    test("Fail to Get User Ecoscore Average - No History Found", async () => {
        historyCollection.findOne.mockResolvedValueOnce(null);

        const res: Response = await supertest(app)
            .get("/users/ecoscore_score")
            .set("token", `mock_token`);

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty("message", "No history found for the user.");
    });
});

// Interface GET /users/ecoscore_score
describe("Mocked: GET /users/ecoscore_score", () => {
    let historyCollection: jest.Mocked<Collection<History>>;
    let productCollection: jest.Mocked<Collection<Product>>;

    beforeEach(() => {
        historyCollection = (services.client.db as jest.Mock)().collection("history");
        productCollection = (services.client.db as jest.Mock)().collection("products");
        (jwt.verify as jest.Mock).mockImplementation(() => user);

        historyCollection.findOne.mockClear();
        productCollection.findOne.mockClear();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        jest.clearAllMocks();
    });

    // Input: Valid token
    // Expected status code: 200
    // Expected output: User's ecoscore average retrieved successfully
    // Behavior: Send GET request to retrieve user's ecoscore average
    test("Get User Ecoscore Average Successfully", async () => {
        const mockHistory = {
            user_uuid: user.user_uuid,
            products: [
                { product_id: mockProduct._id, timestamp: new Date() }
            ]
        };

        historyCollection.findOne.mockResolvedValueOnce(mockHistory);

        const res: Response = await supertest(app)
            .get("/users/ecoscore_score")
            .set("token", `mock_token`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("ecoscore_score");
    });

    // Input: Valid token, no history found
    // Expected status code: 404
    // Expected output: Error message indicating no history found
    // Behavior: Send GET request to retrieve user's ecoscore average
    test("Fail to Get User Ecoscore Average - No History Found", async () => {
        historyCollection.findOne.mockResolvedValueOnce(null);

        const res: Response = await supertest(app)
            .get("/users/ecoscore_score")
            .set("token", `mock_token`);

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty("message", "No history found for the user.");
    });

    // Input: Valid token, product exists but missing ecoscore_grade
    // Expected status code: 200
    // Expected output: User's ecoscore average retrieved successfully with default score
    // Behavior: Send GET request to retrieve user's ecoscore average
    test("Fail to Get User Ecoscore Average - Product Exists but Missing ecoscore_grade", async () => {
        const mockHistory = {
            user_uuid: user.user_uuid,
            products: [{ product_id: "product-missing-grade", timestamp: new Date() }]
        };

        historyCollection.findOne.mockResolvedValueOnce(mockHistory);

        productCollection.findOne.mockResolvedValueOnce({
            _id: "product-missing-grade",
            ecoscore_score: 85,
        });

        const res: Response = await supertest(app)
            .get("/users/ecoscore_score")
            .set("token", `mock_token`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("ecoscore_score", 85);
    });

    // Input: Valid token, product exists but missing ecoscore_score
    // Expected status code: 200
    // Expected output: User's ecoscore average retrieved successfully with default score
    // Behavior: Send GET request to retrieve user's ecoscore average
    test("Fail to Get User Ecoscore Average - Product Exists but Missing ecoscore_score", async () => {
        const mockHistory = {
            user_uuid: user.user_uuid,
            products: [{ product_id: "product-missing-score", timestamp: new Date() }]
        };

        historyCollection.findOne.mockResolvedValueOnce(mockHistory);

        productCollection.findOne.mockResolvedValueOnce({
            _id: "product-missing-score",
            ecoscore_grade: "A", // ecoscore_score is missing
        });

        const res: Response = await supertest(app)
            .get("/users/ecoscore_score")
            .set("token", `mock_token`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("ecoscore_score", 0);
    });

    // Input: Valid token, product exists with ecoscore_score and ecoscore_grade
    // Expected status code: 200
    test("Success to Get User Ecoscore Average - Product Exists and has ecoscore_score and ecoscore_grade", async () => {
        const mockHistory = {
            user_uuid: user.user_uuid,
            products: [{ product_id: "product-with-score-and-grade", timestamp: new Date() }]
        };

        historyCollection.findOne.mockResolvedValueOnce(mockHistory);

        productCollection.findOne.mockResolvedValueOnce({
            _id: "product-with-score-and-grade",
            ecoscore_grade: "A",
            ecoscore_score: 85,
        });

        const res: Response = await supertest(app)
            .get("/users/ecoscore_score")
            .set("token", `mock_token`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("ecoscore_score", 85);
    });

    test("Verify Sorting by Timestamp Works Correctly", async () => {
        const mockHistory = {
            user_uuid: user.user_uuid,
            products: [
                { product_id: "p1", timestamp: new Date("2023-01-01T12:00:00Z") },
                { product_id: "p2", timestamp: new Date("2023-01-02T12:00:00Z") },
                { product_id: "p3", timestamp: new Date("2023-01-03T12:00:00Z") }
            ]
        };

        historyCollection.findOne.mockResolvedValueOnce(mockHistory);

        productCollection.findOne.mockImplementation(async (query) => {
            if (query._id === "p1") return { ecoscore_grade: "B", ecoscore_score: 50 };
            if (query._id === "p2") return { ecoscore_grade: "A", ecoscore_score: 90 };
            if (query._id === "p3") return { ecoscore_grade: "C", ecoscore_score: 30 };
            return null;
        });

        const res: Response = await supertest(app)
            .get("/users/ecoscore_score")
            .set("token", `mock_token`);

        expect(res.status).toBe(200);
        expect(historyCollection.findOne).toHaveBeenCalled();
        expect(res.body).toHaveProperty("ecoscore_score");

        // Ensure sorting order: p3 (latest), p2, p1
        expect(mockHistory.products.map(p => p.product_id)).toEqual(["p3", "p2", "p1"]);
    });
    
});
