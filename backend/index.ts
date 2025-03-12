import { client } from "./services";
import dotenv from "dotenv";
import { createServer } from "./utils";

dotenv.config();

client.connect().then(() => {
    console.log("MongoDB Client Connected");

    const app = createServer();

    app.listen(process.env.PORT);

}).catch(err => {
    console.error(err);
    client.close();
});