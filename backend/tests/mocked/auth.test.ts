import { createServer } from "../../utils";
import supertest from "supertest";
import { v4 as uuidv4 } from "uuid";
import * as services from "../../services";


jest.mock("../../services", () => {
    const findOneMock = jest.fn();
    const insertOneMock = jest.fn();

    return {
        client: {
            db: jest.fn(() => ({
                collection: jest.fn((name) => {
                    if (name === "users") {
                        return {
                            findOne: findOneMock,
                            insertOne: insertOneMock,
                        };
                    }
                    return {};
                }),
            })),
        },
        oauthClient: {
            verifyIdToken: jest.fn(),
        },
    };
});

const app = createServer();

// Interface POST /auth/google
describe("Mocked: POST /auth/google", () => {
    let userCollection: any;
    let oauthClient: any;

    beforeEach(() => {
        userCollection = (services.client.db as jest.Mock)().collection("users");
        oauthClient = services.oauthClient;

        userCollection.findOne.mockClear();
        userCollection.insertOne.mockClear();
        oauthClient.verifyIdToken.mockClear();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // Input: google_id_token is a valid Google ID token for an existing user
    // Expected status code: 200
    // Expected behavior: user is authenticated
    // Expected output: JWT token
    test("Valid Google ID Token for Existing User", async () => {
        const mockUser = {
            google_id: "valid-google-id",
            email: "user@example.com",
            name: "Test User",
            user_uuid: uuidv4(),
        };

        oauthClient.verifyIdToken.mockImplementationOnce(() =>
            Promise.resolve({
                getPayload: () => ({
                    sub: mockUser.google_id,
                    email: mockUser.email,
                    name: mockUser.name,
                }),
            })
        );

        userCollection.findOne.mockResolvedValueOnce(mockUser);

        const res = await supertest(app)
            .post("/auth/google")
            .send({ google_id_token: "valid_google_id_token" });

        expect(res.status).toStrictEqual(200);
        expect(res.body).toHaveProperty("token");
        expect(res.body.token).toBeDefined();
        expect(userCollection.findOne).toHaveBeenCalledWith({ google_id: mockUser.google_id });
        expect(userCollection.insertOne).not.toHaveBeenCalled();
    });

    // Input: google_id_token is a valid Google ID token for a new user
    // Expected status code: 200
    // Expected behavior: user is created and authenticated
    // Expected output: JWT token
    test("Valid Google ID Token for New User", async () => {
        const newUser = {
            google_id: "new-google-id",
            email: "newuser@example.com",
            name: "New User",
        };

        oauthClient.verifyIdToken.mockImplementationOnce(() =>
            Promise.resolve({
                getPayload: () => ({
                    sub: newUser.google_id,
                    email: newUser.email,
                    name: newUser.name,
                }),
            })
        );

        userCollection.findOne.mockResolvedValueOnce(null);
        userCollection.insertOne.mockResolvedValueOnce({
            acknowledged: true,
            insertedId: "mocked-insert-id",
        });

        const res = await supertest(app)
            .post("/auth/google")
            .send({ google_id_token: "valid_google_id_token" });

        expect(res.status).toStrictEqual(200);
        expect(res.body).toHaveProperty("token");
        expect(res.body.token).toBeDefined();
        expect(userCollection.findOne).toHaveBeenCalledWith({ google_id: newUser.google_id });
        expect(userCollection.insertOne).toHaveBeenCalledWith({
            _id: expect.any(String),
            google_id: newUser.google_id,
            email: newUser.email,
            name: newUser.name,
            user_uuid: expect.any(String),
            fcm_registration_token: "",
        });
    });

    // Input: google_id_token is an invalid Google ID token
    // Expected status code: 401
    // Expected behavior: user is not authenticated
    // Expected output: error message
    test("Invalid Google ID Token", async () => {
        oauthClient.verifyIdToken.mockImplementationOnce(() => {
            throw new Error("Invalid token payload");
        });

        const res = await supertest(app)
            .post("/auth/google")
            .send({ google_id_token: "invalid_google_id_token" });

        expect(res.status).toStrictEqual(401);
        expect(res.body).toHaveProperty("message");
        expect(res.body.message).toStrictEqual("Invalid token");
        expect(userCollection.findOne).not.toHaveBeenCalled();
        expect(userCollection.insertOne).not.toHaveBeenCalled();
    });
});
