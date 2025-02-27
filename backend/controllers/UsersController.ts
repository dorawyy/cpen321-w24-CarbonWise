import { NextFunction, Request, Response } from "express";
import { client } from "../services";
import { fetchProductById, fetchProductImageById } from "./ProductsController";
import { User, History } from "../types";
import { v4 as uuidv4 } from 'uuid';

export class UsersController {
    async addToHistory(req: Request, res: Response, nextFunction: NextFunction) {
        const { product_id } = req.body;
        const user = req.user as User;
        const user_uuid = user.user_uuid;

        const productCollection = client.db("products_db").collection("products");
        const historyCollection = client.db("users_db").collection<History>("history");

        const product = await productCollection.findOne({ _id: product_id });
        if (!product) {
            return res.status(404).send({message: "Product not found"});
        }

        const ecoscore = product.ecoscore_score || 0;

        const historyEntry = {
            product_id: product_id,
            timestamp: new Date(),
            scan_uuid: uuidv4()
        };

        await historyCollection.updateOne(
            { user_uuid: user_uuid },
            { 
                $set: { ecoscore_score: ecoscore }, 
                $push: { products: historyEntry } 
            },
            { upsert: true }
        );

        res.status(200).json(historyEntry);
    }

    async getHistory(req: Request, res: Response, nextFunction: NextFunction) {
        const user = req.user as User;
        const user_uuid = user.user_uuid;
        const { timestamp } = req.query;

        const userHistory = await getHistoryByUserUUID(user_uuid, timestamp as string);

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
            res.status(404).send({message: "No history found for the user"});
        }
    }

    async deleteFromHistory(req: Request, res: Response, nextFunction: NextFunction) {
        const { scan_uuid } = req.query;
        const user = req.user as User;
        const user_uuid = user.user_uuid;

        const historyCollection = client.db("users_db").collection<History>("history");

        const result = await historyCollection.updateOne(
            { user_uuid: user_uuid },
            { $pull: { products: { scan_uuid: scan_uuid as string } } }
        );

        console.log(result);

        if (result.modifiedCount > 0) {
            res.status(200).send({message: "History entry deleted"});
        } else {
            res.status(404).send({message: "History entry not found"});
        }
    }
    async setFCMRegistrationToken(req: Request, res: Response, nextFunction: NextFunction) {
        const { fcm_registration_token } = req.body;
        const user = req.user as User;
        const user_uuid = user.user_uuid;

        const userCollection = client.db("users_db").collection<User>("users");

        const result = await userCollection.updateOne(
            { user_uuid: user_uuid },
            { $set: { fcm_registration_token: fcm_registration_token } },
            { upsert: true }
        );
        
        if (result.matchedCount > 0 || result.upsertedCount > 0) {
            res.status(200).send({message: "FCM registration token updated"});
        } else {
            res.status(404).send({message: "User not found"});
        }
    }

    async getHistoryByScanUUID(req: Request, res: Response, nextFunction: NextFunction) {
        const { scan_uuid } = req.query;
        const user = req.user as User;
        const user_uuid = user.user_uuid;

        const historyCollection = client.db("users_db").collection<History>("history");

        const userHistory = await historyCollection.findOne(
            { user_uuid: user_uuid, "products.scan_uuid": scan_uuid }
        );

        if (userHistory) {
            const product = userHistory.products.find(p => p.scan_uuid === scan_uuid);
            if (product) {
                const productDetails = await fetchProductById(product.product_id);
                const productImage = await fetchProductImageById(product.product_id);
                const detailedProduct = {
                    ...product,
                    "product": {
                        ...productDetails,
                        image: productImage
                    }
                };
                res.status(200).send(detailedProduct);
            } else {
                res.status(404).send({message: "No product found with the given scan UUID"});
            }
        } else {
            res.status(404).send({message: "No history found for the user"});
        }
    }
}

export async function getHistoryByUserUUID(user_uuid: string, timestamp?: string) {
    const historyCollection = client.db("users_db").collection<History>("history");

    const query: any = { user_uuid: user_uuid };
    if (timestamp) {
        query["products.timestamp"] = { $gt: new Date(timestamp) };
    }

    return await historyCollection.find(query).toArray();
}