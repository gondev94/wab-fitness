import 'dotenv/config';
import express from "express";
import { buildLogger } from "./plugins/logger.plugin.js";
import sessionRoutes from "./routes/session.routes.js";
import userRoutes from "./routes/user.routes.js";


const app = express();
const PORT: number = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const logger = buildLogger("app.ts");


app.use(express.json());
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/sessions", sessionRoutes);

app.listen(PORT, () => {
    if (PORT) {
        logger.info({ message: `Server is running on port ${PORT}` });
    } else {
        logger.error({ message: "PORT is not set" });
    }
});
