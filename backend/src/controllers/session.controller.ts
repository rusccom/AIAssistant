import { Request, Response } from 'express';
import * as SessionService from '../services/session.service';

/**
 * Handles the start of a new session.
 * Expects { sessionId, hostname } in the body.
 */
export const startSessionHandler = async (req: Request, res: Response) => {
    const { sessionId, hostname } = req.body;

    if (!sessionId || !hostname) {
        return res.status(400).json({ error: 'sessionId and hostname are required' });
    }

    try {
        const session = await SessionService.startSession(sessionId, hostname);
        if (!session) {
            return res.status(403).json({ error: 'Failed to start session: Hostname not authorized.' });
        }
        res.status(201).json({ message: 'Session started successfully', session });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to start session' });
    }
};

/**
 * Handles the end of a session.
 * Expects { sessionId } in the body.
 */
export const endSessionHandler = async (req: Request, res: Response) => {
    const { sessionId } = req.body;

    if (!sessionId) {
        return res.status(400).json({ error: 'sessionId is required' });
    }

    try {
        const session = await SessionService.endSession(sessionId);
        if (!session) {
            // This might happen if the session was already ended or never existed
            return res.status(404).json({ error: 'Session not found.' });
        }
        res.status(200).json({ message: 'Session ended successfully', session });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to end session' });
    }
}; 