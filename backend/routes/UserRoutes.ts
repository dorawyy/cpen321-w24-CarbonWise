import { body, query, param } from "express-validator";
import { UserController } from "../controllers/UserController";

const controller = new UserController()

export const UserRoutes = [
    {
        method: "post",
        route: "/users/history",
        action: controller.addToHistory,
        validation: [
            body("product_ids").isArray().withMessage("Product IDs should be an array")
        ],
        protected: true 
    },
    {
        method: "get",
        route: "/users/history",
        action: controller.getHistory,
        validation: [
            query("timestamp").optional().isISO8601().withMessage("Timestamp should be a valid ISO 8601 date string"),
            body("fetch_product_details").optional().default(true).isBoolean().withMessage("Fetch Product Details should be a boolean")
        ],
        protected: true
    },
    {
        method: "get",
        route: "/users/friends/history/:friend_uuid",
        action: controller.getFriendHistoryByUUID,
        validation: [
            param("friend_uuid").isString().withMessage("Friend UUID should be a string"),
            query("timestamp").optional().isISO8601().withMessage("Timestamp should be a valid ISO 8601 date string"),
            body("fetch_product_details").optional().default(true).isBoolean().withMessage("Fetch Product Details should be a boolean")
        ],
        protected: true
    },
    {
        method: "post",
        route: "/users/friends/requests",
        action: controller.sendFriendRequest,
        validation: [
            body("target_uuid").isString().withMessage("Target UUID should be a string")
        ],
        protected: true
    },
    {
        method: "post",
        route: "/users/friends/requests/accept",
        action: controller.acceptFriendRequest,
        validation: [
            body("requester_uuid").isString().withMessage("Requester UUID should be a string")
        ],
        protected: true
    },
    {
        method: "delete",
        route: "/users/friends",
        action: controller.removeFriend,
        validation: [
            body("friend_uuid").isString().withMessage("Friend UUID should be a string")
        ],
        protected: true
    },
    {
        method: "delete",
        route: "/users/friends/requests/reject",
        action: controller.rejectFriendRequest,
        validation: [
            body("requester_uuid").isString().withMessage("Requester UUID should be a string")
        ],
        protected: true
    },
    {
        method: "get",
        route: "/users/friends/history",
        action: controller.getFriendHistory,
        validation: [
            query("timestamp").optional().isISO8601().withMessage("Timestamp should be a valid ISO 8601 date string"),
            body("fetch_product_details").optional().default(true).isBoolean().withMessage("Fetch Product Details should be a boolean")
        ],
        protected: true
    },
    {
        method: "get",
        route: "/users/friends/requests",
        action: controller.getFriendRequests,
        validation: [],
        protected: true
    },
    {
        method: "get",
        route: "/users/friends",
        action: controller.getCurrentFriends,
        validation: [],
        protected: true
    },
    {
        method: "post",
        route: "/users/fcm-token",
        action: controller.setFCMRegistrationToken,
        validation: [
            body("fcm_registration_token").isString().withMessage("FCM Registration Token should be a string")
        ],
        protected: true
    },
    {
        method: "post",
        route: "/users/friends/notifications",
        action: controller.sendProductNotification,
        validation: [
            body("target_uuid").isString().withMessage("Target UUID should be a string"),
            body("product_id").isString().withMessage("Product ID should be a string"),
            body("message_type").isIn(["praise", "shame"]).withMessage("Message type should be either 'praise' or 'shame'")
        ],
        protected: true
    }
]