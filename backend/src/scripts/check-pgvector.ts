import dotenv from 'dotenv';
import path from 'path';

// Загружаем переменные окружения
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import prisma from '../db/prisma';

async function checkPgvectorSupport() {
  console.log('🔍 Проверяем поддержку pgvector в базе данных...\n');

  try {
    // 1. Проверяем версию PostgreSQL
    console.log('📊 === ШАГ 1: ВЕРСИЯ POSTGRESQL ===');
    const versionResult = await prisma.$queryRaw<Array<{ version: string }>>`SELECT version()`;
    console.log(`PostgreSQL версия: ${versionResult[0].version}\n`);

    // 2. Проверяем доступные расширения
    console.log('🧩 === ШАГ 2: ДОСТУПНЫЕ РАСШИРЕНИЯ ===');
    const availableExtensions = await prisma.$queryRaw<Array<{ name: string; comment: string }>>`
      SELECT name, comment 
      FROM pg_available_extensions 
      WHERE name LIKE '%vector%' OR name LIKE '%embed%'
      ORDER BY name;
    `;
    
    if (availableExtensions.length > 0) {
      console.log('✅ Найдены векторные расширения:');
      availableExtensions.forEach(ext => {
        console.log(`   📦 ${ext.name}: ${ext.comment}`);
      });
    } else {
      console.log('❌ Векторные расширения не найдены');
    }
    console.log('');

    // 3. Проверяем установленные расширения
    console.log('🔧 === ШАГ 3: УСТАНОВЛЕННЫЕ РАСШИРЕНИЯ ===');
    const installedExtensions = await prisma.$queryRaw<Array<{ extname: string; extversion: string }>>`
      SELECT extname, extversion 
      FROM pg_extension 
      WHERE extname LIKE '%vector%' OR extname LIKE '%embed%';
    `;

    if (installedExtensions.length > 0) {
      console.log('✅ Установленные векторные расширения:');
      installedExtensions.forEach(ext => {
        console.log(`   🎯 ${ext.extname} v${ext.extversion}`);
      });
    } else {
      console.log('❌ Векторные расширения не установлены');
    }
    console.log('');

    // 4. Пытаемся установить pgvector (если права позволяют)
    console.log('🚀 === ШАГ 4: ПОПЫТКА УСТАНОВКИ PGVECTOR ===');
    try {
      await prisma.$queryRaw`CREATE EXTENSION IF NOT EXISTS vector`;
      console.log('✅ pgvector успешно установлен/подключен!');
      
      // Проверяем что vector тип работает
      const testResult = await prisma.$queryRaw<Array<{ test: string }>>`
        SELECT '[1,2,3]'::vector as test
      `;
      console.log(`✅ vector тип работает: ${testResult[0].test}`);
      
    } catch (error: any) {
      console.log(`❌ Не удалось установить pgvector: ${error.message}`);
      console.log('💡 Это может быть из-за ограничений managed сервиса');
    }
    console.log('');

    // 5. Проверяем права пользователя
    console.log('👤 === ШАГ 5: ПРАВА ПОЛЬЗОВАТЕЛЯ ===');
    try {
      const userInfo = await prisma.$queryRaw<Array<{ usename: string; usesuper: boolean; usecreatedb: boolean }>>`
        SELECT usename, usesuper, usecreatedb 
        FROM pg_user 
        WHERE usename = current_user;
      `;
      
      const user = userInfo[0];
      console.log(`Текущий пользователь: ${user.usename}`);
      console.log(`Суперпользователь: ${user.usesuper ? '✅' : '❌'}`);
      console.log(`Может создавать БД: ${user.usecreatedb ? '✅' : '❌'}`);
    } catch (error: any) {
      console.log(`❌ Не удалось получить информацию о пользователе: ${error.message}`);
    }

  } catch (error) {
    console.error('❌ Ошибка при проверке:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPgvectorSupport(); 