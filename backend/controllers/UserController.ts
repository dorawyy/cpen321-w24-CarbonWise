import { NextFunction, Request, Response } from "express";
import { client } from "../services";
import { ObjectId } from "mongodb";

export class UserController {
    async getUsers(req: Request, res: Response, nextFunction: NextFunction) {
        const users = await client.db("users").collection("userlist").find().toArray();
        res.status(200).send(users);
    };
    
    async postUsers(req: Request, res: Response, nextFunction: NextFunction) {
        const createData = await client.db("users").collection("userlist").insertOne(req.body);
        res.status(200).send(`Created user with id: ${createData.insertedId}`);
    };

    async putUsers(req: Request, res: Response, nextFunction: NextFunction) {
        const updateData = await client.db("users").collection("userlist").replaceOne({ _id: new ObjectId(req.params.id) }, req.body);

        if (!updateData.acknowledged || updateData.modifiedCount == 0) {
            res.status(400).send("user with given id does not exist");
        } else {
            res.status(200).send("user updated");
        }
    };

    async deleteUsers(req: Request, res: Response, nextFunction: NextFunction) {
        const deleteData = await client.db("users").collection("userlist").deleteOne({ _id: new ObjectId(req.params.id) });
    }
}