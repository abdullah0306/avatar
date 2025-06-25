import ElevenLabs from "elevenlabs-node";
import dotenv from "dotenv";
import { promises as fs } from 'fs';
import path from 'path';

dotenv.config();

const elevenLabsApiKey = process.env.ELEVEN_LABS_API_KEY;
const voiceID = process.env.ELEVEN_LABS_VOICE_ID;
const modelID = process.env.ELEVEN_LABS_MODEL_ID;

const voice = new ElevenLabs({
  apiKey: elevenLabsApiKey,
  voiceId: voiceID,
});

async function ensureDirectoryExists(filePath) {
  const dir = path.dirname(filePath);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

async function convertTextToSpeech({ text, fileName }) {
  try {
    // Ensure the directory exists
    await ensureDirectoryExists(fileName);
    
    console.log(`Converting text to speech: "${text}"`);
    console.log(`Saving to: ${fileName}`);
    
    await voice.textToSpeech({
      fileName: fileName,
      textInput: text,
      voiceId: voiceID,
      stability: 0.5,
      similarityBoost: 0.5,
      modelId: modelID,
      style: 1,
      speakerBoost: true,
    });
    
    console.log(`Successfully saved audio to ${fileName}`);
    return true;
  } catch (error) {
    console.error('Error in convertTextToSpeech:', error);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    throw error;
  }
}

export { convertTextToSpeech, voice };
