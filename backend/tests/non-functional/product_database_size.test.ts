import { client, productsCollection } from "../../services";
import { JEST_TIMEOUT_MS } from "../res/data";

// Non-Functional: Test the number of products in the database
describe("Non-Functional: Product Database Size", () => {
    const MIN_PRODUCTS = 100000;

    beforeAll(async () => {
        await client.connect();
    });

    afterAll(async () => {
        await client.close();
    });

    // Non-Functional Test: Ensure the number of products in the database is greater than or equal to the minimum required
    // Input: None
    // Expected status code: N/A
    // Expected output: Product count is greater than or equal to 100,000
    test(`Check if the number of products is greater than or equal to ${MIN_PRODUCTS}`, async () => {
        console.log("Starting test for product database size...");

        const productCount = await productsCollection.countDocuments({
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
    }, JEST_TIMEOUT_MS);
});
