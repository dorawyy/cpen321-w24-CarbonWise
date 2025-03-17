import { MongoClient } from 'mongodb';
import { initializeApp, getApps } from 'firebase-admin/app';
import { OAuth2Client } from 'google-auth-library';

export const client: MongoClient = new MongoClient(process.env.DB_URI ?? "mongodb://localhost:27017");

export function getFirebaseApp() {
    if (getApps().length == 0) {
        initializeApp();
    }
}

export const oauthClient: OAuth2Client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);