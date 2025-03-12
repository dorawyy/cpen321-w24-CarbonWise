import { client } from "./services";
import dotenv from "dotenv";
import { createServer } from "./utils";

dotenv.config();

const app = createServer();

client.connect().then(() => {
    console.log("MongoDB Client Connected");

    app.listen(process.env.PORT, () => {
        console.log("Listening on port " + process.env.PORT);
    });

}).catch(err => {
    console.error(err);
    client.close();
});