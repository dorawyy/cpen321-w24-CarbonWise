import { createServer } from "../../utils";
import supertest from "supertest";
import * as services from "../../services";
import axios from "axios";

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
    let productCollection: any;

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
        categories_hierarchy: ["hierarchy1", "hierarchy2"],
        countries_tags: ["france"],
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
                categories_hierarchy: ["hierarchyA", "hierarchyB"],
                countries_tags: ["usa"],
            },
        },
    };

    const mockRecommendation = {
        _id: "67890",
        product_name: "Recommended Product",
        ecoscore_grade: "B",
        ecoscore_score: 75,
        categories_tags: ["tag1", "tag2"],
        categories_hierarchy: ["hierarchy1", "hierarchy2"],
        countries_tags: ["france"],
    };

    // Input: Valid product_id found in the database
    // Expected status code: 200
    // Expected behavior: Product is retrieved successfully
    // Expected output: Product details with recommendations
    test("Valid Product ID (Found in DB with Recommendations)", async () => {
        const product_id = "12345";
    
        productCollection.findOne.mockResolvedValueOnce(mockProduct);
        productCollection.find().toArray.mockResolvedValueOnce([mockRecommendation]);
    
        const res = await supertest(app).get(`/products/${product_id}`);
    
        expect(res.status).toStrictEqual(200);
        expect(res.body).toHaveProperty("product");
        expect(res.body.product._id).toStrictEqual(product_id);
        expect(res.body.product.product_name).toStrictEqual("Mock Product");
        expect(res.body).toHaveProperty("recommendations");
        expect(res.body.recommendations.length).toBeGreaterThanOrEqual(1);
        expect(res.body.recommendations[0]._id).toStrictEqual("67890");
        expect(res.body.recommendations[0].product_name).toStrictEqual("Recommended Product");
        expect(productCollection.findOne).toHaveBeenCalledWith({ _id: product_id });
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
        productCollection.insertOne.mockResolvedValueOnce({ acknowledged: true });
        productCollection.find().toArray.mockResolvedValueOnce([mockRecommendation]);

        const res = await supertest(app).get(`/products/${product_id}`);

        expect(res.status).toStrictEqual(200);
        expect(res.body).toHaveProperty("product");
        expect(res.body.product._id).toStrictEqual(product_id);
        expect(res.body.product.product_name).toStrictEqual("API Fetched Product");
        expect(productCollection.findOne).toHaveBeenCalledWith({ _id: product_id });
        expect(productCollection.insertOne).toHaveBeenCalledWith({
            _id: product_id,
            product_name: "API Fetched Product",
            ecoscore_grade: "B",
            ecoscore_score: 75,
            ecoscore_data: {},
            categories_tags: ["tagA", "tagB"],
            categories_hierarchy: ["hierarchyA", "hierarchyB"],
            countries_tags: ["usa"],
        });
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
        expect(res.body.message).toStrictEqual("Internal server error");
    });
});
