import { MongoClient } from 'mongodb';
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { OAuth2Client } from 'google-auth-library';

export const client: MongoClient = new MongoClient(process.env.DB_URI as string ?? "mongodb://localhost:27017");

let firebase_app: App;

export function getFirebaseApp() {
    if (!getApps()) {
        firebase_app = initializeApp();
    }
    return firebase_app;
}

export const oauthClient: OAuth2Client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);