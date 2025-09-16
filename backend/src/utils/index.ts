/**
 * Barrel exports для backend утилит
 * Упрощает импорты: import { logger, sendSuccess, validateSchema } from '../utils'
 */

// Logger
export * from './logger';

// Response helpers
export * from './response';

// Validation
export * from './validation';

// Error handling (selective export to avoid ValidationError conflict)
export { 
    AppError, 
    AuthenticationError, 
    AuthorizationError, 
    NotFoundError,
    handlePrismaError,
    errorHandler,
    catchAsync,
    notFoundHandler,
    validateDomainAccess,
    requireFields,
    safeParseInt
} from './error-handler';
