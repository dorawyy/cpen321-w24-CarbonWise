import {createServer} from "../../utils";
import supertest from "supertest";

const app = createServer();

// Interface POST /auth/google
describe("Unmocked: POST /auth/google", () => {

    // Input: google_id_token is an invalid google id token
    // Expected status code: 401
    // Expected behavior: user is not authenticated
    // Expected output: error message
    test("Invalid Google ID Token", async () => {   

        await supertest(app).post("/auth/google").send({
            google_id_token: "invalid_google_id_token"
        }).expect(401);

    });
});
