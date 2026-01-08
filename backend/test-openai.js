import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API
});

async function testOpenAI() {
  try {
    console.log('Testing OpenAI API...');
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: "A simple test image, minimal abstract art",
      n: 1,
      size: "1024x1024",
      quality: "standard"
    });

    console.log('✅ OpenAI API works!');
    console.log('Image URL:', response.data[0].url);
  } catch (error) {
    console.error('❌ OpenAI API Error:', error.message);
    if (error.status === 401) {
      console.error('API key is invalid or expired!');
    }
  }
}

testOpenAI();
