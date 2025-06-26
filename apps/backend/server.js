import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { openAIChain, parser } from "./modules/openAI.mjs";
import { lipSync } from "./modules/lip-sync.mjs";
import { sendDefaultMessages, defaultResponse } from "./modules/defaultMessages.mjs";
import { convertAudioToText } from "./modules/whisper.mjs";

dotenv.config();

const elevenLabsApiKey = process.env.ELEVEN_LABS_API_KEY;

const app = express();
app.use(express.json());
app.use(cors());
const port = 3000;

app.get("/voices", async (req, res) => {
  res.send(await voice.getVoices(elevenLabsApiKey));
});

// Add a health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.post("/tts", async (req, res) => {
  try {
    const userMessage = req.body.message;
    if (!userMessage) {
      return res.status(400).send({ error: 'No message provided' });
    }

    console.log('\n=== New TTS Request ===');
    console.log('Received message:', userMessage);
    
    // Check for default responses first
    const defaultMessages = await sendDefaultMessages({ userMessage });
    if (defaultMessages) {
      console.log('Using default response');
      return res.send({ messages: defaultMessages });
    }

    // Get response from OpenAI
    let openAImessages;
    try {
      console.log('Calling OpenAI...');
      const response = await openAIChain.invoke({
        question: userMessage,
        format_instructions: parser.getFormatInstructions(),
      });
      openAImessages = response?.messages || defaultResponse;
      console.log('OpenAI response:', JSON.stringify(openAImessages, null, 2));
    } catch (error) {
      console.error('OpenAI Error:', error);
      openAImessages = defaultResponse;
    }

    if (!openAImessages || !Array.isArray(openAImessages)) {
      console.error('Invalid messages format from OpenAI:', openAImessages);
      return res.status(500).send({ error: 'Failed to process message' });
    }

    // Process lip sync for each message
    console.log(`Processing lip sync for ${openAImessages.length} messages...`);
    const startTime = Date.now();
    
    try {
      const result = await lipSync({ messages: openAImessages });
      const processingTime = (Date.now() - startTime) / 1000;
      console.log(`Lip sync completed in ${processingTime.toFixed(2)}s`);
      
      // Ensure we have valid audio data
      const validMessages = result.map(msg => ({
        ...msg,
        audio: msg.audio || '',
        visemes: Array.isArray(msg.visemes) ? msg.visemes : []
      }));
      
      return res.send({ messages: validMessages });
    } catch (lipSyncError) {
      console.error('Lip sync processing error:', lipSyncError);
      // Return messages without lip sync if processing fails
      const fallbackMessages = openAImessages.map(msg => ({
        ...msg,
        audio: '',
        visemes: []
      }));
      return res.send({ messages: fallbackMessages });
    }
  } catch (error) {
    console.error('Error in /tts endpoint:', error);
    res.status(500).send({ 
      error: 'Internal server error',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.post("/sts", async (req, res) => {
  const base64Audio = req.body.audio;
  const audioData = Buffer.from(base64Audio, "base64");
  const userMessage = await convertAudioToText({ audioData });
  let openAImessages;
  try {
    openAImessages = await openAIChain.invoke({
      question: userMessage,
      format_instructions: parser.getFormatInstructions(),
    });
  } catch (error) {
    openAImessages = defaultResponse;
  }
  openAImessages = await lipSync({ messages: openAImessages.messages });
  res.send({ messages: openAImessages });
});

app.listen(port, () => {
  console.log(`Jack are listening on port ${port}`);
});
