import { Collection, MongoClient } from 'mongodb';
import { initializeApp, getApps } from 'firebase-admin/app';
import { OAuth2Client } from 'google-auth-library';
import { Product, User, Friends, History } from './types';

export const client: MongoClient = new MongoClient(process.env.DB_URI ?? "mongodb://localhost:27017");
export const productsCollection: Collection<Product> = client.db(process.env.PRODUCTS_DB_NAME).collection<Product>("products");
export const usersCollection: Collection<User> = client.db(process.env.USERS_DB_NAME).collection<User>("users");
export const friendsCollection: Collection<Friends> = client.db(process.env.USERS_DB_NAME).collection<Friends>("friends");
export const historyCollection: Collection<History> = client.db(process.env.USERS_DB_NAME).collection<History>("history");

export function getFirebaseApp() {
    if (getApps().length == 0) {
        initializeApp();
    }
}

export const oauthClient: OAuth2Client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);