import { NextFunction, Request, Response } from "express";
import { client } from "../services";
import { ObjectId } from "mongodb";

export class ProductController {
    async getProducts(req: Request, res: Response, nextFunction: NextFunction) {
        const products = await client.db("products").collection("productlist").find().toArray();
        res.status(200).send(products);
    };
    
    async postProducts(req: Request, res: Response, nextFunction: NextFunction) {
        const createData = await client.db("products").collection("productlist").insertOne(req.body);
        res.status(200).send(`Created product with id: ${createData.insertedId}`);
    };

    async putProducts(req: Request, res: Response, nextFunction: NextFunction) {
        const updateData = await client.db("products").collection("productlist").replaceOne({ _id: new ObjectId(req.params.id) }, req.body);

        if (!updateData.acknowledged || updateData.modifiedCount == 0) {
            res.status(400).send("Product with given id does not exist");
        } else {
            res.status(200).send("Product updated");
        }
    };

    async deleteProducts(req: Request, res: Response, nextFunction: NextFunction) {
        const deleteData = await client.db("products").collection("productlist").deleteOne({ _id: new ObjectId(req.params.id) });

        if (!deleteData.acknowledged || deleteData.deletedCount == 0) {
            res.status(400).send("Product with given id does not exist");
        } else {
            res.status(200).send("Product deleted");
        }
        
    };
}