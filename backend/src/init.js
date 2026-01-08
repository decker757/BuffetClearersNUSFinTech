// This file MUST be imported first to load environment variables
// before any other modules that depend on them
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory of this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from backend root directory
// (go up one level from src/ to backend/)
const envPath = join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

console.log('✅ Environment variables loaded from:', envPath);
console.log('🔑 JWT_SECRET:', process.env.JWT_SECRET || '(not set - using fallback)');
