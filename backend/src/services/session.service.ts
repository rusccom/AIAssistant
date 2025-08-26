import prisma from '../db/prisma';
import { activeSessions } from '../session-store';
import { mergeAudioAndSaveRecord } from './ffmpeg.service';

/**
 * Starts a new session by creating a record in the database.
 * Also registers the session in the in-memory store.
 * @param sessionId The unique ID for the session.
 * @param hostname The hostname from which the request originates.
 * @returns The created session object or null if the hostname is not authorized.
 */
export const startSession = async (sessionId: string, hostname: string) => {
    // 1. Find the domain to get its ID and the associated user ID
    const domain = await prisma.domain.findUnique({
        where: { hostname },
    });

    // If the domain is not registered, we cannot start a session for it.
    if (!domain) {
        throw new Error(`Domain ${hostname} is not registered or authorized.`);
    }

    // 2. Create a new session record linked to the found domain
    const newSession = await prisma.session.create({
        data: {
            sessionId,
            domainId: domain.id, // Link to the domain
            userId: domain.userId,  // Link to the user who owns the domain
        },
    });

    // Keep track of the active session in memory (optional, but can be useful)
    activeSessions.set(sessionId, domain.userId);

    console.log(`Session ${sessionId} started for domain ${hostname} (User: ${domain.userId}).`);
    return newSession;
};

/**
 * Ends a session by updating its end time in the database.
 * Triggers audio merging and deregisters the session from the in-memory store.
 * @param sessionId The unique ID for the session to end.
 * @returns The updated session object or null if not found.
 */
export const endSession = async (sessionId: string) => {
    // 1. Deregister from active sessions first
    activeSessions.delete(sessionId);

    // 2. Find the session in the database
    const session = await prisma.session.findFirst({
        where: { sessionId },
    });

    if (!session) {
        console.warn(`[DB Session] End session failed: Could not find session ${sessionId} in DB.`);
        return null;
    }
    
    console.log(`[DB Session] Ended session ${sessionId}. Triggering audio merge.`);

    // 3. Trigger audio merge in the background (no need to wait for it)
    mergeAudioAndSaveRecord(sessionId).catch(err => {
        console.error(`[Background Merge] Error merging audio for session ${sessionId}:`, err);
    });

    return session;
}; 