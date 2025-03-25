import { createServer } from "../../utils";
import supertest from "supertest";
import * as services from "../../services";
import { JEST_TIMEOUT_MS, testUserA } from "../res/data";
import jwt from "jsonwebtoken";
import { client, usersCollection, usersDatabase } from "../../services";


// Interface POST /auth/google
describe("Mocked: POST /auth/google", () => {

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

    // Input: google_id_token is a valid Google ID token for an existing user
    // Expected status code: 200
    // Expected behavior: none
    // Expected output: JWT with user data
    test("Valid Google ID Token for Existing User", async () => {

        jest.spyOn(services.oauthClient, "verifyIdToken").mockImplementationOnce(() =>
            Promise.resolve({
                getPayload: () => ({
                    sub: testUserA.google_id,
                    email: testUserA.email,
                    name: testUserA.name,
                }),
            })
        );

        await usersCollection.insertOne(testUserA);

        const res = await supertest(app)
            .post("/auth/google")
            .send({ google_id_token: "valid_google_id_token" });


        expect(res.status).toStrictEqual(200);
        expect(res.body).toHaveProperty("token");

        const token = res.body.token;
        const decoded_token = jwt.verify(token as string, process.env.JWT_SECRET as string);
        
        expect(decoded_token).toMatchObject(testUserA);
    });

    // Input: google_id_token is a valid Google ID token for a new user
    // Expected status code: 200
    // Expected behavior: user is created
    // Expected output: JWT with user data
    test("Valid Google ID Token for New User", async () => {

        jest.spyOn(services.oauthClient, "verifyIdToken").mockImplementationOnce(() =>
            Promise.resolve({
                getPayload: () => ({
                    sub: testUserA.google_id,
                    email: testUserA.email,
                    name: testUserA.name,
                }),
            })
        );

        const res = await supertest(app)
            .post("/auth/google")
            .send({ google_id_token: "valid_google_id_token" });


        expect(res.status).toStrictEqual(200);
        expect(res.body).toHaveProperty("token");

        const token = res.body.token;
        const decoded_token = jwt.verify(token as string, process.env.JWT_SECRET as string);
        
        expect(decoded_token).toMatchObject({
            _id: expect.any(String),
            google_id: testUserA.google_id,
            email: testUserA.email,
            name: testUserA.name,
            user_uuid: expect.any(String),
        });
    });

    // Input: Verify google_id_token fails
    // Expected status code: 401
    // Expected behavior: none
    // Expected output: Error message
    test("Invalid Google ID Token", async () => {

        jest.spyOn(services.oauthClient, "verifyIdToken").mockImplementationOnce(() =>
            Promise.reject(new Error("Invalid Google OAuth token"))
        );

        const res = await supertest(app)
            .post("/auth/google")
            .send({ google_id_token: "invalid_google_id_token" });


        expect(res.status).toStrictEqual(401);
        expect(res.body).toHaveProperty("message", "Invalid Google OAuth token.");
    });

    // Input: Payload returned by verifyIdToken is missing one required fields
    // Expected status code: 401
    // Expected behavior: none
    // Expected output: Error message
    test("Missing Required Fields in Payload", async () => {

        jest.spyOn(services.oauthClient, "verifyIdToken").mockImplementationOnce(() =>
            Promise.resolve({
                getPayload: () => ({
                    sub: testUserA.google_id,
                    email: testUserA.email
                }),
            })
        );

        const res = await supertest(app)
            .post("/auth/google")
            .send({ google_id_token: "invalid_google_id_token" });


        expect(res.status).toStrictEqual(401);
        expect(res.body).toHaveProperty("message", "Invalid Google OAuth token.");
    });

    // Input: Payload returned by verifyIdToken is missing multiple required fields
    // Expected status code: 401
    // Expected behavior: none
    // Expected output: Error message
    test("Missing Multiple Required Fields in Payload", async () => {

        jest.spyOn(services.oauthClient, "verifyIdToken").mockImplementationOnce(() =>
            Promise.resolve({
                getPayload: () => ({
                    sub: testUserA.google_id,
                }),
            })
        );

        const res = await supertest(app)
            .post("/auth/google")
            .send({ google_id_token: "invalid_google_id_token" });


        expect(res.status).toStrictEqual(401);
        expect(res.body).toHaveProperty("message", "Invalid Google OAuth token.");
    });
    

    // Input: Payload returned by verifyIdToken is missing all required fields
    // Expected status code: 401
    // Expected behavior: none
    // Expected output: Error message
    test("Missing Multiple Required Fields in Payload", async () => {

        jest.spyOn(services.oauthClient, "verifyIdToken").mockImplementationOnce(() =>
            Promise.resolve({
                getPayload: () => ({}),
            })
        );

        const res = await supertest(app)
            .post("/auth/google")
            .send({ google_id_token: "invalid_google_id_token" });


        expect(res.status).toStrictEqual(401);
        expect(res.body).toHaveProperty("message", "Invalid Google OAuth token.");
    });

    // Input: Null payload returned by verifyIdToken
    // Expected status code: 401
    // Expected behavior: none
    // Expected output: Error message
    test("Null Payload", async () => {

        jest.spyOn(services.oauthClient, "verifyIdToken").mockImplementationOnce(() =>
            Promise.resolve({
                getPayload: () => null,
            })
        );

        const res = await supertest(app)
            .post("/auth/google")
            .send({ google_id_token: "invalid_google_id_token" });


        expect(res.status).toStrictEqual(401);
        expect(res.body).toHaveProperty("message", "Invalid Google OAuth token.");
    });

});
