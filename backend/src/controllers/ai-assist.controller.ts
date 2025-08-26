import { Request, Response } from 'express';
import * as aiAssistService from '../services/ai-assist.service';

export const generateStateContent = async (req: Request, res: Response) => {
    const { userPrompt, states } = req.body;

    if (!userPrompt) {
        return res.status(400).json({ message: 'User prompt is required.' });
    }

    try {
        const generatedContent = await aiAssistService.generateState(userPrompt, states);
        res.json(generatedContent);
    } catch (error) {
        console.error('Error generating state content:', error);
        res.status(500).json({ message: 'Failed to generate content from AI.' });
    }
}; 