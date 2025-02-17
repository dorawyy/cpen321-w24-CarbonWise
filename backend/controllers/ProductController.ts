import { NextFunction, Request, Response } from "express";
import { client } from "../services";
import { Collection } from "mongodb";
import axios from "axios";
import { Buffer } from "buffer";

interface Product {
    _id: string;
    environmental_score_data?: {
        missing?: {
            labels?: number;
            origins?: number;
        };
    };
    environmental_score_grade?: string;
}

interface ProductResponse {
    data_success: boolean;
    data: Product | null;
    image: string | null;
    image_success: boolean;
    message: string;
}

export class ProductController {
    async getProductById(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const collection: Collection<Product> = client.db("products_db").collection<Product>("products");

            let product = await collection.findOne({ _id: id });

            if (!product || (product.environmental_score_data?.missing?.labels || product.environmental_score_data?.missing?.origins)) {
                const apiUrl = `https://world.openfoodfacts.org/api/v2/product/${id}.json`;
                try {
                    const response = await axios.get(apiUrl);
                    if (response.data?.status === 1 && response.data.product) {
                        const fetchedProduct = response.data.product;

                        if (product) {
                            await collection.updateOne({ _id: id }, { $set: fetchedProduct });
                        } else {
                            await collection.insertOne({ ...fetchedProduct, _id: id } as Product);
                        }

                        product = fetchedProduct;
                    } else {
                        const output: ProductResponse = {
                            data_success: false,
                            data: null,
                            image: null,
                            image_success: false,
                            message: "Product not found in OpenFoodFacts",
                        };
                        return res.status(404).json(output);
                    }
                } catch (error) {
                    const output: ProductResponse = {
                        data_success: false,
                        data: null,
                        image: null,
                        image_success: false,
                        message: "Error retrieving product from external API",
                    };
                    return res.status(500).json(output);
                }
            }

            if (product) {
                product.environmental_score_grade = product.environmental_score_grade || "unknown";
            }

            let productImageBase64: string | null = null;
            let imageSuccess = false;
            try {
                const imageKey =
                    id.length === 13
                        ? `data/${id.slice(0, 3)}/${id.slice(3, 6)}/${id.slice(6, 9)}/${id.slice(9)}/1.jpg`
                        : `data/${id}/1.jpg`;

                const imageUrl = `https://openfoodfacts-images.s3.eu-west-3.amazonaws.com/${imageKey}`;

                const imageResponse = await axios.get(imageUrl, { responseType: "arraybuffer" });
                productImageBase64 = Buffer.from(imageResponse.data, "binary").toString("base64");
                imageSuccess = true;
            } catch (error) {
                imageSuccess = false;
            }

            const output: ProductResponse = {
                data_success: true,
                data: product,
                image: productImageBase64,
                image_success: imageSuccess,
                message: "Product retrieved successfully",
            };
            return res.status(200).json(output);
        } catch (error) {
            const output: ProductResponse = {
                data_success: false,
                data: null,
                image: null,
                image_success: false,
                message: "Internal server error",
            };
            return res.status(500).json(output);
        }
    }
}
