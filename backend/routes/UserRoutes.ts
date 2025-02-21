import { body, param } from "express-validator";
import { UserController } from "../controllers/UserController";
import { authenticateJWT } from "../auth";

const controller = new UserController()

export const UserRoutes = [
    {
        method: "get",
        route: "/users",
        action: controller.getUsers,
        validation: [],
        protected: true // Requires authentication
    },
    {
        method: "post",
        route: "/users",
        action: controller.postUsers,
        validation: [],
        protected: true
    },
    {
        method: "put",
        route: "/users/:id",
        action: controller.putUsers,
        validation: [
            param("id").isMongoId()
        ],
        protected: true
    },
    {
        method: "delete",
        route: "/users/:id",
        action: controller.deleteUsers,
        validation: [
            param("id").isMongoId()
        ],
        protected: true
    }
]