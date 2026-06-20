import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('Using API Key:', apiKey?.substring(0, 10) + '...');
  
  if (!apiKey) {
    console.error('No GEMINI_API_KEY found');
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  try {
    // List models is not directly supported in all SDK versions, but let's try generateContent with gemini-1.5-flash
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    console.log('Attempting simple generation with gemini-1.5-flash...');
    const response = await model.generateContent('Hi');
    console.log('Response:', response.response.text());
  } catch (error) {
    console.error('Failed with gemini-1.5-flash:', error);
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
    console.log('Attempting simple generation with gemini-1.5-flash-latest...');
    const response = await model.generateContent('Hi');
    console.log('Response:', response.response.text());
  } catch (error) {
    console.error('Failed with gemini-1.5-flash-latest:', error);
  }
}

main();
