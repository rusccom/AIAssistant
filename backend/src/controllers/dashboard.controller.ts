import { Request, Response } from 'express';
import * as dashboardService from '../services/dashboard.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { AVAILABLE_VOICES } from '../config/voices';

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
    // Благодаря middleware, мы можем быть уверены, что req.user существует
    const userId = req.user!.id;

    try {
        const sessions = await dashboardService.getUserSessions(userId);
        res.json(sessions);
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching sessions' });
    }
};

export const getDomains = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const domains = await dashboardService.getDomainsByUserId(userId);
        
        // Возвращаем домены + список голосов в одном запросе
        res.json({
            domains,
            voices: AVAILABLE_VOICES
        });
    } catch (error) {
        console.error('Error fetching domains:', error);
        res.status(500).json({ message: 'Server error fetching domains' });
    }
};

// Новый endpoint: получить ВСЕ данные дашборда одним запросом
export const getDashboardFullData = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const dashboardData = await dashboardService.getFullDashboardData(userId);
        
        res.json({
            domains: dashboardData.domains,
            domainConfigs: dashboardData.domainConfigs,
            voices: AVAILABLE_VOICES,
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
        const userId = req.user!.id;
        const { hostname } = req.body;

        if (!hostname) {
            return res.status(400).json({ message: 'Hostname is required' });
        }

        const newDomain = await dashboardService.addDomainToUser(userId, hostname);
        
        if (!newDomain) {
            return res.status(409).json({ message: 'Domain already exists for this user' });
        }
        
        res.status(201).json(newDomain);
    } catch (error) {
        console.error('Error adding domain:', error);
        res.status(500).json({ message: 'Server error adding domain' });
    }
}; 