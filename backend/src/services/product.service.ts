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

export interface BulkImportData {
    title: string;
    description?: string;
    status?: string;
    variants: {
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

    async bulkImportProducts(productsData: BulkImportData[], domainId: string) {
        const results = {
            success: 0,
            failed: 0,
            errors: [] as string[]
        };

        for (let i = 0; i < productsData.length; i++) {
            const productData = productsData[i];
            
            try {
                // Валидация данных товара
                if (!productData.title?.trim()) {
                    results.failed++;
                    results.errors.push(`Row ${i + 1}: Product Title обязателен`);
                    continue;
                }

                if (!productData.variants || productData.variants.length === 0) {
                    results.failed++;
                    results.errors.push(`Row ${i + 1}: Товар должен иметь хотя бы один вариант`);
                    continue;
                }

                // Валидация вариантов
                let hasValidVariant = false;
                for (let j = 0; j < productData.variants.length; j++) {
                    const variant = productData.variants[j];
                    
                    if (!variant.title?.trim()) {
                        variant.title = 'Default Title';
                    }
                    
                    if (!variant.price || variant.price <= 0) {
                        results.errors.push(`Row ${i + 1}, Variant ${j + 1}: Цена должна быть положительной`);
                        continue;
                    }
                    
                    hasValidVariant = true;
                }

                if (!hasValidVariant) {
                    results.failed++;
                    results.errors.push(`Row ${i + 1}: Нет валидных вариантов`);
                    continue;
                }

                // Создание товара
                const createData: CreateProductData = {
                    title: productData.title.trim(),
                    description: productData.description?.trim(),
                    status: productData.status || 'active',
                    domainId: domainId,
                    variants: productData.variants.filter(v => v.title && v.price > 0)
                };

                await this.createProduct(createData);
                results.success++;
                
            } catch (error: any) {
                results.failed++;
                results.errors.push(`Row ${i + 1}: ${error.message || 'Неизвестная ошибка'}`);
                console.error(`Bulk import error for row ${i + 1}:`, error);
            }
        }

        return results;
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