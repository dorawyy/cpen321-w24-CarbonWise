import express from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { OAuth2Client } from "google-auth-library";
import { Request, Response, NextFunction } from "express";


dotenv.config();

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

interface User {
  id: string;
  email: string;
  name: string;
}

//=========================== FOR BROWSER TESTING ===========================
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      callbackURL: "/auth/google/callback",
    },
    async (_accessToken, _refreshToken, profile, done) => {
      const user: User = {
        id: profile.id,
        email: profile.emails?.[0].value || "",
        name: profile.displayName,
      };
      return done(null, user);
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
    const token = jwt.sign(user, process.env.JWT_SECRET as string, { expiresIn: "1h" });

    res.json({ token, user });
  }
);
//=============================================================================


// Verify Google OAuth Token
router.post("/auth/google", async (req, res) => {
  const { token } = req.body;

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) throw new Error("Invalid token payload");

    const user: User = { id: payload.sub, email: payload.email || "", name: payload.name || "" };

    const jwtToken = jwt.sign(user, process.env.JWT_SECRET as string, { expiresIn: "1h" });
    
    //TODO: Create a user in the database or return the user if it already exists

    res.json({ token: jwtToken, user });
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
});


export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    (req as any).user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Forbidden" });
  }
};

export default router;

