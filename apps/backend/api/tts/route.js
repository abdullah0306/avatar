import { createJob, updateJob, getJob } from '../../../utils/jobs';
import { lipSync } from '../../modules/lip-sync.mjs';
import { saveAudioFile, getAudioBase64 } from '../../utils/files.mjs';
import { openAIChain, parser } from '../../modules/openAI.mjs';
import { defaultResponse } from '../../modules/defaultMessages.mjs';

export async function POST(req) {
  try {
    const { message } = await req.json();
    if (!message) {
      return Response.json({ error: 'Message is required' }, { status: 400 });
    }
    
    // Get response from OpenAI
    let openAImessages;
    try {
      console.log('Calling OpenAI...');
      const response = await openAIChain.invoke({
        question: message,
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
      return Response.json({ error: 'Failed to process message' }, { status: 500 });
    }

    // Process the first message for now
    const messageToSpeak = openAImessages[0]?.text || message;
    
    // Generate audio and visemes
    const audioPath = await saveAudioFile(messageToSpeak, `message_${Date.now()}.mp3`);
    const audioBase64 = await getAudioBase64(audioPath);
    const visemes = await lipSync(audioPath);
    
    // Return the response immediately
    return Response.json({
      messages: [{
        text: messageToSpeak,
        audio: audioBase64,
        visemes: visemes || [],
        facialExpression: 'smile',
        animation: 'Idle'
      }]
    });
    
  } catch (error) {
    console.error('Error in TTS processing:', error);
    return Response.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
