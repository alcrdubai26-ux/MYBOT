import express from "express";
import { registerRoutes } from "./routes.js";
import { pool } from "./db/index.js";
import { formatUncaughtError } from "../src/infra/errors.js";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    res.on("finish", () => {
        const duration = Date.now() - start;
        if (path.startsWith("/api")) {
            console.log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
        }
    });
    next();
});

(async () => {
    try {
        // Register all routes
        registerRoutes(app);

        // Error handling middleware
        app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
            const status = err.status || err.statusCode || 500;
            const message = err.message || "Internal Server Error";
            res.status(status).json({ message });
        });

        const PORT = Number(process.env.PORT) || 5000;
        app.listen(PORT, "0.0.0.0", () => {
            console.log(`[moltbot] Multi-tenant server running on port ${PORT}`);
        });
    } catch (err) {
        console.error("[moltbot] Server startup failed:", formatUncaughtError(err));
        process.exit(1);
    }
})();

// Graceful shutdown
process.on("SIGTERM", async () => {
    console.log("SIGTERM received, closing DB pool...");
    await pool.end();
    process.exit(0);
});
