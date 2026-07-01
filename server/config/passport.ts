import bcrypt from "bcryptjs";
import crypto from "crypto";
import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";
import { db } from "../models/db.js";
import { ensureUserSubscription, getUserById, upsertOAuthUser } from "../services/authService.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";

interface GitHubProfile {
  id: string;
  username: string;
  displayName: string;
  emails: [{ value: string }];
  photos: [{ value: string }];
}

export const isGitHubAuthConfigured = Boolean(
  process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET,
);

const githubClientId = process.env.GITHUB_CLIENT_ID;
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;

const adminEmails = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function getRoleForEmail(email: string): string {
  return adminEmails.includes(email.toLowerCase()) ? "admin" : "user";
}

// Configure GitHub Strategy for admin login (only if credentials are provided)
if (githubClientId && githubClientSecret) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: githubClientId,
        clientSecret: githubClientSecret,
        callbackURL: process.env.GITHUB_CALLBACK_URL || "http://localhost:5000/api/auth/github/callback",
      },
      async (accessToken: string, refreshToken: string, profile: GitHubProfile, done: any) => {
        try {
          if (shouldUsePrisma) {
            const email = profile.emails[0]?.value;
            if (!email) throw new Error("GitHub profile did not provide an email");
            const byGitHub = await prisma.user.findFirst({ where: { githubId: profile.id } });
            if (byGitHub) return done(null, await getUserById(Number(byGitHub.id)));
            const user = await upsertOAuthUser(email, profile.displayName || profile.username, {
              role: getRoleForEmail(email) as "user" | "admin",
            });
            await prisma.user.update({
              where: { id: BigInt(user.id) },
              data: { githubId: profile.id, avatarUrl: profile.photos?.[0]?.value || null },
            });
            return done(null, user);
          }
          // Check if user exists by GitHub ID
          let user = db
            .prepare("SELECT * FROM users WHERE github_id = ?")
            .get(profile.id) as any;

          if (user) {
            // User exists, return it
            return done(null, user);
          }

          // Check if user exists by email
          user = db
            .prepare("SELECT * FROM users WHERE email = ?")
            .get(profile.emails[0].value) as any;

          if (user) {
            // Link GitHub account to existing user
            const role = getRoleForEmail(profile.emails[0].value);
            db.prepare(
              role === "admin"
                ? "UPDATE users SET github_id = ?, role = 'admin' WHERE id = ?"
                : "UPDATE users SET github_id = ? WHERE id = ?",
            ).run(profile.id, user.id);
            user.github_id = profile.id;
            user.role = role;
            return done(null, user);
          }

          // Create new user from GitHub
          const role = getRoleForEmail(profile.emails[0].value);
          const randomPass = crypto.randomBytes(24).toString("hex");
          const hash = bcrypt.hashSync(randomPass, 10);
          const result = db
            .prepare(
              `INSERT INTO users (email, name, github_id, password_hash, role, created_at)
               VALUES (?, ?, ?, ?, ?, datetime('now'))`,
            )
            .run(
              profile.emails[0].value,
              profile.displayName || profile.username,
              profile.id,
              hash,
              role,
            );

          user = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);

          await ensureUserSubscription(user!.id, "pro", "trial");

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      },
    ),
  );
}

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: number, done) => {
  try {
    if (shouldUsePrisma) {
      done(null, await getUserById(id));
      return;
    }
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as Express.User | null;
    done(null, user);
  } catch (error) {
    done(error);
  }
});

export default passport;
