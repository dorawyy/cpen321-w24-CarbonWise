import { createServer } from "../../utils";
import supertest from "supertest";
import * as services from "../../services";
import axios from "axios";
import { Product } from "../../types";
import { Collection } from "mongodb";

jest.mock("../../services", () => {
    const findOneMock = jest.fn();
    const insertOneMock = jest.fn();
    const toArrayMock = jest.fn();

    const findMock = jest.fn(() => {
        const cursor = {
            limit: jest.fn().mockReturnThis(),
            toArray: toArrayMock,
        };
        return cursor;
    });

    return {
        client: {
            db: jest.fn(() => ({
                collection: jest.fn((name) => {
                    if (name === "products") {
                        return {
                            findOne: findOneMock,
                            insertOne: insertOneMock,
                            find: findMock,
                        };
                    }
                    return {};
                }),
            })),
        },
    };
});

jest.mock("axios", () => ({
    get: jest.fn((url) => {
        if (url.includes("/api/v2/product/")) {
            return Promise.resolve({
                data: {
                    status: 1,
                    product: {
                        _id: "67890",
                        product_name: "API Fetched Product",
                        ecoscore_grade: "B",
                        ecoscore_score: 75,
                        categories_tags: ["tagA", "tagB"],
                        ingredients_tags: ["tagC", "tagD"],
                        categories_hierarchy: ["hierarchyA", "hierarchyB"],
                        countries_tags: ["usa"],
                    },
                },
            });
        } else if (url.includes("openfoodfacts-images.s3.eu-west-3.amazonaws.com")) {
            return Promise.resolve({
                data: Buffer.from("mockImageBinaryData").toString("binary"),
            });
        }
        return Promise.reject(new Error("Unknown API call"));
    }),
}));

const app = createServer();

