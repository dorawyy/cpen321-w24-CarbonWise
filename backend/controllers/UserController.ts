import { NextFunction, Request, Response } from "express";
import { client } from "../services";
import { Filter, Document } from "mongodb";
import { fetchProductById, fetchProductImageById } from "./ProductController";
import { getMessaging, TokenMessage } from 'firebase-admin/messaging';
import { getFirebaseApp } from "../services";

interface User {
    _id: string;
    google_id: string;
    email: string;
    name: string;
    uuid: string;
    fcm_registration_token: string;
}

interface History {
    uuid: string;
    ecoscore_score: number;
    products: { product_id: string, timestamp: Date }[];
}

interface Friends {
    uuid: string;
    friends: { uuid: string, name: string }[];
    incoming_requests: { uuid: string, name: string }[];
}

export class UserController {
    async addToHistory(req: Request, res: Response, nextFunction: NextFunction) {
        const { product_ids } = req.body;
        const user = req.user as User;
        const user_uuid = user.uuid;

        const productCollection = client.db("products_db").collection("products");
        const historyCollection = client.db("users_db").collection<History>("history");

        const products = await productCollection.find({ _id: { $in: product_ids } }).toArray();
        const ecoscoreSum = products.reduce((sum, product) => sum + (product.ecoscore_score || 0), 0);
        const averageEcoscore = ecoscoreSum / products.length;

        const historyEntries = product_ids.map((product_id: string) => ({
            product_id: product_id,
            timestamp: new Date()
        }));

        await historyCollection.updateOne(
            { uuid: user_uuid },
            { 
                $set: { ecoscore_score: averageEcoscore }, 
                $push: { products: { $each: historyEntries } } 
            },
            { upsert: true }
        );

        res.status(200).send("History updated");
    }

    async sendFriendRequest(req: Request, res: Response, nextFunction: NextFunction) {
        const { target_uuid } = req.body;
        const user = req.user as User;
        const user_uuid = user.uuid;

        if (user_uuid === target_uuid) {
            return res.status(400).send("Cannot send friend request to yourself");
        }

        const friendsCollection = client.db("users_db").collection<Friends>("friends");

        const userFriends = await friendsCollection.findOne({ uuid: user_uuid });
        const targetFriends = await friendsCollection.findOne({ uuid: target_uuid });

        if (!userFriends?.friends?.some(friend => friend.uuid === target_uuid) && !targetFriends?.friends?.some(friend => friend.uuid === user_uuid)) {
            await friendsCollection.updateOne(
                { uuid: target_uuid },
                { $addToSet: { incoming_requests: { uuid: user_uuid, name: user.name } } },
                { upsert: true }
            );
            res.status(200).send("Friend request sent");
        } else {
            res.status(400).send("Already friends or request already sent");
        }
    }

    async acceptFriendRequest(req: Request, res: Response, nextFunction: NextFunction) {
        const { requester_uuid } = req.body;
        const user = req.user as User;
        const user_uuid = user.uuid;

        if (user_uuid === requester_uuid) {
            return res.status(400).send("Cannot accept friend request from yourself");
        }

        const friendsCollection = client.db("users_db").collection<Friends>("friends");

        const userFriends = await friendsCollection.findOne({ uuid: user_uuid });
        const requester = await client.db("users_db").collection<User>("users").findOne({ uuid: requester_uuid });

        if (userFriends?.incoming_requests?.some(request => request.uuid === requester_uuid)) {
            await friendsCollection.updateOne(
                { uuid: user_uuid },
                { $pull: { incoming_requests: { uuid: requester_uuid } }, $addToSet: { friends: { uuid: requester_uuid, name: requester?.name || "" } } }
            );

            // Ensure the other user has a friends document
            const requesterFriends = await friendsCollection.findOne({ uuid: requester_uuid });
            if (!requesterFriends) {
                await friendsCollection.insertOne({ uuid: requester_uuid, friends: [], incoming_requests: [] });
            }

            await friendsCollection.updateOne(
                { uuid: requester_uuid },
                { $addToSet: { friends: { uuid: user_uuid, name: user.name } } }
            );
            res.status(200).send("Friend request accepted");
        } else {
            res.status(400).send("No such friend request");
        }
    }

