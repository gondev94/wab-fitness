import express from "express";
import dotenv from "dotenv";

const app = express();
const PORT: number = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});