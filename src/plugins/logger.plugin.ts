import winston from "winston";

const colors = {
    error: "red",
    warn: "yellow",
    info: "green",
    debug: "blue",
}

const logger = winston.createLogger({
    level: "info",
    format: winston.format.json(),
    defaultMeta: {  },
    transports: [

        new winston.transports.File({ filename: "error.log", level: "error" }),
        new winston.transports.File({ filename: "combined.log" }),
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize({ all: true, colors }),
                winston.format.simple(),
            ),
            
        }),
    ],
});

export const buildLogger = (service: string) => {
    return logger.child({ service });
}

