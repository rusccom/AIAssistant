import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import prisma from '../db/prisma';

async function generateTestProducts() {
    console.log('Generating test products for pagination...');

    const productCategories = [
        'Electronics',
        'Clothing',
        'Books',
        'Home & Garden',
        'Sports',
        'Beauty',
        'Toys',
        'Food',
        'Health',
        'Automotive'
    ];

    const productNames = [
        'iPhone', 'Samsung Galaxy', 'MacBook', 'Dell Laptop', 'Gaming Mouse',
        'T-Shirt', 'Jeans', 'Sneakers', 'Jacket', 'Dress',
        'Fiction Novel', 'Cookbook', 'Programming Guide', 'History Book', 'Art Magazine',
        'Garden Tools', 'Plant Pot', 'Sofa', 'Coffee Table', 'Lamp',
        'Running Shoes', 'Tennis Racket', 'Football', 'Yoga Mat', 'Dumbbells',
        'Face Cream', 'Shampoo', 'Lipstick', 'Perfume', 'Nail Polish',
        'Board Game', 'Action Figure', 'Puzzle', 'Remote Car', 'Building Blocks',
        'Coffee Beans', 'Chocolate', 'Pasta', 'Olive Oil', 'Honey',
        'Vitamins', 'First Aid Kit', 'Thermometer', 'Face Mask', 'Hand Sanitizer',
        'Car Parts', 'Motor Oil', 'Tire', 'Car Cleaner', 'GPS Navigator'
    ];

    const colors = ['Red', 'Blue', 'Green', 'Black', 'White', 'Yellow', 'Purple', 'Orange', 'Pink', 'Gray'];
    const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

    for (let i = 0; i < 120; i++) {
        const category = productCategories[Math.floor(Math.random() * productCategories.length)];
        const baseName = productNames[Math.floor(Math.random() * productNames.length)];
        const productName = `${baseName} ${category} ${i + 1}`;
        
        const hasVariants = Math.random() > 0.3; // 70% chance of having variants
        
        if (hasVariants) {
            // Create product with variants
            const variantCount = Math.floor(Math.random() * 4) + 2; // 2-5 variants
            const variants = [];
            
            for (let v = 0; v < variantCount; v++) {
                const color = colors[Math.floor(Math.random() * colors.length)];
                const size = Math.random() > 0.5 ? sizes[Math.floor(Math.random() * sizes.length)] : '';
                const variantName = size ? `${color} ${size}` : color;
                const basePrice = Math.floor(Math.random() * 50000) + 1000; // $10-$500 in cents
                
                variants.push({
                    title: variantName,
                    price: basePrice + (v * 500), // Slightly different prices
                    sku: `${category.toUpperCase()}-${(i + 1).toString().padStart(3, '0')}-${v + 1}`
                });
            }
            
            await prisma.product.create({
                data: {
                    title: productName,
                    description: `High-quality ${category.toLowerCase()} product with multiple options`,
                    status: 'active',
                    variants: {
                        create: variants
                    }
                }
            });
        } else {
            // Create simple product
            const price = Math.floor(Math.random() * 20000) + 500; // $5-$200 in cents
            
            await prisma.product.create({
                data: {
                    title: productName,
                    description: `Premium ${category.toLowerCase()} product`,
                    status: 'active',
                    variants: {
                        create: {
                            title: 'Default Title',
                            price: price,
                            sku: `${category.toUpperCase()}-${(i + 1).toString().padStart(3, '0')}`
                        }
                    }
                }
            });
        }
        
        if ((i + 1) % 10 === 0) {
            console.log(`Generated ${i + 1} products...`);
        }
    }
    
    console.log('✅ Successfully generated 120 test products!');
}

async function main() {
    try {
        await generateTestProducts();
    } catch (error) {
        console.error('Error generating test products:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main(); 