    async removeFriend(req: Request, res: Response, nextFunction: NextFunction) {
        const { friend_uuid } = req.body;
        const user = req.user as User;
        const user_uuid = user.uuid;

        if (user_uuid === friend_uuid) {
            return res.status(400).send("Cannot remove yourself as a friend");
        }
    
        const friendsCollection = client.db("users_db").collection<Friends>("friends");
    
        await friendsCollection.updateOne(
            { uuid: user_uuid },
            { $pull: { friends: { uuid: friend_uuid } } as Filter<Document> }
        );
    
        await friendsCollection.updateOne(
            { uuid: friend_uuid },
            { $pull: { friends: { uuid: user_uuid } } as Filter<Document> }
        );
    
        res.status(200).send("Friend removed");
    }

    async rejectFriendRequest(req: Request, res: Response, nextFunction: NextFunction) {
        const { requester_uuid } = req.body;
        const user = req.user as User;
        const user_uuid = user.uuid;

        if (user_uuid === requester_uuid) {
            return res.status(400).send("Cannot reject friend request from yourself");
        }

        const friendsCollection = client.db("users_db").collection<Friends>("friends");

        await friendsCollection.updateOne(
            { uuid: user_uuid },
            { $pull: { incoming_requests: { uuid: requester_uuid } } }
        );

        res.status(200).send("Friend request rejected");
    }

    async getFriendHistory(req: Request, res: Response, nextFunction: NextFunction) {
        const user = req.user as User;
        const user_uuid = user.uuid;
        const { timestamp } = req.query;
        const { fetch_product_details } = req.body;

        const friendsCollection = client.db("users_db").collection<Friends>("friends");
        const historyCollection = client.db("users_db").collection<History>("history");

        const userFriends = await friendsCollection.findOne({ uuid: user_uuid });

        if (userFriends?.friends) {
            const historyMap: Record<string, any[]> = {};
            for (const friend of userFriends.friends) {
                const query: any = { uuid: friend.uuid };
                if (timestamp) {
                    query["products.timestamp"] = { $gt: new Date(timestamp as string) };
                }
                const friendHistory = await historyCollection.find(query, { projection: { _id: 0 } }).toArray();

                const detailedHistory = await Promise.all(friendHistory.map(async (entry) => {
                    const detailedProducts = await Promise.all(entry.products.map(async (product) => {
                        if (fetch_product_details) {
                            const productDetails = await fetchProductById(product.product_id);
                            const productImage = await fetchProductImageById(product.product_id);
                            return {
                                ...product,
                                "product": {
                                    ...productDetails,
                                    image: productImage
                                }
                            };
                        } else {
                            return product;
                        }
                    }));
                    return {
                        ...entry,
                        products: detailedProducts
                    };
                }));

                historyMap[friend.uuid] = detailedHistory;
            }
            res.status(200).send(historyMap);
        } else {
            res.status(200).send({});
        }
    }

    async getHistory(req: Request, res: Response, nextFunction: NextFunction) {
        const user = req.user as User;
        const user_uuid = user.uuid;
        const { timestamp } = req.query;
        const { fetch_product_details } = req.body;

        const historyCollection = client.db("users_db").collection<History>("history");

        const query: any = { uuid: user_uuid };
        if (timestamp) {
            query["products.timestamp"] = { $gt: new Date(timestamp as string) };
        }

        const userHistory = await historyCollection.find(query).toArray();

        if (userHistory.length > 0) {
            const detailedHistory = await Promise.all(userHistory.map(async (entry) => {
                const detailedProducts = await Promise.all(entry.products.map(async (product) => {
                    if (fetch_product_details) {
                        const productDetails = await fetchProductById(product.product_id);
                        const productImage = await fetchProductImageById(product.product_id);
                        return {
                            ...product,
                            "product": {
                                ...productDetails,
                                image: productImage
                            }
                        };
                    } else {
                        return product;
                    }
                }));
                return {
                    ...entry,
                    products: detailedProducts
                };
            }));
            res.status(200).send(detailedHistory);
        } else {
            res.status(404).send("No history found for the user");
        }
    }

    async getFriendRequests(req: Request, res: Response, nextFunction: NextFunction) {
        const user = req.user as User;
        const user_uuid = user.uuid;

        const friendsCollection = client.db("users_db").collection<Friends>("friends");

        const userFriends = await friendsCollection.findOne({ uuid: user_uuid });

        if (userFriends?.incoming_requests) {
            res.status(200).send(userFriends.incoming_requests);
        } else {
            res.status(200).send([]);
        }
    }

