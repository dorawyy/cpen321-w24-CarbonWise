import { Request, Response } from "express";
import { client } from "../services";
import { Collection, MongoClient } from "mongodb";
import axios from "axios";
import { Buffer } from "buffer";
import { Product, OpenFoodFactsProduct } from "../types";
import { hasRequiredProductFields } from "../utils";
import { RECOMMENDATIONS_UPPER_LIMIT, RECOMMENDATIONS_LOWER_LIMIT, OPENFOODFACTS_API_URL, OPENFOODFACTS_IMAGE_API_URL } from "../constants";

export class ProductsController {
    
    async getProductById(req: Request, res: Response) {
        try {
            const { product_id } = req.params;
            const queryParams = req.query;

            // Parse query parameters
            const requestedLanguages: string[] = queryParams.languages ? (queryParams.languages as string).split(",") : [];
            const includedCountries: string[] = queryParams.countries ? (queryParams.countries as string).split(",") : [];
            const RESULT_LIMIT = parseInt(queryParams.num_recommendations as string) || 1;  

            // Fetch product data
            const baseProduct = await fetchProductById(product_id);
            
            if (!baseProduct?.categories_hierarchy) {
                return res.status(404).json({ message: "Product not found or missing required fields." });
            }

            // Fetch product image
            const baseProductImage = await fetchProductImageById(product_id);
  

            if (!client || !(client instanceof MongoClient)) {
                throw new Error("Database connection error.");
            }
            const collection: Collection<Product> = client.db("products_db").collection<Product>("products");
            
            let remainingTags = [...baseProduct.categories_hierarchy];
            let matchingProducts: Product[] = [];

            // Find products with similar tags
            while (remainingTags.length > 0) {
                const tagsToUse = remainingTags.filter(tag =>
                    requestedLanguages.length === 0 || requestedLanguages.some(lang => tag.startsWith(`${lang}:`))
                );

                const query = {
                    _id: { $ne: product_id },
                    categories_tags: (includedCountries.length > 0) ? { $in: includedCountries } : { $all: tagsToUse },
                    ecoscore_score: { $exists: true },
                    ecoscore_grade: { $exists: true },
                    product_name: { $exists: true, $ne: "" }
                };


                matchingProducts = await collection
                    .find(query, {
                        projection: {
                            _id: 1, product_name: 1, ecoscore_grade: 1, ecoscore_score: 1, 
                            categories_tags: 1, categories_hierarchy: 1, countries_tags: 1
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
                    categories_tags_difference: calculateTagDifference(baseProduct.categories_tags || [], product.categories_tags || [])
                }))
                .sort((a, b) => a.categories_tags_difference - b.categories_tags_difference);  


            // Fetch products and their images
            const recommendationsWithImages = await Promise.all(
                matchingProducts.slice(0, RESULT_LIMIT).map(async (product) => {
                    if (!product?._id) {
                        return null
                    }
                    const productImage = await fetchProductImageById(product._id);
                    return { ...product, image: productImage || null };
                })
            );

            return res.status(200).json({
                product: { ...baseProduct, image: baseProductImage || null },
                recommendations: recommendationsWithImages
            });
        } catch (error) {
            return res.status(500).json({ message: "Internal server error" });
        }
    }
}


export async function fetchProductById(product_id: string): Promise<Product | null> {
    const collection: Collection<Product> = client.db("products_db").collection<Product>("products");

    // Try to fetch product from the database
    const product: Product | null = await collection.findOne({ _id: product_id });

    // Fetch product data from OpenFoodFacts API if not found in the database
    if (!product) {

        const apiUrl = `${OPENFOODFACTS_API_URL}api/v2/product/${product_id}.json`;

        try {

            const response: OpenFoodFactsProduct = await axios.get(apiUrl);

            if (response.data?.status === 1 && response.data.product) {
                
                const fetchedProduct: Product = response.data.product;

                if (!hasRequiredProductFields(fetchedProduct)) {
                    return null;
                }

                const updatedProduct: Product = {
                    _id: product_id,
                    ...fetchedProduct,
                };

                await collection.insertOne(updatedProduct);


                return fetchedProduct;

            } else {
                return null;
            }

        } catch (error) {
            return null;
        }
    }

    // Check if product has required fields
    if (!hasRequiredProductFields(product)) {
        return null;
    }

    return product;
}

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


export async function fetchEcoscoresByProductId(product_id: string): Promise<{ ecoscore_grade: string, ecoscore_score: number } | null> {

    // Try to fetch product from the database
    const product: Product | null = await fetchProductById(product_id);

    if (!product?.ecoscore_grade || !product.ecoscore_score) {
        return null;
    }

    return {
        ecoscore_grade: product.ecoscore_grade,
        ecoscore_score: product.ecoscore_score
    };

}

function calculateTagDifference(baseTags: string[], productTags: string[]): number {
    return new Set([...baseTags, ...productTags]).size - new Set(baseTags).size;
}