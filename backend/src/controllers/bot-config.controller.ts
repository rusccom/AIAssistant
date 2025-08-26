import { Request, Response } from 'express';
import * as botConfigService from '../services/bot-config.service';
import { AuthRequest } from '../middleware/auth.middleware';

export const getBotConfig = async (req: AuthRequest, res: Response) => {
  const { domain } = req.query;
  if (typeof domain !== 'string') {
        return res.status(400).json({ message: 'Domain query parameter is required.' });
    }

    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized.' });
    }

    try {
        const config = await botConfigService.getBotConfig(req.user.id, domain);
        res.json(config);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        console.error(`Error getting bot config for ${domain}:`, error);
        res.status(500).json({ message: `Failed to retrieve bot configuration: ${errorMessage}` });
    }
  };

/*
export const getConversationStates = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { domain } = req.query;

  if (typeof domain !== 'string') {
    res.status(400).json({ error: 'Domain is required' });
    return;
  }

  try {
    const states = await botConfigService.getConversationStates(req.user.id, domain);
    res.status(200).json(states);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get conversation states' });
  }
};
*/

export const updateBotConfig = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized.' });
  }

  const { domain } = req.query;
  if (typeof domain !== 'string') {
    return res.status(400).json({ message: 'Domain query parameter is required.' });
  }

  try {
    const updatedConfig = await botConfigService.updateBotConfig(req.user.id, domain, req.body);
    res.json(updatedConfig);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(`Error updating bot config for ${domain}:`, error);
    res.status(500).json({ message: `Failed to update bot configuration: ${errorMessage}` });
  }
}; 

export const getDomains = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized.' });
  }

  try {
    const domains = await botConfigService.getUserDomains(req.user.id);
    res.json(domains);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(`Error fetching domains for user ${req.user.id}:`, error);
    res.status(500).json({ message: `Failed to fetch domains: ${errorMessage}` });
  }
}; 