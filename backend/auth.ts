import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import express, { Request, Response, NextFunction } from "express";
import { nanoid } from "nanoid";
import { client, oauthClient } from "./services";
import { Collection } from "mongodb";
import { User } from "./types";
import { JWT_EXPIRATION_TIME } from "./constants";
import asyncHandler from "express-async-handler";

dotenv.config();

const router = express.Router();

const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
if (!GOOGLE_REDIRECT_URI) {
  throw new Error("Missing GOOGLE_REDIRECT_URI in environment variables");
}

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
if (!GOOGLE_CLIENT_ID) {
  throw new Error("Missing GOOGLE_CLIENT_ID in environment variables");
}

const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
if (!GOOGLE_CLIENT_SECRET) {
  throw new Error("Missing GOOGLE_CLIENT_SECRET in environment variables");
}

//=========================== FOR BROWSER TESTING ===========================
passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: GOOGLE_REDIRECT_URI,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      const userCollection: Collection<User> = client.db("users_db").collection("users");
      let user = await userCollection.findOne({ google_id: profile.id });

      if (!user) {

        const user_uuid = nanoid(8);

        user = {
          _id: user_uuid,
          google_id: profile.id,
          email: profile.emails?.[0].value || "",
          name: profile.displayName,
          user_uuid,
          fcm_registration_token: "",
        };
        await userCollection.insertOne(user);
      }

      return done(null, user as User);
    }
  )
);


passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user: User, done) => {
  done(null, user);
});

// Google OAuth route
router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Google OAuth callback route
router.get(
  "/auth/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    const user = req.user as User;

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      throw new Error("Missing JWT_SECRET in environment variables");
    }

    const token = jwt.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRATION_TIME });

    res.json({ token, user });
  }
);
//=============================================================================


// Verify Google OAuth Token
router.post("/auth/google", asyncHandler(async (req: Request, res: Response) => {
  const { google_id_token } = req.body;

  try {

    const ticket = await oauthClient.verifyIdToken({
      idToken: google_id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) throw new Error("Invalid Google OAuth token");

    const userCollection: Collection<User> = client.db("users_db").collection("users");
    let user = await userCollection.findOne({ google_id: payload.sub });

    if (!user) {
      const user_uuid = nanoid(8);

      user = {
        _id: user_uuid,
        google_id: payload.sub,
        email: payload.email || "",
        name: payload.name || "",
        user_uuid,
        fcm_registration_token: "",
      };
      await userCollection.insertOne(user);
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      throw new Error("Missing JWT_SECRET in environment variables");
    }

    const jwtToken = jwt.sign(
      user,
      JWT_SECRET,
      { expiresIn: JWT_EXPIRATION_TIME }
    );

    res.json({ token: jwtToken });
  } catch (error) {
    res.status(401).json({ message: "Invalid Google OAuth token" });
  }
}));

const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.token;

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      throw new Error("Missing JWT_SECRET in environment variables");
    }

    const decoded = jwt.verify(token as string, JWT_SECRET);
    (req as any).user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: "Authentication error" });
  }
};

export { router, authenticateJWT };
