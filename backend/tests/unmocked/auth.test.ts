import {createServer} from "../../utils";
import supertest from "supertest";

const app = createServer();

// Interface POST /auth/google
describe("Unmocked: POST /auth/google", () => {

    // Input: No google_id_token is sent
    // Expected status code: 401
    // Expected behavior: user is not authenticated
    // Expected output: error message
    test("Missing Google ID Token", async () => {
        const res = await supertest(app)
            .post("/auth/google")
            .send({});

        expect(res.status).toStrictEqual(401);
        expect(res.body).toHaveProperty("message");
        expect(res.body.message).toStrictEqual("Invalid Google OAuth token.");
    });

    // Input: Invalid google_id_token is sent
    // Expected status code: 401
    // Expected behavior: user is not authenticated
    // Expected output: error message
    test("Invalid Google ID Token", async () => {
        const res = await supertest(app)
            .post("/auth/google")
            .send({ google_id_token: "invalid_token" });

        expect(res.status).toStrictEqual(401);
        expect(res.body).toHaveProperty("message");
        expect(res.body.message).toStrictEqual("Invalid Google OAuth token.");
    });

    // Input: No body is sent
    // Expected status code: 401
    // Expected behavior: user is not authenticated
    // Expected output: error message
    test("Missing Body", async () => {
        const res = await supertest(app)
            .post("/auth/google");

        expect(res.status).toStrictEqual(401);
        expect(res.body).toHaveProperty("message");
        expect(res.body.message).toStrictEqual("Invalid Google OAuth token.");
    });
    
});