import { Collection, MongoClient, Db } from 'mongodb';
import { initializeApp, getApps } from 'firebase-admin/app';
import { OAuth2Client } from 'google-auth-library';
import { Product, User, Friends, History } from './types';

export const client: MongoClient = new MongoClient(process.env.DB_URI ?? "mongodb://localhost:27017");

export const productsDatabase: Db = client.db(process.env.PRODUCTS_DB_NAME)
export const productsCollection: Collection<Product> = productsDatabase.collection<Product>("products");

export const usersDatabase: Db = client.db(process.env.USERS_DB_NAME);
export const usersCollection: Collection<User> = usersDatabase.collection<User>("users");
export const friendsCollection: Collection<Friends> = usersDatabase.collection<Friends>("friends");
export const historyCollection: Collection<History> = usersDatabase.collection<History>("history");

export function getFirebaseApp() {
    if (getApps().length == 0) {
        initializeApp();
    }
}

export const oauthClient: OAuth2Client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);