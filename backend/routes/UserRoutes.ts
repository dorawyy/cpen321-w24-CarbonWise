import { body, param } from "express-validator";
import { UserController } from "../controllers/UserController";

const controller = new UserController()

export const UserRoutes = [
    {
        method: "get",
        route: "/users",
        action: controller.getUsers,
        validation: []
    },
    {
        method: "post",
        route: "/users",
        action: controller.postUsers,
        validation: []
    },
    {
        method: "put",
        route: "/users/:id",
        action: controller.putUsers,
        validation: [
            param("id").isMongoId()
        ]
    },
    {
        method: "delete",
        route: "/users/:id",
        action: controller.deleteUsers,
        validation: [
            param("id").isMongoId()
        ]
    }
]