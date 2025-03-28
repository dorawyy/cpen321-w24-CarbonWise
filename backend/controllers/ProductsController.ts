import { Request, Response } from "express";
import { productsCollection } from "../services";
import axios from "axios";
import { Buffer } from "buffer";
import { Product } from "../types";
import { RECOMMENDATIONS_UPPER_LIMIT, RECOMMENDATIONS_LOWER_LIMIT, OPENFOODFACTS_API_URL, OPENFOODFACTS_IMAGE_API_URL, DEFAULT_RECOMMENDATIONS_LIMIT } from "../constants";

export class ProductsController {
    
    // GET /products/:product_id
    async getProductById(req: Request, res: Response) {
        try {
            const { product_id } = req.params;
            const queryParams = req.query;

            // Parse query parameters
            const includedLanguages: string[] = queryParams.include_languages ? (queryParams.include_languages as string).split(",") : [];
            const includedCountries: string[] = queryParams.include_countries ? (queryParams.include_countries as string).split(",") : [];
            const recommendationsLimit = parseInt(queryParams.num_recommendations as string) || DEFAULT_RECOMMENDATIONS_LIMIT;  

            // Fetch product data
            const baseProduct = await fetchProductById(product_id);


            if (!baseProduct?.categories_hierarchy) {
                return res.status(404).json({ message: "Product not found or missing required fields." });
            }

            // Fetch product image
            const baseProductImage = await fetchProductImageById(product_id);
  
            let remainingTags = [...baseProduct.categories_hierarchy];
            let matchingProducts: Product[] = [];
            
            // Find products with similar tags
            while (remainingTags.length > 0) {
         
                const query = {
                    _id: { $ne: product_id },
                    ...(includedLanguages.length > 0 && { lang: { $in: includedLanguages } }),
                    ...(includedCountries.length > 0 && { countries_tags: { $in: includedCountries } }),
                    ecoscore_score: { $exists: true },
                    ecoscore_grade: { $exists: true },
                    product_name: { $exists: true, $ne: "" },
                    categories_tags: { $in: remainingTags }
                };

                matchingProducts = await productsCollection
                    .find(query, {
                        projection: {
                            _id: 1, product_name: 1, ecoscore_grade: 1, ecoscore_score: 1, categories_tags: 1
                        }
                    })
                    .limit(RECOMMENDATIONS_UPPER_LIMIT)
                    .toArray();

                if (matchingProducts.length >= RECOMMENDATIONS_LOWER_LIMIT) break;
                remainingTags.pop();

            }

            // Sort products by tag difference
            matchingProducts = matchingProducts
                .map(product => ({
                    ...product,
                    categories_tags_difference: calculateTagDifference(
                        baseProduct.categories_tags ?? [], 
                        product.categories_tags ?? []
                    )
                }))
                .sort((a, b) => a.categories_tags_difference - b.categories_tags_difference);  

            // Fetch products and their images
            const recommendationsWithImages = await Promise.all(
                matchingProducts
                    .slice(0, recommendationsLimit)
                    .map(async (product: Product) => {
                        const productImage = product._id ? await fetchProductImageById(product._id) : null;
                        return { ...product, image: productImage ?? null };
                    })
            );

            return res.status(200).json({
                product: { ...baseProduct, image: baseProductImage ?? null },
                recommendations: recommendationsWithImages
            });
        } catch (error) {
            return res.status(500).json({ message: "Internal server error." });
        }
    }
}

export async function fetchProductById(product_id: string): Promise<Product | null> {


    // Try to fetch product from the database with all required fields present
    let product: Product | null = await productsCollection.findOne(
        { 
            _id: product_id, 
            product_name: { $exists: true },
            categories_tags: { $exists: true },
            categories_hierarchy: { $exists: true },
            countries_tags: { $exists: true },
            lang: { $exists: true },
            ingredients_tags: { $exists: true },
            ecoscore_score: { $exists: true },
            ecoscore_grade: { $exists: true }
        }
    );

    // If product is found in DB and has all required fields, return it
    if (product) return product;

    // Fetch from OpenFoodFacts API if not found in DB
    const apiUrl = `${OPENFOODFACTS_API_URL}api/v2/product/${product_id}.json`;

    try {
        const response = await axios.get(apiUrl);

        if (response.data.status !== 1 || !response.data.product) throw new Error("Product not found in OpenFoodFacts");

        const fetchedProduct: Product = response.data.product;

        // Ensure fetched product has all required fields BEFORE inserting
        if (
            fetchedProduct.product_name &&
            fetchedProduct.categories_tags &&
            fetchedProduct.categories_hierarchy &&
            fetchedProduct.countries_tags &&
            fetchedProduct.lang &&
            fetchedProduct.ingredients_tags &&
            fetchedProduct.ecoscore_score &&
            fetchedProduct.ecoscore_grade
        ) {
            const updatedProduct: Product = { _id: product_id, ...fetchedProduct };
            await productsCollection.insertOne(updatedProduct);
            return updatedProduct;
        }
    } catch (error) {
        return null;
    }

    return null;
}

// Helper function to fetch images of products
export async function fetchProductImageById(product_id: string): Promise<string | null> {
    try {
        const imageKey =
            product_id.length === 13
                ? `data/${product_id.slice(0, 3)}/${product_id.slice(3, 6)}/${product_id.slice(6, 9)}/${product_id.slice(9)}/1.jpg`
                : `data/${product_id}/1.jpg`;

        const imageUrl = `${OPENFOODFACTS_IMAGE_API_URL}${imageKey}`;

        const imageResponse = await axios.get(imageUrl, { responseType: "arraybuffer" });
        return Buffer.from(imageResponse.data as string, "binary").toString("base64");
    } catch (error) {
        return null;
    }
}

// Helper function to fetch ecoscore of products
export async function fetchEcoscoresByProductId(product_id: string): Promise<{ ecoscore_score: number } | null> {

    // Try to fetch product from the database
    const product: Product | null = await fetchProductById(product_id);

    if (!product?.ecoscore_score) {
        return null;
    }
    
    const result = {
        ecoscore_score: product.ecoscore_score
    };


    return result;
}

// Helper function to calculate difference between product categories_tags
function calculateTagDifference(baseTags: string[], productTags: string[]): number {
    return new Set([...baseTags, ...productTags]).size - new Set(baseTags).size;
}