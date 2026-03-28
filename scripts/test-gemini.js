import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length > 0) {
      process.env[key.trim()] = vals.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
}

const key = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

async function run() {
  if (!key) {
    console.error("No API key found");
    return;
  }
  const genAI = new GoogleGenerativeAI(key);
  try {
    // 0.24.1 version of SDK might have different listModels location
    console.log("Listing models...");
    const result = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }).listModels?.();
    if (!result) {
      // In some versions it's on the genAI object
      const genAIModels = await genAI.listModels?.();
      console.log("Models from genAI.listModels():", JSON.stringify(genAIModels, null, 2));
    } else {
      console.log("Models from model.listModels():", JSON.stringify(result, null, 2));
    }
    
    // Test a few common ones
    const tests = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro", "gemini-1.0-pro"];
    for (const m of tests) {
      try {
        const model = genAI.getGenerativeModel({ model: m });
        const res = await model.generateContent("Say 'OK'");
        console.log(`✅ ${m} works! Response: ${res.response.text()}`);
      } catch (e) {
        console.log(`❌ ${m} failed: ${e.message}`);
      }
    }
  } catch (e) {
    console.error("Error listing models:", e.message);
  }
}

run();
