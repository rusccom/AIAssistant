import { exec } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import util from 'util';
// import prisma from '../db/prisma'; // Prisma больше не нужен здесь

const execPromise = util.promisify(exec);

const recordingsDir = path.resolve(__dirname, '../../recordings');
const mergedDir = path.resolve(__dirname, '../../merged');

/**
 * Merges audio files for a given session.
 * @param sessionId The ID of the session to merge.
 * @returns The path to the merged audio file.
 */
export const mergeAudioAndSaveRecord = async (sessionId: string): Promise<string> => {
    await fs.mkdir(mergedDir, { recursive: true });

    const userFilePath = path.join(recordingsDir, `recording-${sessionId}-user.webm`);
    const assistantFilePath = path.join(recordingsDir, `recording-${sessionId}-assistant.webm`);
    
    const userFileMp4Path = path.join(recordingsDir, `recording-${sessionId}-user.mp4`);
    const assistantFileMp4Path = path.join(recordingsDir, `recording-${sessionId}-assistant.mp4`);

    const finalUserPath = await fileExists(userFilePath) ? userFilePath : userFileMp4Path;
    const finalAssistantPath = await fileExists(assistantFilePath) ? assistantFilePath : assistantFileMp4Path;

    if (!await fileExists(finalUserPath) || !await fileExists(finalAssistantPath)) {
        throw new Error(`One or both audio files for session ${sessionId} not found.`);
    }

    const outputPath = path.join(mergedDir, `merged-${sessionId}.mp3`);

    const command = `ffmpeg -i "${finalUserPath}" -i "${finalAssistantPath}" -filter_complex "[0:a][1:a]amerge=inputs=2,pan=stereo|c0<c0|c1<c1" -ac 2 "${outputPath}"`;

    console.log(`Executing FFmpeg command for session ${sessionId}:`);
    console.log(command);

    try {
        await execPromise(command);
        console.log(`Successfully merged audio for session ${sessionId} to ${outputPath}`);
        
        // Опционально: удалить исходные файлы после успешного слияния
        await fs.unlink(finalUserPath);
        await fs.unlink(finalAssistantPath);

        return outputPath;
    } catch (error) {
        console.error(`Error executing FFmpeg for session ${sessionId}:`, error);
        throw new Error(`FFmpeg failed to merge audio for session ${sessionId}`);
    }
};

const fileExists = async (filePath: string): Promise<boolean> => {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}; 