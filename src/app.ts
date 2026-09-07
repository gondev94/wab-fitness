import express from "express";
import dotenv from "dotenv";
import {buildLogger} from "./plugins/logger.plugin.ts";

dotenv.config();
const app = express();
const PORT: number = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const logger = buildLogger('app.ts');

app.listen(PORT, () => {
    logger.info({ message: `Server is running on port ${PORT}` });
});
