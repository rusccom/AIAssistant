import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';

// Загружаем переменные окружения один раз
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Изменено с text-embedding-3-large на text-embedding-3-small для поддержки HNSW индексов
const EMBEDDING_MODEL = 'text-embedding-3-small'; // 1536 измерений
const EMBEDDING_DIMENSIONS = 1536; // Обновлено с 3072

class OpenAIService {
  /**
   * Создает векторное представление (embedding) для текста
   */
  async createEmbedding(text: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: text,
        encoding_format: 'float'
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('❌ Ошибка создания embedding:', error);
      throw error;
    }
  }

  /**
   * Получает экземпляр OpenAI клиента
   */
  getClient(): OpenAI {
    return openai;
  }

  // Геттеры для конфигурации
  getEmbeddingModel(): string {
    return EMBEDDING_MODEL;
  }

  getEmbeddingDimensions(): number {
    return EMBEDDING_DIMENSIONS;
  }
}

// Экспортируем единственный экземпляр
const openaiService = new OpenAIService();
export default openaiService; 