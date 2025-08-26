#!/usr/bin/env ts-node

import dotenv from 'dotenv';
import path from 'path';

// Загружаем переменные окружения
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const BASE_URL = 'http://localhost:3000';
const HOSTNAME = 'localhost';

async function makeRequest(url: string, data: any) {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    });

    const responseData = await response.json();
    
    return {
        status: response.status,
        data: responseData
    };
}

async function testTokenAPI() {
    console.log('🔑 Тестируем Token API с передачей tools...\n');

    try {
        // Запрашиваем token для localhost
        console.log(`📝 Запрашиваем token для: ${HOSTNAME}`);
        
        const response = await makeRequest(`${BASE_URL}/api/token`, {
            hostname: HOSTNAME
        });

        if (response.status === 200) {
            console.log('✅ Token API работает успешно!');
            console.log(`🔑 Token получен: ${response.data.token.substring(0, 20)}...`);
            console.log(`⏰ Истекает: ${response.data.expires_at}`);
            console.log(`🎯 Voice: ${response.data.voice}`);
            console.log(`🛠️ Tools в ответе: ${response.data.tools?.length || 0}`);
            
            if (response.data.tools && response.data.tools.length > 0) {
                console.log('\n📦 Tools переданы клиенту:');
                response.data.tools.forEach((tool: any, index: number) => {
                    console.log(`${index + 1}. ${tool.name}`);
                    console.log(`   Описание: ${tool.description}`);
                });
            }

            console.log('\n📋 Instructions:');
            const instructions = response.data.instructions;
            const instructionsPreview = instructions.length > 200 ? 
                instructions.substring(0, 200) + '...' : instructions;
            console.log(instructionsPreview);

        } else {
            console.log(`❌ Ошибка ${response.status}:`, response.data);
        }

        // Тестируем с неизвестным hostname
        console.log('\n🔍 Тестируем с неизвестным hostname...');
        const badResponse = await makeRequest(`${BASE_URL}/api/token`, {
            hostname: 'unknown-domain.com'
        });

        if (badResponse.status !== 200) {
            console.log(`✅ Правильная ошибка для неизвестного домена: ${badResponse.status}`);
            console.log(`💬 Сообщение: ${badResponse.data.error}`);
        } else {
            console.log('⚠️ Неожиданно получился успешный ответ для неизвестного домена');
        }

    } catch (error: any) {
        console.error('💥 Ошибка при тестировании:', error.message);
    }
}

if (require.main === module) {
    testTokenAPI().catch(console.error);
} 