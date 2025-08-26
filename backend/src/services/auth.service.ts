import prisma from '../db/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Prisma, User } from '@prisma/client';
import { BOT_DEFAULTS } from '../config/bot-defaults';
import { SYSTEM_DEFAULTS } from '../config/system-defaults';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';
if (JWT_SECRET === 'your-super-secret-key') {
    console.warn('WARNING: JWT_SECRET is not set in .env file. Using a default insecure key.');
}

/**
 * Registers a new user.
 * @param data The user data (email, password).
 * @returns The created user.
 */
export const registerUser = async (data: Pick<User, 'email' | 'password' | 'firstName' | 'lastName'>) => {
    const { email, password, firstName, lastName } = data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        throw new Error('User with this email already exists.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: {
            email,
            password: hashedPassword,
            firstName,
            lastName,
        },
    });
    return user;
};

/**
 * Logs in a user.
 * @param data The user credentials (email, password).
 * @returns A JWT token valid for 1 year.
 */
export const loginUser = async (data: Pick<User, 'email' | 'password'>) => {
    const { email, password } = data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        throw new Error('Invalid credentials.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        throw new Error('Invalid credentials.');
    }

    // Всегда выдаем токен на 1 год для удобства пользователей
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '365d' });
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;

    return { token, user: userWithoutPassword };
};

/**
 * Issues a short-lived OpenAI API key for the widget if the hostname is authorized.
 * @param hostname The hostname of the site where the widget is embedded.
 * @returns The OpenAI API key or null if the hostname is not authorized.
 */
export const issueTokenForWidget = async (hostname: string): Promise<{ token: string; instructions: string } | null> => {
    // 1. Find the domain in the database directly.
    const domain = await prisma.domain.findUnique({
        where: { hostname },
        include: { botConfiguration: true },
    });

    // 2. If no domain is found, it's not authorized.
    if (!domain) {
        console.warn(`[Auth] Widget token request denied for unauthorized hostname: ${hostname}`);
        return null;
    }

    // 3. Get the OpenAI key from environment variables.
    const openAIKey = process.env.OPENAI_API_KEY;
    if (!openAIKey) {
        console.error("CRITICAL: OPENAI_API_KEY is not set on the server.");
        throw new Error("Server configuration error.");
    }

    // 4. Get bot configuration, or create it if it doesn't exist.
    let config = domain.botConfiguration;
    if (!config) {
        config = await prisma.botConfiguration.create({
            data: { 
                domainId: domain.id,
                identity: '', // Задается с фронтенда
                task: '', // Задается с фронтенда
                otherDetails: '', // Задается с фронтенда
                instructions: '', // Задается с фронтенда
                demeanor: BOT_DEFAULTS.demeanor,
                tone: BOT_DEFAULTS.tone,
                levelOfEnthusiasm: BOT_DEFAULTS.levelOfEnthusiasm,
                formality: BOT_DEFAULTS.formality,
                levelOfEmotion: BOT_DEFAULTS.levelOfEmotion,
                fillerWords: BOT_DEFAULTS.fillerWords,
                pacing: BOT_DEFAULTS.pacing,
                voice: BOT_DEFAULTS.voice,
                conversationStates: SYSTEM_DEFAULTS.conversationStates,
                editorSettings: SYSTEM_DEFAULTS.editorSettings,
            },
        });
    }

    // 5. Assemble the instructions string.
    const instructions = `
# Personality and Tone
## Identity
${config.identity}
## Task
${config.task}
## Demeanor
${config.demeanor}
## Tone
${config.tone}
## Level of Enthusiasm
${config.levelOfEnthusiasm}
## Level of Formality
${config.formality}
## Level of Emotion
${config.levelOfEmotion}
## Filler Words
${config.fillerWords}
## Pacing
${config.pacing}
## Other details
${config.otherDetails}

# Instructions
${config.instructions}
${
    (config.conversationStates && Array.isArray(config.conversationStates) && config.conversationStates.length > 0)
    ? `\n# Conversation States\n${JSON.stringify(config.conversationStates, null, 2)}`
    : ''
}
`;

    console.log(`[Auth] Issued widget token for hostname: ${hostname}`);
    return { token: openAIKey, instructions };
};

export const changePassword = async (userId: number, oldPass: string, newPass: string) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        // This case should ideally not be reached if auth middleware is used
        throw new Error('User not found.');
    }

    const isPasswordValid = await bcrypt.compare(oldPass, user.password);
    if (!isPasswordValid) {
        throw new Error('Invalid current password.');
    }

    const hashedNewPassword = await bcrypt.hash(newPass, 10);

    await prisma.user.update({
        where: { id: userId },
        data: { password: hashedNewPassword },
    });

    return { message: 'Password updated successfully.' };
}; 