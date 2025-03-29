import { body, query } from "express-validator";
import { UsersController } from "../controllers/UsersController";

const controller = new UsersController()

export const UsersRoutes = [
    {
        method: "post",
        route: "/users/history",
        action: controller.addToHistory.bind(controller),
        validation: [
            body("product_id").isString().withMessage("Product ID should be a string")
        ],
        protected: true 
    },
    {
        method: "get",
        route: "/users/history",
        action: controller.getHistory.bind(controller),
        validation: [],
        protected: true
    },
    {
        method: "delete",
        route: "/users/history",
        action: controller.deleteFromHistory.bind(controller),
        validation: [
            query("scan_uuid").isString().withMessage("Scan UUID should be a string")
        ],
        protected: true
    },
    {
        method: "post",
        route: "/users/fcm_registration_token",
        action: controller.setFCMRegistrationToken.bind(controller),
        validation: [
            body("fcm_registration_token").isString().withMessage("FCM Registration Token should be a string")
        ],
        protected: true
    },
    {
        method: "get",
        route: "/users/uuid",
        action: controller.getUserUUID.bind(controller),
        validation: [],
        protected: true
    },
    {
        method: "get",
        route: "/users/ecoscore_score",
        action: controller.getEcoscoreAverage.bind(controller),
        validation: [],
        protected: true
    }
]