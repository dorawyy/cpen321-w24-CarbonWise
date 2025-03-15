import express, { NextFunction, Request, Response } from 'express'
import { ProductsRoutes } from './routes/ProductsRoutes';
import { UsersRoutes } from './routes/UsersRoutes';
import { FriendsRoutes } from './routes/FriendsRoutes';
import { validationResult } from 'express-validator';
import morgan from "morgan";

import dotenv from "dotenv";

import passport from "passport";
import session from "express-session";
import { router as authRoutes, authenticateJWT } from "./auth";

dotenv.config();

function createServer() {

    const app = express();

    app.use(express.json());
    app.use(morgan('tiny'));

    app.use(session({ secret: process.env.JWT_SECRET as string, resave: false, saveUninitialized: false }));
    app.use(passport.initialize());
    app.use(passport.session());

    app.use(authRoutes);

    const Routes = [...ProductsRoutes, ...UsersRoutes, ...FriendsRoutes]

    Routes.forEach((route) => {
        (app as any)[route.method](
            route.route,
            route.validation,
            route.protected ? authenticateJWT : [],
            async (req: Request, res: Response) => {
                const errors = validationResult(req);
                if (!errors.isEmpty()) {
                    return res.status(400).send({ errors: errors.array() });
                }
                
                try {
                    await route.action(
                        req,
                        res,
                    );
                } catch (err) {
                    return res.sendStatus(500);
                }
            },
        );
    });

    return app;
}


export {createServer};