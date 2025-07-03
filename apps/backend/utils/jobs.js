// Simple in-memory job store (replace with Redis in production)
const jobs = new Map();

export function createJob() {
  const jobId = Date.now().toString();
  jobs.set(jobId, { status: 'processing' });
  return jobId;
}

export function updateJob(jobId, data) {
  if (jobs.has(jobId)) {
    jobs.set(jobId, { ...jobs.get(jobId), ...data });
  }
}

export function getJob(jobId) {
  return jobs.get(jobId) || { status: 'not_found' };
}
