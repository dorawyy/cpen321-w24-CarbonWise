import { MongoClient } from 'mongodb';
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { OAuth2Client } from 'google-auth-library';

export const client: MongoClient = new MongoClient(process.env.DB_URI ?? "mongodb://localhost:27017");
export const userCollection = client.db("users_db").collection("users");

let firebase_app: App | undefined;

export function getFirebaseApp() {
    if (!getApps().length) {
        firebase_app = initializeApp();
    }
    return firebase_app;
}

export const oauthClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);