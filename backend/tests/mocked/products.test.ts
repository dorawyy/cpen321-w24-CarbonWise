import { createServer } from "../../utils";
import supertest from "supertest";
import { Product } from "../../types";
import { client, productsCollection } from "../../services";
import axios from "axios";
import { testProductAId, testProductA, testProductImageA, testProductImageB, testRecommendationImageA, testRecommendationImageB, testProductBId, testProductB, JEST_TIMEOUT_MS } from "../res/data";
import { DEFAULT_RECOMMENDATIONS_LIMIT, OPENFOODFACTS_API_URL, OPENFOODFACTS_IMAGE_API_URL } from "../../constants";
import { checkProduct, checkRecommendations } from "../res/utils";

// Interface: GET /products/:product_id
describe("Mocked: GET /products/:product_id", () => {

    const app = createServer();
    jest.setTimeout(JEST_TIMEOUT_MS); 

    beforeAll(async () => {
        await client.connect();
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.resetAllMocks();
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        await client.close();
    });
    
    // Input: Valid product_id found in the database without images
    // Expected status code: 200
    // Expected behavior: None
    // Expected output: Product details with recommendations without images
    test("Valid Product ID Found in DB with Recommendations Without Images", async () => {

        jest.spyOn(axios, "get").mockResolvedValue({
            data: { status: 0 }
        });
    
        const res = await supertest(app).get(`/products/${testProductAId}`);
    
        expect(res.status).toStrictEqual(200);
        expect(res.body).toHaveProperty("product");

        const product: Product = res.body.product;
        const recommendations: Product[] = res.body.recommendations;

        expect(product._id).toStrictEqual(testProductAId);
        expect(product.image).toStrictEqual(null);
        
        checkProduct(product, testProductA);
        checkRecommendations(recommendations);
        expect(recommendations.length).toBe(DEFAULT_RECOMMENDATIONS_LIMIT);
        expect(recommendations[0].image).toStrictEqual(null);
    });

    // Input: Valid product_id found in the database with images
    // Expected status code: 200
    // Expected behavior: None
    // Expected output: Product details with recommendations with images
    test("Valid Product ID Found in DB with Recommendations With Images", async () => {

        jest.spyOn(axios, "get").mockImplementationOnce(() =>
            Promise.resolve({
                data: testProductImageA
            })
        ).mockImplementationOnce(() =>
            Promise.resolve({
                data: testRecommendationImageA
            })
        );

        const res = await supertest(app).get(`/products/${testProductAId}`);
    
        expect(res.status).toStrictEqual(200);
        expect(res.body).toHaveProperty("product");
        expect(res.body).toHaveProperty("recommendations");

        const product: Product = res.body.product;
        const recommendations: Product[] = res.body.recommendations;

        expect(product._id).toStrictEqual(testProductAId);
        expect(product.image).toStrictEqual(Buffer.from(testProductImageA).toString("base64"));
        
        checkProduct(product, testProductA);
        checkRecommendations(recommendations);
        expect(recommendations.length).toBe(DEFAULT_RECOMMENDATIONS_LIMIT);
        expect(recommendations[0].image).toStrictEqual(Buffer.from(testRecommendationImageA).toString("base64"));
        expect(axios.get).toHaveBeenCalledTimes(2);
        expect(axios.get).toHaveBeenNthCalledWith(1,
            expect.stringContaining(OPENFOODFACTS_IMAGE_API_URL),
            { responseType: "arraybuffer" }
        );
        expect(axios.get).toHaveBeenNthCalledWith(2,
            expect.stringContaining(OPENFOODFACTS_IMAGE_API_URL),
            { responseType: "arraybuffer" }
        );
    });

    // Input: Valid product_id found in the database with product image and no recommendation image
    // Expected status code: 200
    // Expected behavior: None
    // Expected output: Product details with image and recommendations without images
    test("Valid Product ID Found in DB with Product Image and No Recommendation Image", async () => {

        jest.spyOn(axios, "get").mockImplementationOnce(() =>
            Promise.resolve({
                data: testProductImageA
            })
        ).mockImplementationOnce(() =>
            Promise.resolve({
                data: { status: 0 }
            })
        );

        const res = await supertest(app).get(`/products/${testProductAId}`);
    
        expect(res.status).toStrictEqual(200);
        expect(res.body).toHaveProperty("product");
        expect(res.body).toHaveProperty("recommendations");

        const product: Product = res.body.product;
        const recommendations: Product[] = res.body.recommendations;

        expect(product._id).toStrictEqual(testProductAId);
        expect(product.image).toStrictEqual(Buffer.from(testProductImageA).toString("base64"));
        
        checkProduct(product, testProductA);
        checkRecommendations(recommendations);
        expect(recommendations.length).toBe(DEFAULT_RECOMMENDATIONS_LIMIT);
        expect(recommendations[0].image).toStrictEqual(null);
        expect(axios.get).toHaveBeenCalledTimes(2);
        expect(axios.get).toHaveBeenNthCalledWith(1,
            expect.stringContaining(OPENFOODFACTS_IMAGE_API_URL),
            { responseType: "arraybuffer" }
        );
        expect(axios.get).toHaveBeenNthCalledWith(2,
            expect.stringContaining(OPENFOODFACTS_IMAGE_API_URL),
            { responseType: "arraybuffer" }
        );
    });

    // Input: Valid product_id found in the database with no product image and recommendation image
    // Expected status code: 200
    // Expected behavior: None
    // Expected output: Product details with no image and recommendations with image
    test("Valid Product ID Found in DB with no Product Image and Recommendation Image", async () => {

        jest.spyOn(axios, "get").mockImplementationOnce(() =>
            Promise.resolve({
                data: { status: 0 }
            })
        ).mockImplementationOnce(() =>
            Promise.resolve({
                data: testRecommendationImageA
            })
        );

        const res = await supertest(app).get(`/products/${testProductAId}`);
    
        expect(res.status).toStrictEqual(200);
        expect(res.body).toHaveProperty("product");
        expect(res.body).toHaveProperty("recommendations");

        const product: Product = res.body.product;
        const recommendations: Product[] = res.body.recommendations;

        expect(product._id).toStrictEqual(testProductAId);
        expect(product.image).toStrictEqual(null);
        
        checkProduct(product, testProductA);
        checkRecommendations(recommendations);
        expect(recommendations.length).toBe(DEFAULT_RECOMMENDATIONS_LIMIT);
        expect(recommendations[0].image).toStrictEqual(Buffer.from(testRecommendationImageA).toString("base64"));
        expect(axios.get).toHaveBeenCalledTimes(2);
        expect(axios.get).toHaveBeenNthCalledWith(1,
            expect.stringContaining(OPENFOODFACTS_IMAGE_API_URL),
            { responseType: "arraybuffer" }
        );
        expect(axios.get).toHaveBeenNthCalledWith(2,
            expect.stringContaining(OPENFOODFACTS_IMAGE_API_URL),
            { responseType: "arraybuffer" }
        );
    });

    // Input: Valid product_id not found in database but found in OpenFoodFacts without images
    // Expected status code: 200
    // Expected behavior: Fetched product is inserted to the products database
    // Expected output: Product details with recommendations without images
    test("Valid Product ID Not Found in DB but Found in OpenFoodFacts Without Images", async () => {

        jest.spyOn(axios, "get").mockImplementation((url) => {
            if (url.includes(OPENFOODFACTS_IMAGE_API_URL)) {
                return Promise.resolve({
                    data: { status: 0 }
                });
            }
        
            if (url.includes(OPENFOODFACTS_API_URL)) {
                return Promise.resolve({
                    data: { status: 1, product: testProductA }
                });
            }
        
            return Promise.reject(new Error("Unknown URL"));
        });

        jest.spyOn(productsCollection, "findOne").mockImplementationOnce(() =>
            Promise.resolve(null)
        );

        jest.spyOn(productsCollection, "insertOne").mockImplementationOnce(() =>
            Promise.resolve({
                acknowledged: true,
                insertedId: testProductAId
            })
        );

        const res = await supertest(app).get(`/products/${testProductAId}`);
    
        expect(res.status).toStrictEqual(200);
        expect(res.body).toHaveProperty("product");
        expect(res.body).toHaveProperty("recommendations");
        
        const product: Product = res.body.product;
        const recommendations: Product[] = res.body.recommendations;

        expect(product._id).toStrictEqual(testProductAId);
        expect(product.image).toStrictEqual(null);
        
        checkProduct(product, testProductA);
        checkRecommendations(recommendations);
        expect(recommendations.length).toBe(DEFAULT_RECOMMENDATIONS_LIMIT);
        expect(recommendations[0].image).toStrictEqual(null);
        expect(productsCollection.findOne).toHaveBeenCalledWith(expect.objectContaining({ _id: testProductAId }));
        expect(productsCollection.insertOne).toHaveBeenCalledWith(testProductA);
    });

    // Input: Valid product_id not found in database and not found in OpenFoodFacts
    // Expected status code: 404
    // Expected behavior: None
    // Expected output: Error message
    test("Valid Product ID Not Found in DB and Not Found in OpenFoodFacts", async () => {

        jest.spyOn(axios, "get").mockImplementation((url) => {
            if (url.includes(OPENFOODFACTS_IMAGE_API_URL)) {
                return Promise.resolve({
                    data: { status: 0 }
                });
            }
        
            if (url.includes(OPENFOODFACTS_API_URL)) {
                return Promise.resolve({
                    data: { status: 0 }
                });
            }
        
            return Promise.reject(new Error("Unknown URL"));
        });

        jest.spyOn(productsCollection, "findOne").mockImplementationOnce(() =>
            Promise.resolve(null)
        );

        jest.spyOn(productsCollection, "insertOne").mockImplementationOnce(() =>
            Promise.resolve({
                acknowledged: true,
                insertedId: testProductAId
            })
        );

        const res = await supertest(app).get(`/products/${testProductAId}`);
    
        expect(res.status).toStrictEqual(404);
        expect(res.body).toHaveProperty("message");
        expect(res.body.message).toStrictEqual("Product not found or missing required fields.");
        expect(axios.get).toHaveBeenCalledTimes(1);
        expect(axios.get).toHaveBeenNthCalledWith(1,
            expect.stringContaining(`${OPENFOODFACTS_API_URL}api/v2/product/${testProductAId}.json`)
        );
        expect(productsCollection.findOne).toHaveBeenCalledWith(expect.objectContaining({ _id: testProductAId }));
        expect(productsCollection.insertOne).not.toHaveBeenCalled();
        
    });

    // Input: Valid product_id not found in database and found in OpenFoodFacts without all required fields
    // Expected status code: 404
    // Expected behavior: None
    // Expected output: Error message
    test("Valid Product ID Not Found in DB and Found in OpenFoodFacts Without All Required Fields", async () => {

        jest.spyOn(axios, "get").mockImplementation((url) => {
            if (url.includes(OPENFOODFACTS_IMAGE_API_URL)) {
                return Promise.resolve({
                    data: { status: 0 }
                });
            }
        
            if (url.includes(OPENFOODFACTS_API_URL)) {
                return Promise.resolve({
                    data: { status: 1, product: { ...testProductA, ecoscore_score: undefined } }
                });
            }
        
            return Promise.reject(new Error("Unknown URL"));
        });

        jest.spyOn(productsCollection, "findOne").mockImplementationOnce(() =>
            Promise.resolve(null)
        );

        jest.spyOn(productsCollection, "insertOne").mockImplementationOnce(() =>
            Promise.resolve({
                acknowledged: true,
                insertedId: testProductAId
            })
        );

        const res = await supertest(app).get(`/products/${testProductAId}`);
    
        expect(res.status).toStrictEqual(404);
        expect(res.body).toHaveProperty("message");
        expect(res.body.message).toStrictEqual("Product not found or missing required fields.");
        expect(axios.get).toHaveBeenCalledTimes(1);
        expect(axios.get).toHaveBeenNthCalledWith(1,
            expect.stringContaining(`${OPENFOODFACTS_API_URL}api/v2/product/${testProductAId}.json`)
        );
        expect(productsCollection.findOne).toHaveBeenCalledWith(expect.objectContaining({ _id: testProductAId }));
        expect(productsCollection.insertOne).not.toHaveBeenCalled();
    });

    // Input: Valid product_id found in the database
    // Expected status code: 200
    // Expected behavior: None
    // Expected output: Product details with multiple recommendations with images
    test("Valid Product ID Found in DB with Multiple Recommendations With Images", async () => {

        jest.spyOn(axios, "get").mockImplementationOnce(() =>
            Promise.resolve({
                data: testProductImageA
            })
        ).mockImplementationOnce(() =>
            Promise.resolve({
                data: testRecommendationImageA
            })
        ).mockImplementationOnce(() =>
            Promise.resolve({
                data: testRecommendationImageB
            })
        );

        const res = await supertest(app).get(`/products/${testProductAId}`).query({ "num_recommendations": 2 });
    
        expect(res.status).toStrictEqual(200);
        expect(res.body).toHaveProperty("product");
        expect(res.body).toHaveProperty("recommendations");

        const product: Product = res.body.product;
        const recommendations: Product[] = res.body.recommendations;

        expect(product._id).toStrictEqual(testProductAId);
        expect(product.image).toStrictEqual(Buffer.from(testProductImageA).toString("base64"));
        
        checkProduct(product, testProductA);
        checkRecommendations(recommendations);
        expect(recommendations.length).toBe(2);
        expect(recommendations[0].image).toStrictEqual(Buffer.from(testRecommendationImageA).toString("base64"));
        expect(recommendations[1].image).toStrictEqual(Buffer.from(testRecommendationImageB).toString("base64"));
        expect(axios.get).toHaveBeenCalledTimes(3);
        expect(axios.get).toHaveBeenNthCalledWith(1,
            expect.stringContaining(OPENFOODFACTS_IMAGE_API_URL),
            { responseType: "arraybuffer" }
        );
        expect(axios.get).toHaveBeenNthCalledWith(2,
            expect.stringContaining(OPENFOODFACTS_IMAGE_API_URL),
            { responseType: "arraybuffer" }
        );
        expect(axios.get).toHaveBeenNthCalledWith(3,
            expect.stringContaining(OPENFOODFACTS_IMAGE_API_URL),
            { responseType: "arraybuffer" }
        );
    });

    // Input: Valid product_id found in the database with language filters for recommendations
    // Expected status code: 200
    // Expected behavior: None
    // Expected output: Product details with german language recommendations
    test("Valid Product ID Found in DB with Language Filters for Recommendations", async () => {

        jest.spyOn(axios, "get").mockImplementationOnce(() =>
            Promise.resolve({
                data: testProductImageA
            })
        ).mockImplementationOnce(() =>
            Promise.resolve({
                data: testRecommendationImageA
            })
        );

        const res = await supertest(app).get(`/products/${testProductAId}`).query({ num_recommendations: 1, include_languages: "de" });
    
        expect(res.status).toStrictEqual(200);
        expect(res.body).toHaveProperty("product");
        expect(res.body).toHaveProperty("recommendations");

        const product: Product = res.body.product;
        const recommendations: Product[] = res.body.recommendations;

        expect(product._id).toStrictEqual(testProductAId);
        expect(product.image).toStrictEqual(Buffer.from(testProductImageA).toString("base64"));
        
        checkProduct(product, testProductA);
        checkRecommendations(recommendations);
        expect(recommendations.length).toBe(1);
        expect(recommendations[0].image).toStrictEqual(Buffer.from(testRecommendationImageA).toString("base64"));

        expect(await productsCollection.findOne({ _id: recommendations[0]._id })).toHaveProperty("lang", "de");

        expect(axios.get).toHaveBeenCalledTimes(2);
        expect(axios.get).toHaveBeenNthCalledWith(1,
            expect.stringContaining(OPENFOODFACTS_IMAGE_API_URL),
            { responseType: "arraybuffer" }
        );
        expect(axios.get).toHaveBeenNthCalledWith(2,
            expect.stringContaining(OPENFOODFACTS_IMAGE_API_URL),
            { responseType: "arraybuffer" }
        );
    });

    // Input: Valid product_id found in the database with countries filters for recommendations
    // Expected status code: 200
    // Expected behavior: None
    // Expected output: Product details with belgian country recommendations
    test("Valid Product ID Found in DB with Countries Filters for Recommendations", async () => {

        jest.spyOn(axios, "get").mockImplementationOnce(() =>
            Promise.resolve({
                data: testProductImageA
            })
        ).mockImplementationOnce(() =>
            Promise.resolve({
                data: testRecommendationImageA
            })
        );

        const res = await supertest(app).get(`/products/${testProductAId}`).query({ num_recommendations: 1, include_countries: "en:spain" });
    
        expect(res.status).toStrictEqual(200);
        expect(res.body).toHaveProperty("product");
        expect(res.body).toHaveProperty("recommendations");

        const product: Product = res.body.product;
        const recommendations: Product[] = res.body.recommendations;

        expect(product._id).toStrictEqual(testProductAId);
        expect(product.image).toStrictEqual(Buffer.from(testProductImageA).toString("base64"));
        
        checkProduct(product, testProductA);
        checkRecommendations(recommendations);
        expect(recommendations.length).toBe(1);
        expect(recommendations[0].image).toStrictEqual(Buffer.from(testRecommendationImageA).toString("base64"));

        const recommendationProduct = await productsCollection.findOne({ _id: recommendations[0]._id });
        expect(recommendationProduct).toBeTruthy();
        expect(recommendationProduct?.countries_tags).toContain("en:spain");

        expect(axios.get).toHaveBeenCalledTimes(2);
        expect(axios.get).toHaveBeenNthCalledWith(1,
            expect.stringContaining(OPENFOODFACTS_IMAGE_API_URL),
            { responseType: "arraybuffer" }
        );
        expect(axios.get).toHaveBeenNthCalledWith(2,
            expect.stringContaining(OPENFOODFACTS_IMAGE_API_URL),
            { responseType: "arraybuffer" }
        );
    });

    // Input: Valid product_id found in the database with languauge and countries filters for recommendations
    // Expected status code: 200
    // Expected behavior: None
    // Expected output: Product details with united kingdom country and english language recommendations
    test("Valid Product ID Found in DB with Countries and Languages Filters for Recommendations", async () => {

        jest.spyOn(axios, "get").mockImplementationOnce(() =>
            Promise.resolve({
                data: testProductImageB
            })
        ).mockImplementationOnce(() =>
            Promise.resolve({
                data: testRecommendationImageA
            })
        );

        const res = await supertest(app).get(`/products/${testProductBId}`).query({ num_recommendations: 1, include_countries: "en:france", include_languages: "en" });
    
        expect(res.status).toStrictEqual(200);
        expect(res.body).toHaveProperty("product");
        expect(res.body).toHaveProperty("recommendations");

        const product: Product = res.body.product;
        const recommendations: Product[] = res.body.recommendations;

        expect(product._id).toStrictEqual(testProductBId);
        expect(product.image).toStrictEqual(Buffer.from(testProductImageB).toString("base64"));
        
        checkProduct(product, testProductB);
        checkRecommendations(recommendations);
        expect(recommendations.length).toBe(1);
        expect(recommendations[0].image).toStrictEqual(Buffer.from(testRecommendationImageA).toString("base64"));

        const recommendationProduct = await productsCollection.findOne({ _id: recommendations[0]._id });
        expect(recommendationProduct).toBeTruthy();
        expect(recommendationProduct?.countries_tags).toContain("en:france");
        expect(recommendationProduct?.lang).toBe("en");

        expect(axios.get).toHaveBeenCalledTimes(2);
        expect(axios.get).toHaveBeenNthCalledWith(1,
            expect.stringContaining(OPENFOODFACTS_IMAGE_API_URL),
            { responseType: "arraybuffer" }
        );
        expect(axios.get).toHaveBeenNthCalledWith(2,
            expect.stringContaining(OPENFOODFACTS_IMAGE_API_URL),
            { responseType: "arraybuffer" }
        );
    });

    // Input: Valid product_id found in the database with language filters to get no recommendations
    // Expected status code: 200
    // Expected behavior: None
    // Expected output: Product details with no recommendations
    test("Valid Product ID Found in DB with Languages Filters to Get No Recommendations", async () => {

        jest.spyOn(axios, "get").mockImplementationOnce(() =>
            Promise.resolve({
                data: testProductImageA
            })
        ).mockImplementationOnce(() =>
            Promise.resolve({
                data: testRecommendationImageA
            })
        );

        const res = await supertest(app).get(`/products/${testProductAId}`).query({ "num_recommendations": 1, "include_languages": "not-a-real-language" });
    
        expect(res.status).toStrictEqual(200);
        expect(res.body).toHaveProperty("product");
        expect(res.body).toHaveProperty("recommendations");

        const product: Product = res.body.product;
        const recommendations: Product[] = res.body.recommendations;

        expect(product._id).toStrictEqual(testProductAId);
        expect(product.image).toStrictEqual(Buffer.from(testProductImageA).toString("base64"));
        
        checkProduct(product, testProductA);
        checkRecommendations(recommendations);
        expect(recommendations.length).toBe(0);

        expect(axios.get).toHaveBeenCalledTimes(1);
        expect(axios.get).toHaveBeenNthCalledWith(1,
            expect.stringContaining(OPENFOODFACTS_IMAGE_API_URL),
            { responseType: "arraybuffer" }
        );
       
    });

    // Input: Products database findOne error
    // Expected status code: 500
    // Expected behavior: None
    // Expected output: Error message
    test("Products Database FindOne Error", async () => {

        jest.spyOn(productsCollection, "findOne").mockImplementationOnce(() =>
            Promise.reject(new Error("Database error"))
        );

        const res = await supertest(app).get(`/products/${testProductAId}`).query({ "num_recommendations": 1, "include_languages": "not-a-real-language" });
    
        expect(res.status).toStrictEqual(500);
        expect(res.body).toHaveProperty("message");
        expect(res.body.message).toStrictEqual("Internal server error.");       
    });

    // Input: Products database insertOne error
    // Expected status code: 500
    // Expected behavior: None
    // Expected output: Error message
    test("Products Database InsertOne Error", async () => {

        jest.spyOn(axios, "get").mockImplementation((url) => {
            if (url.includes(OPENFOODFACTS_IMAGE_API_URL)) {
                return Promise.resolve({
                    data: { status: 0 }
                });
            }
        
            if (url.includes(OPENFOODFACTS_API_URL)) {
                return Promise.resolve({
                    data: { status: 1, product: { ...testProductA, ecoscore_score: undefined } }
                });
            }
        
            return Promise.reject(new Error("Unknown URL"));
        });

        jest.spyOn(productsCollection, "findOne").mockImplementationOnce(() =>
            Promise.resolve(null)
        );

        jest.spyOn(productsCollection, "insertOne").mockImplementationOnce(() =>
            Promise.reject(new Error("Database error"))
        );

        const res = await supertest(app).get(`/products/${testProductAId}`);
    
        expect(res.status).toStrictEqual(404);
        expect(res.body).toHaveProperty("message");
        expect(res.body.message).toStrictEqual("Product not found or missing required fields.");
        expect(axios.get).toHaveBeenCalledTimes(1);
        expect(axios.get).toHaveBeenNthCalledWith(1,
            expect.stringContaining(`${OPENFOODFACTS_API_URL}api/v2/product/${testProductAId}.json`)
        );
        expect(productsCollection.findOne).toHaveBeenCalledWith(expect.objectContaining({ _id: testProductAId }));
        expect(productsCollection.insertOne).not.toHaveBeenCalled();
    });
});

