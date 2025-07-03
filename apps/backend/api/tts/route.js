import { createJob, updateJob, getJob } from '../../../utils/jobs';
import { lipSync } from '../../modules/lip-sync.mjs';
import { saveAudioFile } from '../../utils/files.mjs';

export async function POST(req) {
  try {
    const { message } = await req.json();
    if (!message) {
      return Response.json({ error: 'Message is required' }, { status: 400 });
    }
    
    const jobId = createJob();
    processAsync(jobId, message);
    
    return Response.json({ jobId });
  } catch (error) {
    console.error('Error in TTS processing:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function processAsync(jobId, message) {
  try {
    const audioPath = await saveAudioFile(message, `message_${jobId}.mp3`);
    const visemes = await lipSync(audioPath);
    
    updateJob(jobId, {
      status: 'completed',
      result: {
        text: message,
        audio: audioPath,
        visemes,
        facialExpression: 'smile',
        animation: 'Idle'
      }
    });
  } catch (error) {
    console.error('Error processing job:', error);
    updateJob(jobId, {
      status: 'failed',
      error: error.message
    });
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');
    
    if (!jobId) {
      return Response.json({ error: 'jobId is required' }, { status: 400 });
    }

    const job = getJob(jobId);
    
    if (job.status === 'not_found') {
      return Response.json({ error: 'Job not found' }, { status: 404 });
    }

    return Response.json(job);
  } catch (error) {
    console.error('Error checking job status:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
