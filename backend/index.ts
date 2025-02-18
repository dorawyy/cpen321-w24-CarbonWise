import express, { NextFunction, Request, Response } from 'express'
import { client } from "./services";
import { ProductRoutes } from './routes/ProductRoutes';
import { validationResult } from 'express-validator';
import morgan from "morgan";
import { UserRoutes } from './routes/UserRoutes';

const app = express();

app.use(express.json());
app.use(morgan('tiny'));

const Routes = [...ProductRoutes, ...UserRoutes]

Routes.forEach((route) => {
    (app as any)[route.method](
        route.route,
        route.validation,
        async (req: Request, res: Response, next: NextFunction) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                /* If there are validation errors, send a response with the error messages */
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
                return res.sendStatus(500); // Don't expose internal server workings
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
