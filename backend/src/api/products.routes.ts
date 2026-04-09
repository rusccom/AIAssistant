import express from 'express';
import { ProductController } from '../controllers/product.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = express.Router();
const productController = new ProductController();

router.get('/', authMiddleware, productController.getProducts.bind(productController));
router.get('/:id', authMiddleware, productController.getProduct.bind(productController));
router.post('/', authMiddleware, productController.createProduct.bind(productController));
router.post('/bulk-import', authMiddleware, productController.bulkImportProducts.bind(productController));
router.post('/rebuild-embeddings', authMiddleware, productController.rebuildEmbeddings.bind(productController));
router.put('/:id', authMiddleware, productController.updateProduct.bind(productController));
router.delete('/:id', authMiddleware, productController.deleteProduct.bind(productController));

export { router as productsRoutes };
