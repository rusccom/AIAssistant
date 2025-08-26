import { Request, Response } from 'express';
import { ProductService } from '../services/product.service';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../db/prisma';

export class ProductController {
    private productService: ProductService;

    constructor() {
        this.productService = new ProductService();
    }

    async getProducts(req: AuthRequest, res: Response) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 50;
            const search = req.query.search as string || undefined;
            const domain = req.query.domain as string;
            
            if (!req.user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            
            if (!domain) {
                return res.status(400).json({ error: 'Domain parameter is required' });
            }
            
            // Проверяем что домен принадлежит пользователю
            const userDomain = await prisma.domain.findFirst({
                where: { 
                    hostname: domain,
                    userId: req.user.id
                }
            });
            
            if (!userDomain) {
                return res.status(403).json({ error: 'Access denied to this domain' });
            }
            
            const result = await this.productService.getAllProducts(userDomain.id, page, limit, search);
            res.json(result);
        } catch (error) {
            console.error('Error fetching products:', error);
            res.status(500).json({ error: 'Failed to fetch products' });
        }
    }

    async getProduct(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const domain = req.query.domain as string;
            
            if (!req.user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            
            if (!domain) {
                return res.status(400).json({ error: 'Domain parameter is required' });
            }
            
            // Проверяем что домен принадлежит пользователю
            const userDomain = await prisma.domain.findFirst({
                where: { 
                    hostname: domain,
                    userId: req.user.id
                }
            });
            
            if (!userDomain) {
                return res.status(403).json({ error: 'Access denied to this domain' });
            }
            
            const product = await this.productService.getProductById(parseInt(id), userDomain.id);
            
            if (!product) {
                return res.status(404).json({ error: 'Product not found' });
            }
            
            res.json(product);
        } catch (error) {
            console.error('Error fetching product:', error);
            res.status(500).json({ error: 'Failed to fetch product' });
        }
    }

    async createProduct(req: AuthRequest, res: Response) {
        try {
            const productData = req.body;
            const domain = req.query.domain as string;
            
            if (!req.user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            
            if (!domain) {
                return res.status(400).json({ error: 'Domain parameter is required' });
            }
            
            // Проверяем что домен принадлежит пользователю
            const userDomain = await prisma.domain.findFirst({
                where: { 
                    hostname: domain,
                    userId: req.user.id
                }
            });
            
            if (!userDomain) {
                return res.status(403).json({ error: 'Access denied to this domain' });
            }
            
            // Добавляем domainId к данным товара
            const productDataWithDomain = {
                ...productData,
                domainId: userDomain.id
            };
            
            const product = await this.productService.createProduct(productDataWithDomain);
            res.status(201).json(product);
        } catch (error) {
            console.error('Error creating product:', error);
            res.status(500).json({ error: 'Failed to create product' });
        }
    }

    async updateProduct(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const productData = req.body;
            const domain = req.query.domain as string;
            
            if (!req.user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            
            if (!domain) {
                return res.status(400).json({ error: 'Domain parameter is required' });
            }
            
            // Проверяем что домен принадлежит пользователю
            const userDomain = await prisma.domain.findFirst({
                where: { 
                    hostname: domain,
                    userId: req.user.id
                }
            });
            
            if (!userDomain) {
                return res.status(403).json({ error: 'Access denied to this domain' });
            }
            
            const product = await this.productService.updateProduct(parseInt(id), productData, userDomain.id);
            
            if (!product) {
                return res.status(404).json({ error: 'Product not found' });
            }
            
            res.json(product);
        } catch (error) {
            console.error('Error updating product:', error);
            res.status(500).json({ error: 'Failed to update product' });
        }
    }

    async deleteProduct(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const domain = req.query.domain as string;
            
            if (!req.user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            
            if (!domain) {
                return res.status(400).json({ error: 'Domain parameter is required' });
            }
            
            // Проверяем что домен принадлежит пользователю
            const userDomain = await prisma.domain.findFirst({
                where: { 
                    hostname: domain,
                    userId: req.user.id
                }
            });
            
            if (!userDomain) {
                return res.status(403).json({ error: 'Access denied to this domain' });
            }
            
            await this.productService.deleteProduct(parseInt(id), userDomain.id);
            res.status(204).send();
        } catch (error) {
            console.error('Error deleting product:', error);
            res.status(500).json({ error: 'Failed to delete product' });
        }
    }
} 