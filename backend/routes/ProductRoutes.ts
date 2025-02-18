import { body, param } from "express-validator";
import { ProductController } from "../controllers/ProductController";

const controller = new ProductController()

export const ProductRoutes = [
    {
        method: "get",
        route: "/product/:id",
        action: controller.getProductById,
        validation: [
            param('id').isString().withMessage('Invalid product ID')
        ],
        protected: false // Requires authentication
    }
]