import { createServer } from "../../utils";
import supertest from "supertest";
import { client, historyCollection, usersCollection, usersDatabase } from "../../services";
import { testUserA, testHistoryA, testHistoryC, testUserC, testProductA, testProductB, testProductAId, testProductImageA, testProductImageB, JEST_TIMEOUT_MS, testHistoryE, testProductImageE, testUserE } from "../res/data";
import jwt from "jsonwebtoken";
import { checkHistory } from "../res/utils";
import axios from "axios";


// Interface GET /users/history
describe("Mocked: GET /users/history", () => {
    
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

    // Input: Authenticated user token
    // Expected status code: 200
    // Expected behavior: None
    // Expected output: User history with 1 product and images
    test("Successfully retrieved user history with 1 product", async () => {

        jest.spyOn(axios, "get").mockImplementationOnce(() =>
            Promise.resolve({
                data: testProductImageA
            })
        );

        const token = jwt.sign(testUserA, process.env.JWT_SECRET ?? "test-jwt-secret");
        await historyCollection.insertOne(testHistoryA);

        const res = await supertest(app).get("/users/history").set("token", token);
        expect(res.status).toBe(200);

        const history = res.body[0];
        checkHistory(history, testHistoryA, [testProductA]);

        expect(history.products[0].product?.image).toBe(Buffer.from(testProductImageA).toString('base64'));
    });

    // Input: Authenticated user token
    // Expected status code: 200
    // Expected behavior: None
    // Expected output: User history with 1 product and images
    test("Successfully retrieved user history with 1 product, shorter id", async () => {

        jest.spyOn(axios, "get").mockImplementationOnce(() =>
            Promise.resolve({
                data: testProductImageE 
            })
        );

        const token = jwt.sign(testUserE, process.env.JWT_SECRET ?? "test-jwt-secret");
        await historyCollection.insertOne(testHistoryE);

        const res = await supertest(app).get("/users/history").set("token", token);
        expect(res.status).toBe(200);

        const history = res.body[0];
        expect(history.products[0].product?.image).toBe(Buffer.from(testProductImageE).toString('base64'));
    });

    // Input: Authenticated user token
    // Expected status code: 200
    // Expected behavior: None
    // Expected output: User history with more than 1 product
    test("Successfully retrieved user history with more than 1 product", async () => {

        jest.spyOn(axios, "get").mockImplementationOnce(() =>
            Promise.resolve({
                data: testProductImageA
            })
        ).mockImplementationOnce(() =>
            Promise.resolve({
                data: testProductImageB
            })
        );

        const token = jwt.sign(testUserC, process.env.JWT_SECRET ?? "test-jwt-secret");
        await historyCollection.insertOne(testHistoryC);

        const res = await supertest(app).get("/users/history").set("token", token);
        expect(res.status).toBe(200);

        const history = res.body[0];
        checkHistory(history, testHistoryC, [testProductA, testProductB]);

        expect(history.products[0].product?.image).toBe(Buffer.from(testProductImageA).toString('base64'));
        expect(history.products[1].product?.image).toBe(Buffer.from(testProductImageB).toString('base64'));
    });

    // Input: User token with history, database error
    // Expected status code: 500
    // Expected behavior: None
    // Expected output: Error message
    test("Database error", async () => {

        jest.spyOn(historyCollection, "find").mockImplementationOnce(() => {
            throw new Error("Database error");
        });

        const token = jwt.sign(testUserC, process.env.JWT_SECRET ?? "test-jwt-secret");
        
        const res = await supertest(app).get("/users/history").set("token", token);
        expect(res.status).toBe(500);
    });

});

// Interface POST /users/history
describe("Mocked: POST /users/history", () => {
    
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

    // Input: User token, database error
    // Expected status code: 500
    // Expected behavior: None
    // Expected output: Error message
    test("Database error", async () => {

        jest.spyOn(historyCollection, "find").mockImplementationOnce(() => {
            throw new Error("Database error");
        });

        const token = jwt.sign(testUserC, process.env.JWT_SECRET ?? "test-jwt-secret");
        
        const res = await supertest(app).post("/users/history").set("token", token).send({ product_id: testProductAId });
        expect(res.status).toBe(500);
    });
});

// Interface DELETE /users/history
describe("Mocked: DELETE /users/history", () => {
    
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

    // Input: User token, database error
    // Expected status code: 500
    // Expected behavior: None
    // Expected output: Error message
    test("Database error", async () => {

        jest.spyOn(historyCollection, "updateOne").mockImplementationOnce(() => {
            throw new Error("Database error");
        });

        const token = jwt.sign(testUserC, process.env.JWT_SECRET ?? "test-jwt-secret");
        
        const res = await supertest(app).delete("/users/history").set("token", token).query({ scan_uuid: testHistoryA.products[0].scan_uuid });
        expect(res.status).toBe(500);
    });
});

// Interface POST /users/fcm_registration_token
describe("Mocked: POST /users/fcm_registration_token", () => {
    
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

    // Input: User token, database error
    // Expected status code: 500
    // Expected behavior: None
    // Expected output: Error message
    test("Database error", async () => {

        jest.spyOn(usersCollection, "updateOne").mockImplementationOnce(() => {
            throw new Error("Database error");
        });

        const token = jwt.sign(testUserC, process.env.JWT_SECRET ?? "test-jwt-secret");
        
        const res = await supertest(app).post("/users/fcm_registration_token").set("token", token).send({ fcm_registration_token: "new_token" });
        expect(res.status).toBe(500);
    });
});


// Interface GET /users/uuid
describe("Mocked: GET /users/uuid", () => {
    
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

    // Input: User token, database error
    // Expected status code: 500
    // Expected behavior: None
    // Expected output: Error message
    test("Database error", async () => {

        jest.spyOn(usersCollection, "findOne").mockImplementationOnce(() => {
            throw new Error("Database error");
        });

        const token = jwt.sign(testUserC, process.env.JWT_SECRET ?? "test-jwt-secret");
        
        const res = await supertest(app).get("/users/uuid").set("token", token);
        expect(res.status).toBe(500);
    });
});


// Interface GET /users/ecoscore_score
describe("Mocked: GET /users/ecoscore_score", () => {
    
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

    // Input: User token, database error
    // Expected status code: 500
    // Expected behavior: None
    // Expected output: Error message
    test("Database error", async () => {

        jest.spyOn(historyCollection, "findOne").mockImplementationOnce(() => {
            throw new Error("Database error");
        });

        const token = jwt.sign(testUserC, process.env.JWT_SECRET ?? "test-jwt-secret");
        
        const res = await supertest(app).get("/users/ecoscore_score").set("token", token);
        expect(res.status).toBe(500);
    });
});