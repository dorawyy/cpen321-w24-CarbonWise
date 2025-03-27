import { Product, History, HistoryProduct } from "../../types";

export function checkProduct(product: Product, realProduct: Product) {
    expect(product).toHaveProperty("product_name");
    expect(product.product_name).toBe(realProduct.product_name);
    expect(product).toHaveProperty("ecoscore_grade");
    expect(product.ecoscore_grade).toBe(realProduct.ecoscore_grade);
    expect(product).toHaveProperty("ecoscore_score");
    expect(product.ecoscore_score).toBe(realProduct.ecoscore_score);
    expect(product).toHaveProperty("categories_tags");
    expect(product.categories_tags).toEqual(realProduct.categories_tags);
    expect(product).toHaveProperty("categories_hierarchy");
    expect(product.categories_hierarchy).toEqual(realProduct.categories_hierarchy);
    expect(product).toHaveProperty("countries_tags");
    expect(product.countries_tags).toEqual(realProduct.countries_tags);
    expect(product).toHaveProperty("lang");
    expect(product.lang).toBe(realProduct.lang);
    expect(product).toHaveProperty("ingredients_tags");
    expect(product.ingredients_tags).toEqual(realProduct.ingredients_tags);
    expect(product).toHaveProperty("ecoscore_data");
}

export function checkRecommendations(recommendations: Product[]) {
    expect(recommendations).toBeInstanceOf(Array);
    recommendations.forEach((recommendation) => {
        expect(recommendation).toHaveProperty("product_name");
        expect(recommendation.product_name).not.toBe("");
        expect(recommendation).toHaveProperty("ecoscore_grade");
        expect(recommendation).toHaveProperty("ecoscore_score");
        expect(typeof recommendation.ecoscore_score).toBe("number");
        expect(recommendation).toHaveProperty("categories_tags");
        expect(recommendation.categories_tags).toBeInstanceOf(Array);
    });
}

export function checkHistory(history: History, realHistory: History, products: Product[]) {
    expect(history).toHaveProperty("user_uuid");
    expect(history.user_uuid).toBe(realHistory.user_uuid);
    expect(history).toHaveProperty("ecoscore_score");
    expect(typeof history.ecoscore_score).toBe("number");
    expect(history.ecoscore_score).toBe(realHistory.ecoscore_score);
    expect(history).toHaveProperty("products");
    expect(history.products).toBeInstanceOf(Array);
    expect(history.products).toHaveLength(realHistory.products.length);
    history.products.forEach((product: HistoryProduct, index: number) => {
        expect(product).toHaveProperty("product");
        if (!Array.isArray(products) || index < 0 || index >= products.length) {
            throw new Error("Invalid products array or index out of bounds");
        }
        const expectedProduct = products[index];
        expect(expectedProduct).toBeDefined();
        checkProduct(product.product!, expectedProduct);
    });
}