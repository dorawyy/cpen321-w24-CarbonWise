import { param, query } from "express-validator";
import { ProductsController } from "../controllers/ProductsController";

const controller = new ProductsController()

export const ProductsRoutes = [
    {
        method: "get",
        route: "/products/:product_id",
        action: controller.getProductById,
        validation: [
            param("product_id").isString().withMessage("Invalid product ID"),
            query("num_recommendations").optional().isInt({ min: 1 }).withMessage("Number of recommendations must be a positive integer"),
            query("include_languages").optional().isString().withMessage("Included languages must be a comma-separated string"),
            query("include_countries").optional().isString().withMessage("Included countries must be a comma-separated string")
        ],
        protected: false
    }
]