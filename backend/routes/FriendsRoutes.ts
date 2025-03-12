import { body, query, param } from "express-validator";
import { FriendsController } from "../controllers/FriendsController";

const controller = new FriendsController()

export const FriendsRoutes = [
    {
        method: "get",
        route: "/friends/history/:user_uuid",
        action: controller.getFriendHistoryByUUID,
        validation: [
            param("user_uuid").isString().withMessage("User UUID should be a string")
        ],
        protected: true
    },
    {
        method: "post",
        route: "/friends/requests",
        action: controller.sendFriendRequest,
        validation: [
            body("user_uuid").isString().withMessage("User UUID should be a string")
        ],
        protected: true
    },
    {
        method: "post",
        route: "/friends/requests/accept",
        action: controller.acceptFriendRequest,
        validation: [
            body("user_uuid").isString().withMessage("User UUID should be a string")
        ],
        protected: true
    },
    {
        method: "delete",
        route: "/friends",
        action: controller.removeFriend,
        validation: [
            query("user_uuid").isString().withMessage("User UUID should be a string")
        ],
        protected: true
    },
    {
        method: "delete",
        route: "/friends/requests",
        action: controller.rejectFriendRequest,
        validation: [
            query("user_uuid").isString().withMessage("User UUID should be a string")
        ],
        protected: true
    },
    {
        method: "get",
        route: "/friends/requests",
        action: controller.getFriendRequests,
        validation: [],
        protected: true
    },
    {
        method: "get",
        route: "/friends/requests/outgoing",
        action: controller.getOutgoingFriendRequests,
        validation: [],
        protected: true
    },
    {
        method: "get",
        route: "/friends",
        action: controller.getCurrentFriends,
        validation: [],
        protected: true
    },
    {
        method: "post",
        route: "/friends/notifications",
        action: controller.sendProductNotification,
        validation: [
            body("user_uuid").isString().withMessage("User UUID should be a string"),
            body("scan_uuid").isString().withMessage("Scan UUID should be a string"),
            body("message_type").isIn(["praise", "shame"]).withMessage("Message type should be either 'praise' or 'shame'")
        ],
        protected: true
    },
    {
        method: "get",
        route: "/friends/ecoscore_score/:user_uuid",
        action: controller.getFriendEcoscore,
        validation: [
            param("user_uuid").isString().withMessage("User UUID should be a string")
        ],
        protected: true
    }
]