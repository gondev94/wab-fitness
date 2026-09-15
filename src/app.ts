import 'dotenv/config';
import express from "express";
import helmet from "helmet";
import cors from "cors";
import { buildLogger } from "./plugins/logger.plugin.js";
import sessionRoutes from "./routes/session.routes.js";
import userRoutes from "./routes/user.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import authRoutes from "./routes/auth.routes.js";


const app = express();
const PORT: number = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const logger = buildLogger("app.ts");

app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_ORIGIN || false,
    credentials: true,
}));
app.use(express.json({ limit: "32kb" }));
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/sessions", sessionRoutes);
app.use("/api/v1/bookings", bookingRoutes);
app.use("/api/v1/auth", authRoutes);

app.listen(PORT, () => {
    if (PORT) {
        logger.info({ message: `Server is running on port ${PORT}` });
    } else {
        logger.error({ message: "PORT is not set" });
    }
});
