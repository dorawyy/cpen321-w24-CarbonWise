import { body, query } from "express-validator";
import { UsersController } from "../controllers/UsersController";

const controller = new UsersController()

export const UsersRoutes = [
    {
        method: "post",
        route: "/users/history",
        action: controller.addToHistory,
        validation: [
            body("product_id").isString().withMessage("Product ID should be a string")
        ],
        protected: true 
    },
    {
        method: "get",
        route: "/users/history",
        action: controller.getHistory,
        validation: [
            query("timestamp").optional().isISO8601().withMessage("Timestamp should be a valid ISO 8601 date string")
        ],
        protected: true
    },
    {
        method: "delete",
        route: "/users/history",
        action: controller.deleteFromHistory,
        validation: [
            query("scan_uuid").isString().withMessage("Scan UUID should be a string")
        ],
        protected: true
    },
    {
        method: "post",
        route: "/users/fcm_registration_token",
        action: controller.setFCMRegistrationToken,
        validation: [
            body("fcm_registration_token").isString().withMessage("FCM Registration Token should be a string")
        ],
        protected: true
    },
    {
        method: "get",
        route: "/users/uuid",
        action: controller.getUserUUID,
        validation: [],
        protected: true
    }
]