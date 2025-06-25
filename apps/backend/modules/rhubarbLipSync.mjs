import { execCommand, safeUnlink } from "../utils/files.mjs";
import path from 'path';
import { promises as fs } from 'fs';

// Path to the rhubarb executable
const RHUBARB_PATH = process.platform === 'win32' 
  ? path.join(process.cwd(), 'bin', 'rhubarb.exe')
  : path.join(process.cwd(), 'bin', 'rhubarb');

const getPhonemes = async ({ message = 0 } = {}) => {
  const startTime = Date.now();
  const audioDir = 'audios';
  const baseName = `message_${message}`;
  const mp3Path = path.join(audioDir, `${baseName}.mp3`);
  const wavPath = path.join(audioDir, `${baseName}.wav`);
  const jsonPath = path.join(audioDir, `${baseName}.json`);

  try {
    console.log(`[${message}] Starting audio processing...`);
    
    // Ensure audio directory exists
    await fs.mkdir(audioDir, { recursive: true });
    
    // Convert MP3 to WAV using ffmpeg
    console.log(`[${message}] Converting MP3 to WAV...`);
    await execCommand({
      command: `ffmpeg -y -i "${mp3Path}" -ar 44100 -ac 1 "${wavPath}"`
    });
    
    console.log(`[${message}] Audio conversion completed in ${Date.now() - startTime}ms`);

    // Generate lip sync data using Rhubarb
    console.log(`[${message}] Starting lip sync generation...`);
    await execCommand({
      command: `"${RHUBARB_PATH}" -f json -o "${jsonPath}" "${wavPath}" -r phonetic`,
      cwd: process.cwd()
    });
    
    console.log(`[${message}] Lip sync completed in ${Date.now() - startTime}ms`);

    // Read and return the generated JSON
    const data = await fs.readFile(jsonPath, 'utf8');
    const result = JSON.parse(data);
    
    // Clean up WAV file
    await safeUnlink(wavPath);
    
    return result;
  } catch (error) {
    console.error(`[${message}] Error in getPhonemes:`, error);
    
    // Clean up any partial files on error
    await Promise.all([
      safeUnlink(wavPath),
      safeUnlink(jsonPath)
    ]);
    
    // Return default mouth movements if there's an error
    return {
      mouthCues: [
        { start: 0, end: 1, value: "X" } // Neutral position
      ]
    };
  }
};

export { getPhonemes };