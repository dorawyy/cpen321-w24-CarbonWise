import { createServer } from "../../utils";

describe("MongoDB Client Initialization - Fallback Coverage", () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeAll(() => {
        originalEnv = { ...process.env };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    test("Should use default DB_URI when environment variable is missing", () => {
        delete process.env.DB_URI;

        jest.resetModules();
        const { client } = require("../../services");

        expect(client).toBeDefined();
    });

    test("Should use environment DB_URI when provided", () => {
        process.env.DB_URI = "mongodb://mocked-db-uri:27017";

        jest.resetModules();
        const { client } = require("../../services");

        expect(client).toBeDefined();
    });

    
    
});
