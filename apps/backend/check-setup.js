import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('Checking project setup...');

// Check if required directories exist
const requiredDirs = ['audios', 'bin'];
requiredDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`✅ ${dir} directory exists`);
  } else {
    console.log(`❌ ${dir} directory is missing`);
    fs.mkdirSync(dir, { recursive: true });
    console.log(`   Created ${dir} directory`);
  }
});

// Check if Rhubarb executable exists
if (fs.existsSync(path.join('bin', 'rhubarb.exe'))) {
  console.log('✅ Rhubarb executable found');
} else {
  console.log('❌ Rhubarb executable is missing');
  console.log('   Please download Rhubarb Lip-Sync from https://github.com/DanielSWolf/rhubarb-lip-sync/releases');
  console.log('   and extract it to the bin directory');
}

// Check environment variables
const requiredEnvVars = [
  'OPENAI_API_KEY',
  'OPENAI_MODEL',
  'ELEVEN_LABS_API_KEY',
  'ELEVEN_LABS_VOICE_ID',
  'ELEVEN_LABS_MODEL_ID'
];

let envVarsOk = true;
requiredEnvVars.forEach(envVar => {
  if (process.env[envVar]) {
    console.log(`✅ ${envVar} is set`);
  } else {
    console.log(`❌ ${envVar} is missing`);
    envVarsOk = false;
  }
});

if (!envVarsOk) {
  console.log('\nPlease update your .env file with the missing variables');
}

// Check if ffmpeg is installed
exec('ffmpeg -version', (error, stdout, stderr) => {
  if (error) {
    console.log('❌ ffmpeg is not installed or not in PATH');
    console.log('   Please install ffmpeg from https://ffmpeg.org/download.html');
  } else {
    console.log('✅ ffmpeg is installed');
  }
  
  console.log('\nSetup check complete!');
});
