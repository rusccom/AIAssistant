import { Request, Response } from 'express';
// This controller is temporarily empty for the new dynamic tool system
// We will add dynamic handlers later
export const executeDynamicTool = async (req: Request, res: Response) => {
    res.status(501).json({ error: 'Dynamic tool execution not implemented yet' });
}; 