import prisma from '../db/prisma';
import { embeddingService } from './embedding.service';

export interface CreateProductData {
    title: string;
    description?: string;
    status?: string;
    domainId: string; // добавляем обязательный domainId
    variants: {
        title: string;
        price: number;
        sku?: string;
    }[];
}

export interface UpdateProductData {
    title?: string;
    description?: string;
    status?: string;
    variants?: {
        id?: number;
        title: string;
        price: number;
        sku?: string;
    }[];
}

export class ProductService {
    
    async getAllProducts(domainId: string, page: number = 1, limit: number = 50, search?: string) {
        const offset = (page - 1) * limit;
        
        // Build search conditions with domain filter
        const whereConditions: any = {
            domainId: domainId // фильтруем только товары этого домена
        };
        
        if (search) {
            whereConditions.OR = [
                {
                    title: {
                        contains: search,
                        mode: 'insensitive' as const
                    }
                },
                {
                    description: {
                        contains: search,
                        mode: 'insensitive' as const
                    }
                },
                {
                    variants: {
                        some: {
                            sku: {
                                contains: search,
                                mode: 'insensitive' as const
                            }
                        }
                    }
                }
            ];
        }
        
        const [products, totalCount] = await Promise.all([
            prisma.product.findMany({
                where: whereConditions,
                include: {
                    variants: true
                },
                orderBy: {
                    createdAt: 'desc'
                },
                skip: offset,
                take: limit
            }),
            prisma.product.count({
                where: whereConditions
            })
        ]);

        return {
            products,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
                hasNext: page < Math.ceil(totalCount / limit),
                hasPrev: page > 1
            },
            search: search || null
        };
    }

    async getProductById(id: number, domainId?: string) {
        const whereClause: any = { id };
        if (domainId) {
            whereClause.domainId = domainId;
        }
        
        return await prisma.product.findUnique({
            where: whereClause,
            include: {
                variants: true
            }
        });
    }

    async createProduct(data: CreateProductData) {
        const product = await prisma.product.create({
            data: {
                title: data.title,
                description: data.description,
                status: data.status || 'active',
                domainId: data.domainId, // добавляем domainId
                variants: {
                    create: data.variants
                }
            },
            include: {
                variants: true
            }
        });

        // Автоматически генерируем эмбеддинги для нового товара
        try {
            await embeddingService.updateProductEmbedding(product.id);
            console.log(`✅ Generated embeddings for new product: ${product.title}`);
        } catch (error) {
            console.warn(`⚠️ Failed to generate embeddings for product ${product.id}:`, error);
            // Не прерываем создание товара, если не удалось создать эмбеддинги
        }

        return product;
    }

    async updateProduct(id: number, data: UpdateProductData, domainId?: string) {
        // Check if product exists and belongs to the domain
        const whereClause: any = { id };
        if (domainId) {
            whereClause.domainId = domainId;
        }
        
        const existingProduct = await prisma.product.findUnique({
            where: whereClause,
            include: { variants: true }
        });

        if (!existingProduct) {
            throw new Error('Product not found or access denied');
        }

        // If variants are provided, replace all variants
        if (data.variants) {
            await prisma.productVariant.deleteMany({
                where: { productId: id }
            });
        }

        const updatedProduct = await prisma.product.update({
            where: { id },
            data: {
                title: data.title,
                description: data.description,
                status: data.status,
                ...(data.variants && {
                    variants: {
                        create: data.variants.map(variant => ({
                            title: variant.title,
                            price: variant.price,
                            sku: variant.sku || ''
                        }))
                    }
                })
            },
            include: {
                variants: true
            }
        });

        // Автоматически обновляем эмбеддинги для обновленного товара
        try {
            await embeddingService.updateProductEmbedding(id);
            console.log(`✅ Updated embeddings for product: ${updatedProduct.title}`);
        } catch (error) {
            console.warn(`⚠️ Failed to update embeddings for product ${id}:`, error);
            // Не прерываем обновление товара, если не удалось обновить эмбеддинги
        }

        return updatedProduct;
    }

    async deleteProduct(id: number, domainId?: string) {
        // Check if product exists and belongs to the domain
        if (domainId) {
            const existingProduct = await prisma.product.findUnique({
                where: { id, domainId }
            });
            
            if (!existingProduct) {
                throw new Error('Product not found or access denied');
            }
        }
        
        // Благодаря CASCADE в схеме, варианты удалятся автоматически
        return await prisma.product.delete({
            where: { id }
        });
    }
} 