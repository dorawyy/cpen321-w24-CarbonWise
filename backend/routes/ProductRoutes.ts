import { body, param } from "express-validator";
import { ProductController } from "../controllers/ProductController";

const controller = new ProductController()

export const ProductRoutes = [
    {
        method: "get",
        route: "/products",
        action: controller.getProducts,
        validation: []
    },
    {
        method: "post",
        route: "/products",
        action: controller.postProducts,
        validation: [
            body("task").isString(),
            body("urgent").isBoolean().optional()
        ]
    },
    {
        method: "put",
        route: "/products/:id",
        action: controller.putProducts,
        validation: [
            param("id").isMongoId(),
            body("task").isString(),
            body("urgent").isBoolean().optional()
        ]
    },
    {
        method: "delete",
        route: "/products/:id",
        action: controller.deleteProducts,
        validation: [
            param("id").isMongoId()
        ]
    }
]