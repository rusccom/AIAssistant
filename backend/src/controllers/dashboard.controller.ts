import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as dashboardService from '../services/dashboard.service';
import {
  getRealtimeProviderCatalog,
  getRealtimeProviders
} from '../features/realtime/shared/realtime.catalog';

const buildRealtimeResponse = () => ({
  voices: getRealtimeProviderCatalog('openai').voices,
  realtimeProviders: getRealtimeProviders()
});

export const getDashboardData = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const dashboardData = await dashboardService.getUserSessions(req.user.id);
    res.json(dashboardData);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ message: 'Server error fetching dashboard data' });
  }
};

export const getSessions = async (req: AuthRequest, res: Response) => {
  try {
    const sessions = await dashboardService.getUserSessions(req.user!.id);
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching sessions' });
  }
};

export const getDomains = async (req: AuthRequest, res: Response) => {
  try {
    const domains = await dashboardService.getDomainsByUserId(req.user!.id);
    res.json({
      domains,
      ...buildRealtimeResponse()
    });
  } catch (error) {
    console.error('Error fetching domains:', error);
    res.status(500).json({ message: 'Server error fetching domains' });
  }
};

export const getDashboardFullData = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const dashboardData = await dashboardService.getFullDashboardData(req.user!.id);
    res.json({
      domains: dashboardData.domains,
      domainConfigs: dashboardData.domainConfigs,
      ...buildRealtimeResponse(),
      success: true
    });
  } catch (error) {
    console.error('Error fetching full dashboard data:', error);
    res.status(500).json({
      message: 'Server error fetching dashboard data',
      success: false
    });
  }
};

export const addDomain = async (req: AuthRequest, res: Response) => {
  try {
    const { hostname } = req.body;

    if (!hostname) {
      return res.status(400).json({ message: 'Hostname is required' });
    }

    const newDomain = await dashboardService.addDomainToUser(req.user!.id, hostname);

    if (!newDomain) {
      return res.status(409).json({ message: 'Domain already exists for this user' });
    }

    res.status(201).json(newDomain);
  } catch (error) {
    console.error('Error adding domain:', error);
    res.status(500).json({ message: 'Server error adding domain' });
  }
};
