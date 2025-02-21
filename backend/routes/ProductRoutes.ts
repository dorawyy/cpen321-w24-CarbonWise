import { body, param, query } from "express-validator";
import { ProductController } from "../controllers/ProductController";

const controller = new ProductController()

export const ProductRoutes = [
    {
        method: "get",
        route: "/products/:id",
        action: controller.getProductById,
        validation: [
            param('id').isString().withMessage('Invalid product ID')
        ],
        protected: false // Requires authentication
    },
    {
        method: "get",
        route: "/recommendations/:id",
        action: controller.getRecommendationsByProductId,
        validation: [
            param("id").isString().withMessage("Invalid product ID"),
            query("recommendations").optional().isInt({ min: 1 }).withMessage("Recommendations must be a positive integer"),
            query("languages").optional().isString().withMessage("Languages must be a comma-separated string"),
            query("countries").optional().isString().withMessage("Countries must be a comma-separated string"),
            query("exclude_countries").optional().isString().withMessage("Excluded countries must be a comma-separated string")
        ]
    }
]