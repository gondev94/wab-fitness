import dotenv from "dotenv";
import express from "express";
import { buildLogger } from "./plugins/logger.plugin.js";

dotenv.config();
const app = express();
const PORT: number = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const logger = buildLogger("app.ts");

app.listen(PORT, () => {
    if (PORT) {
        logger.info({ message: `Server is running on port ${PORT}` });
    } else {
        logger.error({ message: "PORT is not set" });
    }
});
