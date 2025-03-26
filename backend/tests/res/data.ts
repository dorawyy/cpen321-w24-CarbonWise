import { User, Product, History, Friends } from "../../types";

export const JEST_TIMEOUT_MS = 60000;

export const testUserA: User = {
    _id: "user-uuid-A",
    google_id: "google-id-A",
    email: "user.A@example.com",
    name: "User A",
    user_uuid: "user-uuid-A",
    fcm_registration_token: ""
}

export const testUserB: User = {
    _id: "user-uuid-B",
    google_id: "google-id-B",
    email: "user.B@example.com",
    name: "User B",
    user_uuid: "user-uuid-B",
    fcm_registration_token: "fcm-token-B"
}

export const testUserC: User = {
    _id: "user-uuid-C",
    google_id: "google-id-C",
    email: "user.C@example.com",
    name: "User C",
    user_uuid: "user-uuid-C",
    fcm_registration_token: ""
}

export const testUserD: User = {
    _id: "user-uuid-D",
    google_id: "google-id-D",
    email: "user.D@example.com",
    name: "User D",
    user_uuid: "user-uuid-D",
    fcm_registration_token: "fcm-token-D"
}

export const testUserE: User = {
    _id: "user-uuid-E",
    google_id: "google-id-E",
    email: "user.E@example.com",
    name: "User E",
    user_uuid: "user-uuid-E",
    fcm_registration_token: "fcm-token-E"
}

export const testFriendsA: Friends = {
    user_uuid: "user-uuid-A",
    friends: [],
    incoming_requests: []
}

export const testFriendsB: Friends = {
    user_uuid: "user-uuid-B",
    friends: [],
    incoming_requests: [{ user_uuid: "user-uuid-A", name: "User A" }]
}

export const testFriendsC: Friends = {
    user_uuid: "user-uuid-C",
    friends: [{ user_uuid: "user-uuid-D", name: "User D" }],
    incoming_requests: []
}

export const testFriendsD: Friends = {
    user_uuid: "user-uuid-D",
    friends: [{ user_uuid: "user-uuid-C", name: "User C" }],
    incoming_requests: []
}

export const testFriendsE: Friends = {
    user_uuid: "user-uuid-E",
    friends: [],
    incoming_requests: []
}


export const testProductAId = "3017620422003";
export const testProductA: Product = {
    _id: testProductAId,
    product_name: "Nutella",
    ecoscore_grade: "d",
    ecoscore_score: 30,
    ecoscore_data: {
        "compared_to_category": "en:cocoa-and-hazelnuts-spreads",
        "data_quality_errors_tags": [],
        "additives_n": 2,
        "product_name_it": "Nutella",
    },
    categories_tags: [
        "en:breakfasts",
        "en:spreads",
        "en:sweet-spreads",
        "fr:pates-a-tartiner",
        "en:hazelnut-spreads",
        "en:chocolate-spreads",
        "en:cocoa-and-hazelnuts-spreads"
    ],
    categories_hierarchy: [
        "en:breakfasts",
        "en:spreads",
        "en:sweet-spreads",
        "fr:pates-a-tartiner",
        "en:hazelnut-spreads",
        "en:chocolate-spreads",
        "en:cocoa-and-hazelnuts-spreads"
    ],
    countries_tags: [
        "en:belgium",
        "en:france",
        "en:germany",
        "en:india",
        "en:italy",
        "en:luxembourg",
        "en:morocco",
        "en:netherlands",
        "en:philippines",
        "en:poland",
        "en:romania",
        "en:spain",
        "en:switzerland",
        "en:turkey",
        "en:united-kingdom",
        "en:united-states"
    ],
    lang: "fr",
    ingredients_tags: [
        "en:sugar",
        "en:added-sugar",
        "en:disaccharide",
        "en:palm-oil",
        "en:oil-and-fat",
        "en:vegetable-oil-and-fat",
        "en:palm-oil-and-fat",
        "en:hazelnut",
        "en:nut",
        "en:tree-nut",
        "en:fat-reduced-cocoa",
        "en:plant",
        "en:cocoa",
        "en:skimmed-milk-powder",
        "en:dairy",
        "en:milk-powder",
        "en:whey-powder",
        "en:whey",
        "en:emulsifier",
        "en:vanillin",
        "en:e322",
        "en:soya-lecithin",
        "en:e322i"
    ]
}

export const testProductBId = "6111242100992";
export const testProductB: Product = {
    _id: testProductBId,
    product_name: "Perly",
    ecoscore_grade: "b",
    ecoscore_score: 72,
    ecoscore_data: {
        "additives_n": 2,
    },
    categories_tags: [
        "en:dairies",
        "en:fermented-foods",
        "en:fermented-milk-products",
        "en:cheeses",
        "en:desserts",
        "en:dairy-desserts",
        "en:fermented-dairy-desserts",
        "en:yogurts",
        "en:cream-cheeses",
        "fr:fromages-frais-sucres"
    ],
    categories_hierarchy: [
        "en:dairies",
        "en:fermented-foods",
        "en:fermented-milk-products",
        "en:cheeses",
        "en:desserts",
        "en:dairy-desserts",
        "en:fermented-dairy-desserts",
        "en:yogurts",
        "en:cream-cheeses",
        "fr:Fromages-frais-sucres",
    ],
    countries_tags: [
        "en:morocco",
        "en:united-states"
    ],
    lang: "fr",
    ingredients_tags: [
        "en:skimmed-milk",
        "en:dairy",
        "en:milk",
        "en:cream",
        "en:sugar",
        "en:added-sugar",
        "en:disaccharide",
        "fr:ferments-laciques-matiere-grasse",
        "fr:3-poids-net"
    ]
}

export const testProductImageA = "test_product_image_A";
export const testProductImageB = "test_product_image_B";
export const testProductImageE = "test_product_image_E";
export const testRecommendationImageA = "test_recommendation_image_A";
export const testRecommendationImageB = "test_recommendation_image_B";

export const testHistoryA: History = {
    user_uuid: "user-uuid-A",
    ecoscore_score: 30,
    products: [
        {
            product_id: testProductAId,
            timestamp: new Date("2025-01-01"),
            scan_uuid: "scan-uuid-A"
        }
    ]
}

export const testHistoryB: History = {
    user_uuid: "user-uuid-B",
    ecoscore_score: 0,
    products: []
}

export const testHistoryC: History = {
    user_uuid: "user-uuid-C",
    ecoscore_score: 51,
    products: [
        {
            product_id: testProductAId,
            timestamp: new Date("2025-01-01"),
            scan_uuid: "scan-uuid-A"
        },
        {
            product_id: testProductBId,
            timestamp: new Date("2025-01-02"),
            scan_uuid: "scan-uuid-B"
        }
    ]
}

export const testHistoryD: History = {
    user_uuid: "user-uuid-D",
    ecoscore_score: 0,
    products: [
        {
            product_id: "fake-product-id",
            timestamp: new Date("2025-01-01"),
            scan_uuid: "scan-uuid-fake"
        }
    ]
}

export const testHistoryE: History = {
    user_uuid: "user-uuid-E",
    ecoscore_score: 0,
    products: [
        {
            product_id: "07317149",
            timestamp: new Date("2025-01-01"),
            scan_uuid: "scan-uuid-A"
        }
    ]
}