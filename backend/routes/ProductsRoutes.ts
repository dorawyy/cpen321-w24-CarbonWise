import { param, query } from "express-validator";
import { ProductsController } from "../controllers/ProductsController";

const controller = new ProductsController();

export const ProductsRoutes = [
    {
        method: "get",
        route: "/products/:product_id",
        action: controller.getProductById.bind(controller),
        validation: [
            param("product_id").exists().bail().isString().withMessage("Invalid product ID"),
            query("num_recommendations").optional({ nullable: true }).isInt({ min: 1 }).withMessage("Number of recommendations must be a positive integer"),
            query("include_languages").optional({ nullable: true }).isString().withMessage("Included languages must be a comma-separated string"),
            query("include_countries").optional({ nullable: true }).isString().withMessage("Included countries must be a comma-separated string")
        ],
        protected: false
    }
];
