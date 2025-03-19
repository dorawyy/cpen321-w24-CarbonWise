import { body, query, param } from "express-validator";
import { FriendsController } from "../controllers/FriendsController";

const controller = new FriendsController()

export const FriendsRoutes = [
    {
        method: "get",
        route: "/friends/history/:user_uuid",
        action: controller.getFriendHistoryByUUID.bind(controller),
        validation: [
            param("user_uuid").isString().withMessage("User UUID should be a string")
        ],
        protected: true
    },
    {
        method: "post",
        route: "/friends/requests",
        action: controller.sendFriendRequest.bind(controller),
        validation: [
            body("user_uuid").isString().withMessage("User UUID should be a string")
        ],
        protected: true
    },
    {
        method: "post",
        route: "/friends/requests/accept",
        action: controller.acceptFriendRequest.bind(controller),
        validation: [
            body("user_uuid").isString().withMessage("User UUID should be a string")
        ],
        protected: true
    },
    {
        method: "delete",
        route: "/friends",
        action: controller.removeFriend.bind(controller),
        validation: [
            query("user_uuid").isString().withMessage("User UUID should be a string")
        ],
        protected: true
    },
    {
        method: "delete",
        route: "/friends/requests",
        action: controller.rejectFriendRequest.bind(controller),
        validation: [
            query("user_uuid").isString().withMessage("User UUID should be a string")
        ],
        protected: true
    },
    {
        method: "get",
        route: "/friends/requests",
        action: controller.getFriendRequests.bind(controller),
        validation: [],
        protected: true
    },
    {
        method: "get",
        route: "/friends/requests/outgoing",
        action: controller.getOutgoingFriendRequests.bind(controller),
        validation: [],
        protected: true
    },
    {
        method: "get",
        route: "/friends",
        action: controller.getCurrentFriends.bind(controller),
        validation: [],
        protected: true
    },
    {
        method: "post",
        route: "/friends/notifications",
        action: controller.sendProductNotification.bind(controller),
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
        action: controller.getFriendEcoscore.bind(controller),
        validation: [
            param("user_uuid").isString().withMessage("User UUID should be a string")
        ],
        protected: true
    }
]