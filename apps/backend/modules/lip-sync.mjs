import { promises as fs } from 'fs';
import path from 'path';
import { convertTextToSpeech } from "./elevenLabs.mjs";
import { getPhonemes } from "./rhubarbLipSync.mjs";
import { 
  audioFileToBase64, 
  ensureDirectory,
  safeUnlink
} from "../utils/files.mjs";

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second delay between retries

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Main lip-sync function that processes messages, generates audio and viseme data
 */
const lipSync = async ({ messages }) => {
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    console.log('No messages to process');
    return [];
  }

  const audioDir = path.join(process.cwd(), 'audios');
  const processedMessages = [];
  const startTime = Date.now();

  console.log(`Processing lip sync for ${messages.length} messages...`);

  try {
    // Ensure audio directory exists
    await ensureDirectory(audioDir);
    console.log(`Using audio directory: ${audioDir}`);

    for (let index = 0; index < messages.length; index++) {
      const message = messages[index];
      const baseName = `message_${index}`;
      const mp3Path = path.join(audioDir, `${baseName}.mp3`);
      const wavPath = path.join(audioDir, `${baseName}.wav`);
      const jsonPath = path.join(audioDir, `${baseName}.json`);
      
      console.log(`\n--- Processing message ${index} ---`);
      console.log(`Text: ${message.text.substring(0, 50)}${message.text.length > 50 ? '...' : ''}`);
      
      // Clean up any existing files
      await Promise.all([
        safeUnlink(mp3Path),
        safeUnlink(wavPath),
        safeUnlink(jsonPath)
      ]);

      let audioBase64 = '';
      let visemes = [];

      try {
        // 1. Convert text to speech (with retries)
        let ttsSuccess = false;
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
          try {
            console.log(`[${index}] Converting text to speech (attempt ${attempt + 1})...`);
            await convertTextToSpeech({ 
              text: message.text, 
              fileName: mp3Path 
            });
            ttsSuccess = true;
            break; // Success, exit retry loop
          } catch (error) {
            console.error(`[${index}] Error in convertTextToSpeech (attempt ${attempt + 1}):`, error.message);
            if (attempt === MAX_RETRIES - 1) {
              console.error(`[${index}] Max retries reached for TTS`);
              throw error;
            }
            await delay(RETRY_DELAY * (attempt + 1));
          }
        }
        
        // 2. Generate lip-sync data
        console.log(`[${index}] Generating lip sync data...`);
        const phonemeData = await getPhonemes({ message: index });
        visemes = phonemeData.mouthCues || [];
        console.log(`[${index}] Generated ${visemes.length} visemes`);

        // 3. Convert audio to base64
        console.log(`[${index}] Converting audio to base64...`);
        audioBase64 = await audioFileToBase64({ fileName: mp3Path });
        if (!audioBase64) {
          throw new Error('Empty audio data');
        }
        
      } catch (error) {
        console.error(`[${index}] Error processing message:`, error);
        // Fallback to neutral position if there's an error
        visemes = [{ start: 0, end: 1, value: 'X' }];
      } finally {
        // Clean up temporary files
        await Promise.all([
          safeUnlink(mp3Path),
          safeUnlink(wavPath),
          safeUnlink(jsonPath)
        ]);
      }

      processedMessages.push({
        ...message,
        audio: audioBase64,
        visemes: visemes
      });
    }
    
    console.log(`\n--- Lip sync completed for ${processedMessages.length} messages in ${(Date.now() - startTime) / 1000}s ---`);
    return processedMessages;
    
  } catch (error) {
    console.error('Critical error in lipSync:', error);
    
    // Return whatever messages we've processed so far, or fallback to empty
    if (processedMessages.length > 0) {
      console.log(`Returning ${processedMessages.length} processed messages despite error`);
      return processedMessages;
    }
    
    // If we couldn't process any messages, return them with empty audio/visemes
    return messages.map(m => ({
      ...m,
      audio: '',
      visemes: [{ start: 0, end: 1, value: 'X' }] // Neutral position
    }));
  }
};

export { lipSync };
