import { Request, Response } from "express";
import { productsCollection, historyCollection, usersCollection } from "../services";
import { fetchEcoscoresByProductId, fetchProductById, fetchProductImageById } from "./ProductsController";
import { User, Product, HistoryEntry } from "../types";
import { v4 as uuidv4 } from 'uuid';
import { HISTORY_ECOSCORE_AVERAGE_COUNT } from "../constants";


export class UsersController {
    
    // POST /users/history
    async addToHistory(req: Request, res: Response) {
        const { product_id } = req.body;
        const user = req.user as User;
        const user_uuid = user.user_uuid;

        // Check if product exists and has required fields
        const product: Product | null = await productsCollection.findOne({ _id: product_id });
        if (!product?.product_name || !product.ecoscore_grade || !product.ecoscore_score || !product.ecoscore_data || !product.categories_tags || !product.categories_hierarchy) {
            return res.status(404).send({message: "Product could not be added to user history."});
        }

        const historyEntry: HistoryEntry = {
            product_id,
            timestamp: new Date(),
            scan_uuid: uuidv4()
        };

        await historyCollection.updateOne(
            { user_uuid },
            { 
                $push: { products: historyEntry } 
            },
            { upsert: true }
        );

        await updateEcoscoreAverage(user_uuid);

        res.status(200).json(historyEntry);
    }

    // GET /users/history
    async getHistory(req: Request, res: Response) {
        const user = req.user as User;
        const user_uuid = user.user_uuid;

        const userHistory = await getHistoryByUserUUID(user_uuid);

        // Fetch product details for each product in the history
        if (userHistory.length > 0) {
            const detailedHistory = await Promise.all(userHistory.map(async (entry) => {
                const detailedProducts = await Promise.all(entry.products.map(async (product) => {
                    const productDetails = await fetchProductById(product.product_id);
                    const productImage = await fetchProductImageById(product.product_id);
                    return {
                        ...product,
                        "product": {
                            ...productDetails,
                            image: productImage
                        }
                    };
                }));
                return {
                    ...entry,
                    products: detailedProducts
                };
            }));
            res.status(200).send(detailedHistory);
        } else {
            res.status(404).send({message: "No history found for the user."});
        }
    }

    // DELETE /users/history
    async deleteFromHistory(req: Request, res: Response) {
        const { scan_uuid } = req.query;
        const user = req.user as User;
        const user_uuid = user.user_uuid;

        const result = await historyCollection.updateOne(
            { user_uuid },
            { $pull: { products: { scan_uuid: scan_uuid as string } } }
        );

        if (result.modifiedCount > 0) {
            await updateEcoscoreAverage(user_uuid);
            res.status(200).send({message: "History entry deleted"});
        } else {
            res.status(404).send({message: "History entry not found."});
        }
    }

    // POST /users/fcm_registration_token
    async setFCMRegistrationToken(req: Request, res: Response) {
        const { fcm_registration_token } = req.body;
        const user = req.user as User;
        const user_uuid = user.user_uuid;

        await usersCollection.updateOne(
            { user_uuid },
            { $set: { fcm_registration_token } },
            { upsert: true }
        );
        
        res.status(200).send({message: "FCM registration token updated."});
    }

    // GET /users/uuid
    async getUserUUID(req: Request, res: Response) {
        const user = req.user as User;
        const user_uuid = user.user_uuid;

        const result = await usersCollection.findOne({ user_uuid });
        if (!result) {
            return res.status(404).send({message: "User not found."});
        }

        res.status(200).send({ user_uuid: result.user_uuid });
    }

    // GET /users/ecoscore_score
    async getEcoscoreAverage(req: Request, res: Response) {
        const user = req.user as User;
        const user_uuid = user.user_uuid;

        const userHistory = await historyCollection.findOne({ user_uuid });
        if (userHistory && userHistory.products.length > 0) {
            const recentProducts = userHistory.products
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, HISTORY_ECOSCORE_AVERAGE_COUNT);

            // Fetch ecoscores for each product
            const recentProductsWithEcoscores = await Promise.all(recentProducts.map(async (product) => {
                const ecoscoreData = await fetchEcoscoresByProductId(product.product_id);
                return {
                    ...product,
                    ecoscore_score: ecoscoreData?.ecoscore_score || 0
                };
            }));

            const totalEcoscore = recentProductsWithEcoscores.reduce((acc, product) => acc + product.ecoscore_score, 0);
            const productCount = recentProductsWithEcoscores.length;
            const averageEcoscore = totalEcoscore / productCount;

            res.status(200).send({ ecoscore_score: averageEcoscore });
        } else {
            res.status(404).send({message: "No history found for the user."});
        }
    }

}

// Helper function to fetch history entries for a user
export async function getHistoryByUserUUID(user_uuid: string) {

    const query: any = { user_uuid };

    return await historyCollection.find(query).toArray();
}

// Helper function to update the average ecoscore for a user
async function updateEcoscoreAverage(user_uuid: string) {

    const userHistory = await historyCollection.findOne({ user_uuid });
    if (userHistory && userHistory.products.length > 0) {
        const recentProducts = userHistory.products
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, HISTORY_ECOSCORE_AVERAGE_COUNT);

        // Fetch ecoscores for each product
        const recentProductsWithEcoscores = await Promise.all(recentProducts.map(async (product) => {
            const ecoscoreData = await fetchEcoscoresByProductId(product.product_id);
            return {
                ...product,
                ecoscore_score: ecoscoreData?.ecoscore_score || 0
            };
        }));

        const totalEcoscore = recentProductsWithEcoscores.reduce((acc, product) => acc + product.ecoscore_score, 0);
        const productCount = recentProductsWithEcoscores.length;
        const averageEcoscore = totalEcoscore / productCount;

        await historyCollection.updateOne(
            { user_uuid },
            { $set: { ecoscore_score: averageEcoscore } }
        );
    }
}