import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Execute a shell command with better error handling and logging
 */
const execCommand = ({ command, cwd = process.cwd() }) => {
  return new Promise((resolve, reject) => {
    console.log(`[CMD] ${command}`);
    
    const child = exec(command, { cwd }, (error, stdout, stderr) => {
      if (error) {
        console.error(`[CMD ERROR] ${command}\n${stderr}`);
        return reject(new Error(`Command failed: ${error.message}`));
      }
      if (stderr) {
        console.warn(`[CMD WARN] ${command}\n${stderr}`);
      }
      resolve(stdout.trim());
    });

    // Log output in real-time for debugging
    if (process.env.DEBUG === 'true') {
      child.stdout?.on('data', data => console.log(`[CMD OUT] ${data}`));
      child.stderr?.on('data', data => console.error(`[CMD ERR] ${data}`));
    }
  });
};

/**
 * Safely read and parse a JSON file
 */
const readJsonFile = async ({ fileName }) => {
  try {
    const data = await fs.readFile(fileName, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading JSON file ${fileName}:`, error);
    throw error;
  }
};

/**
 * Convert audio file to base64 with error handling
 */
const audioFileToBase64 = async ({ fileName }) => {
  try {
    if (!fileName) {
      throw new Error('No file name provided');
    }
    
    // Check if file exists
    try {
      await fs.access(fileName);
    } catch (error) {
      console.error(`Audio file not found: ${fileName}`);
      return '';
    }
    
    const data = await fs.readFile(fileName);
    return data.toString('base64');
  } catch (error) {
    console.error(`Error reading audio file ${fileName}:`, error);
    return ''; // Return empty string on error
  }
};

/**
 * Helper to ensure a directory exists
 */
const ensureDirectory = async (dirPath) => {
  try {
    await fs.mkdir(dirPath, { recursive: true });
    return true;
  } catch (error) {
    if (error.code !== 'EEXIST') {
      console.error(`Error creating directory ${dirPath}:`, error);
      throw error;
    }
    return true;
  }
};

/**
 * Safely delete a file if it exists
 */
const safeUnlink = async (filePath) => {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(`Warning: Could not delete file ${filePath}:`, error.message);
      throw error;
    }
  }
};

/**
 * Get base64 encoded audio file content
 */
const getAudioBase64 = async (filePath) => {
  try {
    const audioData = await fs.readFile(filePath);
    return audioData.toString('base64');
  } catch (error) {
    console.error('Error reading audio file:', error);
    return '';
  }
};

export { 
  execCommand, 
  readJsonFile as readJsonTranscript,
  audioFileToBase64,
  ensureDirectory,
  safeUnlink,
  getAudioBase64
};
