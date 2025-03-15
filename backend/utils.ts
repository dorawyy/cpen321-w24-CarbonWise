import express, { Request, Response } from 'express'
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

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
        throw new Error("Missing JWT_SECRET in environment variables");
    }

    app.use(session({ secret: JWT_SECRET, resave: false, saveUninitialized: false }));
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