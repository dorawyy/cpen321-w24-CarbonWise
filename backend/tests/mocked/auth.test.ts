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
                collection: jest.fn(() => ({
                    findOne: findOneMock,
                    insertOne: insertOneMock,
                })),
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
        userCollection = (services.client.db as jest.Mock)().collection();
        oauthClient = services.oauthClient;

        userCollection.findOne.mockClear();
        userCollection.insertOne.mockClear();
        oauthClient.verifyIdToken.mockClear();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // Input: google_id_token is an valid google ID token
    // Expected status code: 200
    // Expected behavior: user is authenticated
    // Expected output: JWT token
    test("Valid Google ID Token for Existing User", async () => {
        oauthClient.verifyIdToken.mockImplementationOnce(() =>
            Promise.resolve({
                getPayload: () => ({
                    sub: "valid-google-id",
                    email: "user@example.com",
                    name: "Test User",
                }),
            })
        );

        userCollection.findOne.mockResolvedValueOnce({
            google_id: "valid-google-id",
            email: "user@example.com",
            name: "Test User",
            user_uuid: uuidv4(),
        });


        const res = await supertest(app)
            .post("/auth/google")
            .send({ google_id_token: "valid_google_id_token" });

        expect(res.status).toStrictEqual(200);
        expect(res.body).toHaveProperty("token");
    });

    // Input: google_id_token is an valid google ID token
    // Expected status code: 200
    // Expected behavior: user is authenticated
    // Expected output: JWT token
    test("Valid Google ID Token for New User", async () => {
        oauthClient.verifyIdToken.mockImplementationOnce(() =>
            Promise.resolve({
                getPayload: () => ({
                    sub: "new-google-id",
                    email: "newuser@example.com",
                    name: "New User",
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
        expect(userCollection.findOne).toHaveBeenCalledWith({ google_id: "new-google-id" });
        expect(userCollection.insertOne).toHaveBeenCalledWith({
            _id: expect.any(String),
            google_id: "new-google-id",
            email: "newuser@example.com",
            name: "New User",
            user_uuid: expect.any(String),
            fcm_registration_token: "",
        });
    });
});
