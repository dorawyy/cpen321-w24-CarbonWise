import { NextFunction, Request, Response } from "express";
import { client } from "../services";
import { Collection } from "mongodb";
import axios from "axios";
import { Buffer } from "buffer";

interface Product {
    _id: string;
    product_name?: string;
    ecoscore_grade?: string;
    ecoscore_score?: number;
    ecoscore_data?: Record<string, any>;
    categories_tags?: string[];
    categories_hierarchy?: string[];
    countries_tags?: string[];
    lang?: string;
    [key: string]: any;
}

export async function fetchProductById(id: string): Promise<Product | null> {
    const collection: Collection<Product> = client.db("products_db").collection<Product>("products");

    let product = await collection.findOne({ _id: id });

    if (!product) {
        const apiUrl = `https://world.openfoodfacts.org/api/v2/product/${id}.json`;

        try {
            const response = await axios.get(apiUrl);
            if (response.data?.status === 1 && response.data.product) {
                const fetchedProduct = response.data.product;

                const updatedProduct: Product = {
                    _id: id,
                    ...fetchedProduct,
                };

                await collection.insertOne(updatedProduct);
                product = updatedProduct;
            } else {
                return null;
            }
        } catch (error) {
            return null;
        }
    }

    return {
        _id: product._id,
        product_name: product.product_name || undefined,
        ecoscore_grade: product.ecoscore_grade || undefined,
        ecoscore_score: product.ecoscore_score || undefined,
        ecoscore_data: product.ecoscore_data || undefined,
        categories_tags: product.categories_tags || undefined,
        categories_hierarchy: product.categories_hierarchy || undefined,
        countries_tags: product.countries_tags || undefined,
        lang: product.lang || undefined
    };
}

export async function fetchProductImageById(id: string): Promise<string | null> {
    try {
        const imageKey =
            id.length === 13
                ? `data/${id.slice(0, 3)}/${id.slice(3, 6)}/${id.slice(6, 9)}/${id.slice(9)}/1.jpg`
                : `data/${id}/1.jpg`;

        const imageUrl = `https://openfoodfacts-images.s3.eu-west-3.amazonaws.com/${imageKey}`;

        const imageResponse = await axios.get(imageUrl, { responseType: "arraybuffer" });
        return Buffer.from(imageResponse.data, "binary").toString("base64");
    } catch (error) {
        return null;
    }
}

export class ProductController {
    async getProductById(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;

            const product = await fetchProductById(id);
            if (!product) {
                return res.status(404).json({
                    product: null,
                    image: null,
                });
            }

            const image = await fetchProductImageById(id);

            return res.status(200).json({
                product: { ...product, image: image || null }
            });
        } catch (error) {
            return res.status(500).json({
                product: null,
                image: null,
            });
        }
    }
    
    async getRecommendationsByProductId(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const queryParams = req.query;

            const UPPER_LIMIT = 50;  
            const LOWER_LIMIT = 1;  
            const SIMILARITY_CUTOFF_PERCENTAGE = 0.3;  

            const requestedLanguages: string[] = queryParams.languages ? (queryParams.languages as string).split(",") : [];
            const includedCountries: string[] = queryParams.countries ? (queryParams.countries as string).split(",") : [];
            const excludedCountries: string[] = queryParams.exclude_countries ? (queryParams.exclude_countries as string).split(",") : [];
            const RESULT_LIMIT = parseInt(queryParams.recommendations as string) || 1;  

            const baseProduct = await fetchProductById(id);
            if (!baseProduct || !baseProduct.categories_hierarchy || !baseProduct.categories_tags) {
                return res.status(404).json({
                    original_product: null,
                    recommendations: [],
                    message: "Product not found or missing required fields.",
                });
            }

            const baseProductImage = await fetchProductImageById(id);

            const collection: Collection<Product> = client.db("products_db").collection<Product>("products");

            let remainingTags = [...baseProduct.categories_hierarchy];
            let matchingProducts: Product[] = [];

            while (remainingTags.length > 0) {
                const tagsToUse = remainingTags.filter(tag =>
                    requestedLanguages.length === 0 || requestedLanguages.some(lang => tag.startsWith(`${lang}:`))
                );

                let query: any = {
                    _id: { $ne: id },
                    categories_tags: { $all: tagsToUse },
                    ecoscore_score: { $exists: true },
                    ecoscore_grade: { $exists: true },
                    product_name: { $exists: true, $ne: "" }
                };

                if (includedCountries.length > 0 && excludedCountries.length > 0) {
                    query.countries_tags = { $in: includedCountries, $nin: excludedCountries };
                } else if (includedCountries.length > 0) {
                    query.countries_tags = { $in: includedCountries };
                } else if (excludedCountries.length > 0) {
                    query.countries_tags = { $nin: excludedCountries };
                }

                matchingProducts = await collection
                    .find(query, {
                        projection: {
                            _id: 1, product_name: 1, ecoscore_grade: 1, ecoscore_score: 1, 
                            categories_tags: 1, categories_hierarchy: 1, countries_tags: 1
                        }
                    })
                    .limit(UPPER_LIMIT)
                    .toArray();

                if (matchingProducts.length >= LOWER_LIMIT) break;
                remainingTags.pop();
            }

            function calculateTagDifference(baseTags: string[], productTags: string[]): number {
                return new Set([...baseTags, ...productTags]).size - new Set(baseTags).size;
            }

            matchingProducts = matchingProducts
                .map(product => ({
                    ...product,
                    categories_tags_difference: calculateTagDifference(baseProduct.categories_tags || [], product.categories_tags || [])
                }))
                .sort((a, b) => a.categories_tags_difference - b.categories_tags_difference);  

            const similarityCutoff = Math.ceil(matchingProducts.length * SIMILARITY_CUTOFF_PERCENTAGE);
            let refinedProducts = matchingProducts.slice(0, similarityCutoff)
                .sort((a, b) => (b.ecoscore_score || 0) - (a.ecoscore_score || 0));

            const recommendationsWithImages = await Promise.all(
                refinedProducts.slice(0, RESULT_LIMIT).map(async (product) => {
                    const productImage = await fetchProductImageById(product._id);
                    return { ...product, image: productImage || null };
                })
            );

            return res.status(200).json({
                original_product: { ...baseProduct, image: baseProductImage || null },
                recommendations: recommendationsWithImages
            });
        } catch (error) {
            return res.status(500).json({
                original_product: null,
                recommendations: [],
                message: "Internal server error",
            });
        }
    }
}
