export interface User {
    _id: string;
    google_id: string;
    email: string;
    name: string;
    user_uuid: string;
    fcm_registration_token: string;
}

export interface History {
    user_uuid: string;
    ecoscore_score: number;
    products: { product_id: string, timestamp: Date, scan_uuid: string }[];
}

export interface HistoryEntry {
    product_id: string;
    timestamp: Date;
    scan_uuid: string;
}

export interface Friends {
    user_uuid: string;
    friends: { user_uuid: string, name: string }[];
    incoming_requests: { user_uuid: string, name: string }[];
}

export interface Product {
    _id?: string;
    product_name?: string;
    ecoscore_grade?: string;
    ecoscore_score?: number;
    ecoscore_data?: Record<string, unknown>;
    categories_tags?: string[];
    categories_hierarchy?: string[];
    countries_tags?: string[];
    lang?: string;
    [key: string]: unknown;
}

export interface OpenFoodFactsProduct {
    data?: {
        status?: number;
        product?: Product;
    }
}

export interface DetailedProduct extends Product {
    product: {
        _id?: string;
        product_name?: string;
        ecoscore_grade?: string;
        ecoscore_score?: number;
        ecoscore_data?: Record<string, unknown>;
        categories_tags?: string[];
        categories_hierarchy?: string[];
        countries_tags?: string[];
        lang?: string;
        image?: string;
    };
}

export interface DetailedHistoryEntry extends HistoryEntry {
    products: DetailedProduct[];
}


