import { OpenAIWhisperAudio } from "langchain/document_loaders/fs/openai_whisper_audio";
import { convertAudioToMp3 } from "../utils/audios.mjs";
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import dotenv from "dotenv";
dotenv.config();

const openAIApiKey = process.env.OPENAI_API_KEY;

// Create a temporary directory for audio processing
async function ensureTempDir() {
  const tempDir = path.join(os.tmpdir(), 'talking-avatar');
  try {
    await fs.mkdir(tempDir, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      console.error('Error creating temp directory:', error);
      throw error;
    }
  }
  return tempDir;
}

async function convertAudioToText({ audioData }) {
  try {
    const tempDir = await ensureTempDir();
    const outputPath = path.join(tempDir, `audio_${Date.now()}.mp3`);
    
    // Convert and save audio
    const mp3AudioData = await convertAudioToMp3({ audioData });
    await fs.writeFile(outputPath, mp3AudioData);
    
    console.log('Processing audio with Whisper...');
    const loader = new OpenAIWhisperAudio(outputPath, { 
      clientOptions: { 
        apiKey: openAIApiKey 
      } 
    });
    
    const docs = await loader.load();
    const doc = docs.shift();
    const transcribedText = doc?.pageContent || '';
    
    // Clean up
    try {
      await fs.unlink(outputPath);
    } catch (cleanupError) {
      console.error('Error cleaning up temp file:', cleanupError);
    }
    
    console.log('Transcribed text:', transcribedText);
    return transcribedText;
  } catch (error) {
    console.error('Error in convertAudioToText:', error);
    throw new Error(`Failed to transcribe audio: ${error.message}`);
  }
}

export { convertAudioToText };
