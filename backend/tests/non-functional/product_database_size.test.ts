import { client } from "../../services";

// Non-Functional: Test the number of products in the database
describe("Non-Functional: Product Database Size", () => {
    const MIN_PRODUCTS = 100000;
    const TIMEOUT_MS = 600000;

    beforeAll(async () => {
        console.log("Connecting to the database...");
        await client.connect();
        console.log("Connected to the database.");
    });

    afterAll(async () => {
        console.log("Closing the database connection...");
        await client.close();
        console.log("Database connection closed.");
    });

    // Non-Functional Test: Ensure the number of products in the database is greater than or equal to the minimum required
    // Input: None
    // Expected status code: N/A
    // Expected output: Product count is greater than or equal to 100,000
    test(`Check if the number of products is greater than or equal to ${MIN_PRODUCTS}`, async () => {
        console.log("Starting test for product database size...");
        const db = client.db("products_db");
        const collection = db.collection("products");

        const productCount = await collection.countDocuments({
            product_name: { $exists: true },
            categories_tags: { $exists: true },
            categories_hierarchy: { $exists: true },
            countries_tags: { $exists: true },
            lang: { $exists: true },
            ingredients_tags: { $exists: true }
        }, { limit: MIN_PRODUCTS });

        console.log(`Product count (clipped at ${MIN_PRODUCTS}): ${productCount}`);
        expect(productCount).toBeGreaterThanOrEqual(MIN_PRODUCTS);
        console.log("Non-Functional Test: Product database size is sufficient.");
    }, TIMEOUT_MS);
});