// Interface GET /products/:product_id
describe("Mocked: GET /products/:product_id", () => {
    let productCollection: jest.Mocked<Collection<Product>>;

    beforeEach(() => {
        productCollection = (services.client.db as jest.Mock)().collection("products");
        productCollection.findOne.mockClear();
        productCollection.insertOne.mockClear();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    const mockProduct = {
        _id: "12345",
        product_name: "Mock Product",
        ecoscore_grade: "A",
        ecoscore_score: 90,
        ecoscore_data: {},
        categories_tags: ["tag1", "tag2"],
        ingredients_tags: ["tagC", "tagD"],
        categories_hierarchy: ["hierarchy1", "hierarchy2"],
        countries_tags: ["france"],
        lang: "en"
    };
    
    const apiResponse = {
        data: {
            status: 1,
            product: {
                _id: "67890",
                product_name: "API Fetched Product",
                ecoscore_grade: "B",
                ecoscore_score: 75,
                ecoscore_data: {},
                categories_tags: ["tagA", "tagB"],
                ingredients_tags: ["tagC", "tagD"],
                categories_hierarchy: ["hierarchyA", "hierarchyB"],
                countries_tags: ["usa"],
                lang: "en"
            },
        },
    };

    const mockRecommendationA = {
        _id: "67890",
        product_name: "Recommended Product A",
        ecoscore_grade: "B",
        ecoscore_score: 75,
        categories_tags: ["tag1", "tag2"],
        ingredients_tags: ["tagC", "tagD"],
        categories_hierarchy: ["hierarchy1", "hierarchy2"],
        countries_tags: ["france"],
        lang: "en"
    };

    const mockRecommendationB = {
        _id: "67891",
        product_name: "Recommended Product B",
        ecoscore_grade: "C",
        ecoscore_score: 70,
        categories_tags: ["tag1", "tag2"],
        ingredients_tags: ["tagC", "tagD"],
        categories_hierarchy: ["hierarchy1", "hierarchy2"],
        countries_tags: ["france"],
        lang: "en"
    };

    // Input: Valid product_id found in the database
    // Expected status code: 200
    // Expected behavior: Product is retrieved successfully with recommendations
    // Expected output: Product details with recommendations
    test("Valid Product ID (Found in DB with Recommendations)", async () => {
        const product_id = "12345";
    
        productCollection.findOne.mockResolvedValueOnce(mockProduct);
        (productCollection.find as jest.Mock).mockReturnValue({
            limit: jest.fn().mockReturnThis(),
            toArray: jest.fn().mockResolvedValueOnce([mockRecommendationA]),
        });
    
        const res = await supertest(app).get(`/products/${product_id}`);
    
        expect(res.status).toStrictEqual(200);
        expect(res.body).toHaveProperty("product");
        expect(res.body.product._id).toStrictEqual(product_id);
        expect(res.body.product.product_name).toStrictEqual("Mock Product");
        expect(res.body).toHaveProperty("recommendations");
        expect(res.body.recommendations.length).toBeGreaterThanOrEqual(1);
        expect(res.body.recommendations[0]._id).toStrictEqual("67890");
        expect(res.body.recommendations[0].product_name).toStrictEqual("Recommended Product A");
        expect(productCollection.find).toHaveBeenCalled();
    });
    
    // Input: Valid product_id not found in DB but found via OpenFoodFacts API
    // Expected status code: 200
    // Expected behavior: Product is fetched from OpenFoodFacts and saved
    // Expected output: Product details with recommendations
    test("Valid Product ID (Not in DB, Found in OpenFoodFacts)", async () => {
        const product_id = "67890";

        productCollection.findOne.mockResolvedValueOnce(null);
        (axios.get as jest.Mock).mockResolvedValueOnce(apiResponse);
        productCollection.insertOne.mockResolvedValueOnce({
            acknowledged: true,
            insertedId: "67890",
        });
        
        (productCollection.find as jest.Mock).mockReturnValue({
            limit: jest.fn().mockReturnThis(),
            toArray: jest.fn().mockResolvedValueOnce([mockRecommendationA]),
        });

        const res = await supertest(app).get(`/products/${product_id}`);

        expect(res.status).toStrictEqual(200);
        expect(res.body).toHaveProperty("product");
        expect(res.body.product._id).toStrictEqual(product_id);
        expect(res.body.product.product_name).toStrictEqual("API Fetched Product");
    });

    // Input: Invalid product_id, not found in DB or OpenFoodFacts
    // Expected status code: 404
    // Expected behavior: Product is not found
    // Expected output: Error message
    test("Invalid Product ID (Not Found Anywhere)", async () => {
        const product_id = "99999";

        productCollection.findOne.mockResolvedValueOnce(null);
        (axios.get as jest.Mock).mockResolvedValueOnce({ data: { status: 0 } });

        const res = await supertest(app).get(`/products/${product_id}`);

        expect(res.status).toStrictEqual(404);
        expect(res.body).toHaveProperty("message");
        expect(res.body.message).toStrictEqual("Product not found or missing required fields.");
    });

    // Input: Database error occurs
    // Expected status code: 500
    // Expected behavior: Internal server error
    // Expected output: Error message
    test("Database Error", async () => {
        const product_id = "error";

        productCollection.findOne.mockImplementationOnce(() => {
            throw new Error("Database failure");
        });

        const res = await supertest(app).get(`/products/${product_id}`);

        expect(res.status).toStrictEqual(500);
        expect(res.body).toHaveProperty("message");
        expect(res.body.message).toStrictEqual("Internal server error.");
    });

    // Input: Valid product_id found in DB but no recommendations exist
    // Expected status code: 200
    // Expected behavior: Product is retrieved, but recommendations are empty
    // Expected output: Product details with empty recommendations list
    test("Valid Product ID (Found in DB, No Recommendations)", async () => {
        const product_id = "12345";

        productCollection.findOne.mockResolvedValueOnce(mockProduct);
        (productCollection.find as jest.Mock).mockReturnValue({
            limit: jest.fn().mockReturnThis(),
            toArray: jest.fn().mockResolvedValueOnce([]),
        });

        const res = await supertest(app).get(`/products/${product_id}`);

        expect(res.status).toStrictEqual(200);
        expect(res.body).toHaveProperty("product");
        expect(res.body.product._id).toStrictEqual(product_id);
        expect(res.body.recommendations).toStrictEqual([]);
    });


    // Input: Valid product_id found in DB with multiple recommendations
    // Expected status code: 200
    // Expected behavior: Product is retrieved successfully with multiple recommendations
    // Expected output: Product details with a list of recommended products
    test("Valid Product ID (Found in DB, Multiple Recommendations)", async () => {
        const product_id = "12345";

        productCollection.findOne.mockResolvedValueOnce(mockProduct);
        (productCollection.find as jest.Mock).mockReturnValue({
            limit: jest.fn().mockReturnThis(),
            toArray: jest.fn().mockResolvedValueOnce([mockRecommendationA, mockRecommendationB]),
        });

        const res = await supertest(app).get(`/products/${product_id}`).query({ num_recommendations: 2 });

        expect(res.status).toStrictEqual(200);
        expect(res.body).toHaveProperty("product");
        expect(res.body.product._id).toStrictEqual(product_id);
        expect(res.body.recommendations.length).toStrictEqual(2);
    });

    // Input: Valid product_id found in DB with multiple recommendations, but only request one
    // Expected status code: 200
    // Expected behavior: Product is retrieved successfully with one recommendation
    // Expected output: Product details with a list of recommended products
    test("Valid Product ID (Found in DB, Multiple Recommendations, Requested One)", async () => {
        const product_id = "12345";

        productCollection.findOne.mockResolvedValueOnce(mockProduct);
        (productCollection.find as jest.Mock).mockReturnValue({
            limit: jest.fn().mockReturnThis(),
            toArray: jest.fn().mockResolvedValueOnce([mockRecommendationA, mockRecommendationB]),
        });

        const res = await supertest(app).get(`/products/${product_id}`).query({ num_recommendations: 1 });

        expect(res.status).toStrictEqual(200);
        expect(res.body).toHaveProperty("product");
        expect(res.body.product._id).toStrictEqual(product_id);
        expect(res.body.recommendations.length).toStrictEqual(1);
    });

    // Input: Valid product_id found in DB, but one of the recommended products is missing an _id
    // Expected status code: 200
    // Expected behavior: The product with missing _id is skipped from the recommendations list
    // Expected output: Product details with a filtered list of recommendations (excluding the invalid one)
    test("Valid Product ID (Found in DB, One Recommendation Missing _id)", async () => {
        const product_id = "12345";

        const invalidRecommendation = {
            product_name: "Invalid Recommendation", // Missing _id
            ecoscore_grade: "B",
            ecoscore_score: 70,
            categories_tags: ["tagA", "tagB"],
            ingredients_tags: ["tagC", "tagD"],
            categories_hierarchy: ["hierarchyA", "hierarchyB"],
            countries_tags: ["usa"],
        };

        productCollection.findOne.mockResolvedValueOnce(mockProduct);
        (productCollection.find as jest.Mock).mockReturnValue({
            limit: jest.fn().mockReturnThis(),
            toArray: jest.fn().mockResolvedValueOnce([invalidRecommendation]),
        });

        const res = await supertest(app).get(`/products/${product_id}`);

        expect(res.status).toStrictEqual(200);
        expect(res.body).toHaveProperty("product");
        expect(res.body.product._id).toStrictEqual(product_id);
        
        expect(res.body.recommendations.length).toStrictEqual(1);
    });

    // Input: Valid product_id found in DB but fetching recommendations fails
    // Expected status code: 500
    // Expected behavior: Internal server error due to DB failure
    // Expected output: Internal server error message
    test("Database Failure While Fetching Recommendations", async () => {
        const product_id = "12345";

        productCollection.findOne.mockResolvedValueOnce(mockProduct);
        (productCollection.find as jest.Mock).mockImplementationOnce(() => {
            throw new Error("Database failure");
        });

        const res = await supertest(app).get(`/products/${product_id}`);

        expect(res.status).toStrictEqual(500);
        expect(res.body).toHaveProperty("message");
        expect(res.body.message).toStrictEqual("Internal server error.");
    });


    // Input: Malformed product_id
    // Expected status code: 400
    // Expected behavior: Request is rejected due to invalid product_id format
    // Expected output: Error message about invalid product_id
    test("Invalid Product ID (Malformed Product ID)", async () => {
        const product_id = "abc!@#";

        const res = await supertest(app).get(`/products/${product_id}`);

        expect(res.status).toStrictEqual(404);
        expect(res.body).toHaveProperty("message");
        expect(res.body.message).toStrictEqual("Product not found or missing required fields.");
    });

    // Input: Valid product_id, but OpenFoodFacts API fails
    // Expected status code: 500
    // Expected behavior: Internal server error due to API failure
    // Expected output: Internal server error message
    test("API Failure While Fetching Product From OpenFoodFacts", async () => {
        const product_id = "67890";

        productCollection.findOne.mockResolvedValueOnce(null);
        (axios.get as jest.Mock).mockRejectedValueOnce(new Error("API failure"));

        const res = await supertest(app).get(`/products/${product_id}`);

        expect(res.status).toStrictEqual(404);
        expect(res.body).toHaveProperty("message");
        expect(res.body.message).toStrictEqual("Product not found or missing required fields.");
    });


    // Input: Valid product_id but image fetch fails
    // Expected status code: 200
    // Expected behavior: The product is retrieved successfully, but the image fetch fails and returns null
    // Expected output: Product details with a null image field in the response
    test("Valid Product ID (Image Fetch Failure)", async () => {
        const product_id = "12345";

        productCollection.findOne.mockResolvedValueOnce(mockProduct);
        (productCollection.find as jest.Mock).mockReturnValue({
            limit: jest.fn().mockReturnThis(),
            toArray: jest.fn().mockResolvedValueOnce([mockRecommendationA]),
        });

        (axios.get as jest.Mock).mockRejectedValueOnce(new Error("Image fetch error"));

        const res = await supertest(app).get(`/products/${product_id}`);

        expect(res.status).toStrictEqual(200);
        expect(res.body).toHaveProperty("product");
        expect(res.body.product._id).toStrictEqual(product_id);
        
        expect(res.body.product.image).toBeNull();
    });

    // Input: languages query parameter is provided as a comma-separated string
    // Expected status code: 200
    // Expected behavior: The languages parameter is correctly split into an array
    // Expected output: Processed correctly, languages are used in filtering
    test("Valid Product ID (Languages Query Parameter Parsed Correctly)", async () => {
        const product_id = "12345";

        productCollection.findOne.mockResolvedValueOnce(mockProduct);
        
        const res = await supertest(app).get(`/products/${product_id}`).query({ languages: "en,fr,de" });

        expect(res.status).toStrictEqual(200);
        expect(res.body).toHaveProperty("product");
        expect(res.body.product._id).toStrictEqual(product_id);
    });

    // Input: countries query parameter is provided as a comma-separated string
    // Expected status code: 200
    // Expected behavior: The countries parameter is correctly split into an array
    // Expected output: Processed correctly, countries are used in filtering
    test("Valid Product ID (Countries Query Parameter Parsed Correctly)", async () => {
        const product_id = "12345";

        productCollection.findOne.mockResolvedValueOnce(mockProduct);
        
        const res = await supertest(app).get(`/products/${product_id}`).query({ countries: "usa,france,germany" });

        expect(res.status).toStrictEqual(200);
        expect(res.body).toHaveProperty("product");
        expect(res.body.product._id).toStrictEqual(product_id);
    });

    // Input: Requested languages are specified, and at least one tag should match
    // Expected status code: 200
    // Expected behavior: The tag filtering works correctly based on the requested languages
    // Expected output: Only products with matching language-specific tags are included
    test("Valid Product ID (Filtering Tags Based on Requested Languages)", async () => {
        const product_id = "12345";

        const filteredRecommendation = {
            _id: "67890",
            product_name: "Filtered Recommendation",
            ecoscore_grade: "B",
            ecoscore_score: 75,
            categories_tags: ["en:tagA", "fr:tagB"],
            ingredients_tags: ["tagC", "tagD"],
            categories_hierarchy: ["en:hierarchyA", "fr:hierarchyB"],
        };

        productCollection.findOne.mockResolvedValueOnce(mockProduct);
        (productCollection.find as jest.Mock).mockReturnValue({
            limit: jest.fn().mockReturnThis(),
            toArray: jest.fn().mockResolvedValueOnce([filteredRecommendation]),
        });

        const res = await supertest(app).get(`/products/${product_id}`).query({ languages: "en" });

        expect(res.status).toStrictEqual(200);
        expect(res.body).toHaveProperty("product");
        expect(res.body.recommendations.length).toBeGreaterThanOrEqual(1);
        expect(res.body.recommendations[0].categories_tags).toContain("en:tagA");
    });

    // Input: includedCountries is specified and should be used in MongoDB query
    // Expected status code: 200
    // Expected behavior: The query correctly filters products based on included countries
    // Expected output: Recommendations should match the specified countries
    test("Valid Product ID (Filtering by Included Countries)", async () => {
        const product_id = "12345";

        const countryFilteredRecommendation = {
            _id: "67890",
            product_name: "Country-Specific Recommendation",
            ecoscore_grade: "B",
            ecoscore_score: 75,
            categories_tags: ["tagA", "tagB"],
            ingredients_tags: ["tagC", "tagD"],
            countries_tags: ["usa"],
        };

        productCollection.findOne.mockResolvedValueOnce(mockProduct);
        (productCollection.find as jest.Mock).mockReturnValue({
            limit: jest.fn().mockReturnThis(),
            toArray: jest.fn().mockResolvedValueOnce([countryFilteredRecommendation]),
        });

        const res = await supertest(app).get(`/products/${product_id}`).query({ countries: "usa" });

        expect(res.status).toStrictEqual(200);
        expect(res.body).toHaveProperty("product");
        expect(res.body.recommendations.length).toBeGreaterThanOrEqual(1);
        expect(res.body.recommendations[0].countries_tags).toContain("usa");
    });


    // Input: Image fetch fails, should return null instead of undefined
    // Expected status code: 200
    // Expected behavior: The image is null when it fails to fetch
    // Expected output: Product details with image set to null
    test("Valid Product ID (Image Fetch Fails, Returns Null)", async () => {
        const product_id = "12345";

        productCollection.findOne.mockResolvedValueOnce(mockProduct);
        (axios.get as jest.Mock).mockRejectedValueOnce(new Error("Image fetch failed"));

        const res = await supertest(app).get(`/products/${product_id}`);

        expect(res.status).toStrictEqual(200);
        expect(res.body.product.image).toBeNull();
    });

    // Input: OpenFoodFacts API response is malformed, missing status field
    // Expected status code: 404
    // Expected behavior: The function correctly handles an undefined status field
    // Expected output: Returns 404 because status !== 1
    test("Invalid Product ID (Missing Status in API Response)", async () => {
        const product_id = "67890";

        productCollection.findOne.mockResolvedValueOnce(null);
        (axios.get as jest.Mock).mockResolvedValueOnce({ data: { product: {} } });

        const res = await supertest(app).get(`/products/${product_id}`);

        expect(res.status).toStrictEqual(404);
        expect(res.body.message).toStrictEqual("Product not found or missing required fields.");
    });

    // Input: Valid 13-digit product_id should construct the correct image path
    // Expected status code: 200
    // Expected behavior: Image path is correctly formatted for a 13-digit product_id
    // Expected output: The expected path should be formed correctly
    test("Valid Product ID (Image Path Constructed Correctly)", async () => {
        const product_id = "1234567890123";

        productCollection.findOne.mockResolvedValueOnce(mockProduct);
        (axios.get as jest.Mock).mockResolvedValueOnce({
            data: Buffer.from("mockImageBinaryData").toString("binary"),
        });

        const res = await supertest(app).get(`/products/${product_id}`);

        expect(res.status).toStrictEqual(200);
        expect(axios.get).toHaveBeenCalledWith(
            expect.stringContaining(`data/123/456/789/0123/1.jpg`),
            expect.any(Object)
        );
    });

    // Input: baseProduct or recommended product has undefined categories_tags
    // Expected status code: 200
    // Expected behavior: calculateTagDifference should receive an empty array instead of undefined
    // Expected output: The function should not throw an error, and recommendations are processed
    test("Valid Product ID (Handles Missing categories_tags with ?? [])", async () => {
        const product_id = "12345";

        const incompleteProduct = {
            ...mockProduct,
            categories_tags: undefined,
        };

        const recommendationWithoutTags = {
            _id: "67890",
            product_name: "Recommendation with No Tags",
            ecoscore_grade: "B",
            ecoscore_score: 75,
            categories_tags: undefined,
        };

        productCollection.findOne.mockResolvedValueOnce(incompleteProduct);
        (productCollection.find as jest.Mock).mockReturnValue({
            limit: jest.fn().mockReturnThis(),
            toArray: jest.fn().mockResolvedValueOnce([recommendationWithoutTags]),
        });

        const res = await supertest(app).get(`/products/${product_id}`);

        expect(res.status).toStrictEqual(200);
        expect(res.body).toHaveProperty("product");
        expect(res.body.recommendations.length).toBe(1);
        expect(res.body.recommendations[0]._id).toStrictEqual("67890");
    });

    // Input: Product found, but multiple image fetch attempts fail (returning undefined)
    // Expected status code: 200
    // Expected behavior: image field in response should be null instead of undefined
    // Expected output: image field is explicitly set to null for both the base product and recommendations
    test("Valid Product ID (Handles Multiple Image Fetch Failures with ?? null)", async () => {
        const product_id = "12345";

        const recommendation = {
            _id: "67890",
            product_name: "Recommended Product",
            ecoscore_grade: "B",
            ecoscore_score: 75,
            categories_tags: ["tag1", "tag2"],
            ingredients_tags: ["tagC", "tagD"]
        };

        productCollection.findOne.mockResolvedValueOnce(mockProduct);
        (productCollection.find as jest.Mock).mockReturnValue({
            limit: jest.fn().mockReturnThis(),
            toArray: jest.fn().mockResolvedValueOnce([recommendation]),
        });

        (axios.get as jest.Mock)
            .mockRejectedValueOnce(new Error("Base product image fetch failed"))
            .mockRejectedValueOnce(new Error("Recommendation image fetch failed"));

        const res = await supertest(app).get(`/products/${product_id}`);

        expect(res.status).toStrictEqual(200);
        expect(res.body).toHaveProperty("product");
        expect(res.body.product.image).toBeNull();

        expect(res.body.recommendations.length).toBe(1);
        expect(res.body.recommendations[0]._id).toStrictEqual("67890");
        expect(res.body.recommendations[0].image).toBeNull();
    });

});
