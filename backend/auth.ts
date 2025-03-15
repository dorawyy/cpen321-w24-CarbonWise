import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import express, { Request, Response, NextFunction } from "express";
import { nanoid } from "nanoid";
import { client, oauthClient } from "./services";
import { Collection } from "mongodb";
import { User } from "./types";
import { GOOGLE_REDIRECT_URI, JWT_EXPIRATION_TIME } from "./constants";
import asyncHandler from "express-async-handler";

dotenv.config();

const router = express.Router();

//=========================== FOR BROWSER TESTING ===========================
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
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

passport.deserializeUser((user: any, done) => {
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
    const token = jwt.sign(user, process.env.JWT_SECRET as string, { expiresIn: JWT_EXPIRATION_TIME });

    res.json({ token, user });
  }
);
//=============================================================================


// Verify Google OAuth Token
router.post("/auth/google", asyncHandler(async (req, res) => {
  const { google_id_token } = req.body;

  try {

    const ticket = await oauthClient.verifyIdToken({
      idToken: google_id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) throw new Error("Invalid token payload");

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

    const jwtToken = jwt.sign(
      user,
      process.env.JWT_SECRET as string,
      { expiresIn: JWT_EXPIRATION_TIME }
    );

    res.json({ token: jwtToken });
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
}));

const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.token;

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token as string, process.env.JWT_SECRET as string);
    (req as any).user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: "Unauthorized" });
  }
};

export { router, authenticateJWT };
