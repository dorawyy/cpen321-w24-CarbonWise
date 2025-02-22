import { MongoClient } from 'mongodb';
import { initializeApp, getApps, App } from 'firebase-admin/app';

export const client = new MongoClient(process.env.DB_URI ?? "mongodb://localhost:27017");

let firebase_app: App | undefined;

export function getFirebaseApp() {
    if (!getApps().length) {
        firebase_app = initializeApp();
    }
    return firebase_app;
}
