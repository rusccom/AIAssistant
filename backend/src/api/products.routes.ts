import express from 'express';
import { ProductController } from '../controllers/product.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = express.Router();
const productController = new ProductController();

// Получить все товары
router.get('/', authMiddleware, productController.getProducts.bind(productController));

// Получить товар по ID
router.get('/:id', authMiddleware, productController.getProduct.bind(productController));

// Создать товар
router.post('/', authMiddleware, productController.createProduct.bind(productController));

// Обновить товар  
router.put('/:id', authMiddleware, productController.updateProduct.bind(productController));

// Удалить товар
router.delete('/:id', authMiddleware, productController.deleteProduct.bind(productController));

export { router as productsRoutes }; 