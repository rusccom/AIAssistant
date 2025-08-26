import { Request, Response } from 'express';
import * as AuthService from '../services/auth.service';

export const register = async (req: Request, res: Response) => {
    try {
        const user = await AuthService.registerUser(req.body);
        // Не возвращаем пароль
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { token, user } = await AuthService.loginUser(req.body);
        res.json({ token, user });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

export const issueWidgetToken = async (req: Request, res: Response) => {
    const { hostname } = req.body;
    if (!hostname) {
        return res.status(400).json({ error: 'Hostname is required' });
    }

    try {
        const result = await AuthService.issueTokenForWidget(hostname);
        if (!result) {
            return res.status(403).json({ error: 'This domain is not authorized to issue tokens.' });
        }
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to issue token.' });
    }
};

export const getCurrentUser = async (req: Request, res: Response) => {
    try {
        // The user object is attached to the request by the auth middleware
        // We just need to remove the password before sending it to the client
        const { password, ...userWithoutPassword } = (req as any).user;
        res.status(200).json(userWithoutPassword);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const changePassword = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current password and new password are required.' });
        }

        const result = await AuthService.changePassword(userId, currentPassword, newPassword);
        res.status(200).json(result);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        // Distinguish between bad request and server error
        if (errorMessage === 'Invalid current password.') {
            return res.status(400).json({ message: errorMessage });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const logout = async (req: Request, res: Response) => {
    // The auth middleware has already verified the user's token.
    // The client will be responsible for deleting the token.
    // We can just send a success message.
    res.status(200).json({ message: 'Logged out successfully.' });
};