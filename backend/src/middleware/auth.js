import jwt from "jsonwebtoken";

// JWT secret (should be in .env in production)
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

console.log('🔑 [AUTH MIDDLEWARE] JWT_SECRET loaded:', JWT_SECRET);

// Middleware to protect routes
export function authenticateToken(req, res, next) {
  console.log('🔐 Auth Middleware - Checking token...');

  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    console.log('❌ Auth Failed: No token provided');
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log('❌ Auth Failed: Invalid token -', err.message);
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    console.log('✅ Auth Success: User', user.address?.slice(0, 10) + '...');
    req.user = user;
    next();
  });
}
