import express, { NextFunction, Request, Response } from 'express'
import { client } from "./services";
import { ProductRoutes } from './routes/ProductRoutes';
import { validationResult } from 'express-validator';
import morgan from "morgan";
import { UserRoutes } from './routes/UserRoutes';
import passport from "passport";
import session from "express-session";
import dotenv from "dotenv";
import authRoutes, { authenticateJWT } from "./auth";

dotenv.config();

const app = express();

app.use(express.json());
app.use(morgan('tiny'));

app.use(session({ secret: process.env.JWT_SECRET as string, resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

app.use(authRoutes);

const Routes = [...ProductRoutes, ...UserRoutes]

Routes.forEach((route) => {
    (app as any)[route.method](
        route.route,
        route.validation,
        route.protected ? authenticateJWT : [],
        async (req: Request, res: Response, next: NextFunction) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).send({ errors: errors.array() });
            }
            
            try {
                await route.action(
                    req,
                    res,
                    next,
                );
            } catch (err) {
                console.log(err)
                return res.sendStatus(500);
            }
        },
    );
});

client.connect().then(() => {
    console.log("MongoDB Client Connected");

    app.listen(process.env.PORT, () => {
        console.log("Listening on port " + process.env.PORT);
    });
}).catch(err => {
    console.error(err);
    client.close();
})
