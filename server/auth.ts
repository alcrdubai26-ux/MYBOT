import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { users, type User } from "./db/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import MemoryStore from "memorystore";

const MemoryStoreSession = MemoryStore(session);

export function setupAuth(app: Express) {
    const sessionSettings: session.SessionOptions = {
        secret: process.env.SESSION_SECRET || "moltbot-secret",
        resave: false,
        saveUninitialized: false,
        store: new MemoryStoreSession({
            checkPeriod: 86400000, // prune expired entries every 24h
        }),
        cookie: { secure: process.env.NODE_ENV === "production" },
    };

    app.use(session(sessionSettings));
    app.use(passport.initialize());
    app.use(passport.session());

    passport.use(
        new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
            try {
                const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
                if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
                    return done(null, false, { message: "Invalid email or password" });
                }
                return done(null, user);
            } catch (err) {
                return done(err);
            }
        }),
    );

    passport.serializeUser((user, done) => {
        done(null, (user as User).id);
    });

    passport.deserializeUser(async (id: string, done) => {
        try {
            const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
            done(null, user);
        } catch (err) {
            done(err);
        }
    });

    app.post("/api/register", async (req, res) => {
        try {
            const { email, password } = req.body;
            const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);

            if (existingUser) {
                return res.status(400).json({ message: "User already exists" });
            }

            const passwordHash = await bcrypt.hash(password, 10);
            const [newUser] = await db.insert(users).values({
                email,
                passwordHash,
            }).returning();

            req.login(newUser, (err) => {
                if (err) return res.status(500).json({ message: "Login after registration failed" });
                res.status(201).json(newUser);
            });
        } catch (err) {
            res.status(500).json({ message: "Registration failed" });
        }
    });

    app.post("/api/login", passport.authenticate("local"), (req, res) => {
        res.json(req.user);
    });

    app.post("/api/logout", (req, res, next) => {
        req.logout((err) => {
            if (err) return next(err);
            res.sendStatus(200);
        });
    });

    app.get("/api/user", (req, res) => {
        if (!req.isAuthenticated()) return res.sendStatus(401);
        res.json(req.user);
    });
}

export function generateToken(user: User): string {
    return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || "jwt-secret", {
        expiresIn: "7d",
    });
}
