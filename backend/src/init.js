// This file MUST be imported first to load environment variables
// before any other modules that depend on them
import dotenv from 'dotenv';

// Load environment variables immediately
dotenv.config();

console.log('✅ Environment variables loaded');
console.log('🔑 JWT_SECRET:', process.env.JWT_SECRET || '(not set - using fallback)');