    async getCurrentFriends(req: Request, res: Response, nextFunction: NextFunction) {
        const user = req.user as User;
        const user_uuid = user.uuid;

        const friendsCollection = client.db("users_db").collection<Friends>("friends");

        const userFriends = await friendsCollection.findOne({ uuid: user_uuid });

        if (userFriends?.friends) {
            res.status(200).send(userFriends.friends);
        } else {
            res.status(200).send([]);
        }
    }

    async getFriendHistoryByUUID(req: Request, res: Response, nextFunction: NextFunction) {
        const user = req.user as User;
        const user_uuid = user.uuid;
        const { friend_uuid } = req.params;
        const { timestamp } = req.query;
        const { fetch_product_details } = req.body;

        const friendsCollection = client.db("users_db").collection<Friends>("friends");
        const historyCollection = client.db("users_db").collection<History>("history");

        const userFriends = await friendsCollection.findOne({ uuid: user_uuid });
        const friendRelationship = userFriends?.friends?.find(friend => friend.uuid === friend_uuid);

        if (!friendRelationship) {
            return res.status(404).send("User does not exist or is not a friend");
        }

        const query: any = { uuid: friend_uuid };
        if (timestamp) {
            query["products.timestamp"] = { $gt: new Date(timestamp as string) };
        }
        const friendHistory = await historyCollection.find(query, { projection: { _id: 0 } }).toArray();

        const detailedHistory = await Promise.all(friendHistory.map(async (entry) => {
            const detailedProducts = await Promise.all(entry.products.map(async (product) => {
                if (fetch_product_details) {
                    const productDetails = await fetchProductById(product.product_id);
                    const productImage = await fetchProductImageById(product.product_id);
                    return {
                        ...product,
                        "product": {
                            ...productDetails,
                            image: productImage
                        }
                    };
                } else {
                    return product;
                }
            }));
            return {
                ...entry,
                products: detailedProducts
            };
        }));

        res.status(200).send(detailedHistory);
    }

    async setFCMRegistrationToken(req: Request, res: Response, nextFunction: NextFunction) {
        const { fcm_registration_token } = req.body;
        const user = req.user as User;
        const user_uuid = user.uuid;

        const userCollection = client.db("users_db").collection<User>("users");

        await userCollection.updateOne(
            { uuid: user_uuid },
            { $set: { fcm_registration_token: fcm_registration_token } }
        );

        res.status(200).send("FCM registration token updated");
    }

    async sendProductNotification(req: Request, res: Response, nextFunction: NextFunction) {
        const { target_uuid, product_id, message_type } = req.body;
        const user = req.user as User;
        const user_uuid = user.uuid;

        if (user_uuid === target_uuid) {
            return res.status(400).send("Cannot send notification to yourself");
        }

        // Ensure firebase app is initialized
        getFirebaseApp();

        const friendsCollection = client.db("users_db").collection<Friends>("friends");
        const userCollection = client.db("users_db").collection<User>("users");
        const historyCollection = client.db("users_db").collection<History>("history");

        const userFriends = await friendsCollection.findOne({ uuid: user_uuid });
        const friendRelationship = userFriends?.friends?.find(friend => friend.uuid === target_uuid);

        if (!friendRelationship) {
            return res.status(404).send("User does not exist or is not a friend");
        }

        const targetUser = await userCollection.findOne({ uuid: target_uuid });
        const userHistory = await historyCollection.findOne({ uuid: target_uuid, "products.product_id": product_id });

        if (!userHistory) {
            return res.status(404).send("Product not found in user's history");
        }

        const productDetails = await fetchProductById(product_id);
        const productName = productDetails?.name || "the product";

        let messageBody = "";
        if (message_type === "praise") {
            messageBody = `User ${user.name} has praised you for buying ${productName}`;
        } else if (message_type === "shame") {
            messageBody = `User ${user.name} has shamed you for buying ${productName}`;
        } else {
            return res.status(400).send("Invalid message type");
        }

        const message = {
            notification: {
                title: 'CarbonWise',
                body: messageBody
            },
            token: targetUser?.fcm_registration_token
        };

        getMessaging().send(message as TokenMessage)
            .then((response: string) => {
                res.status(200).send("Notification sent");
            })
            .catch((error: any) => {
                res.status(500).send("Error sending notification");
            });
    }
}