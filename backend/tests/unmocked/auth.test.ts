import {createServer} from "../../utils";
import supertest from "supertest";
import { JEST_TIMEOUT_MS } from "../res/data";
// Interface POST /auth/google
describe("Unmocked: POST /auth/google", () => {

    const app = createServer();
    jest.setTimeout(JEST_TIMEOUT_MS); 

    // Input: No google_id_token is sent
    // Expected status code: 401
    // Expected behavior: none
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
    // Expected behavior: none
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
    // Expected behavior: none
    // Expected output: error message
    test("Missing Body", async () => {
        const res = await supertest(app)
            .post("/auth/google");

        expect(res.status).toStrictEqual(401);
        expect(res.body).toHaveProperty("message");
        expect(res.body.message).toStrictEqual("Invalid Google OAuth token.");
    });

    // Input: process.env.JWT_SECRET is not defined
    // Expected status code: 500
    // Expected behavior: none
    // Expected output: Error message
    test("JWT_SECRET is not defined", async () => {

        delete process.env.JWT_SECRET;

        const res = await supertest(app)
            .post("/auth/google")
            .send({ google_id_token: "valid_google_id_token" });

        expect(res.status).toStrictEqual(500);
    });
    
});