import pino from 'pino';
import dotenv from 'dotenv';

dotenv.config();

const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV !== 'production' ? {
        target: 'pino-pretty',
        options: { colorize: true }
    } : undefined,
});

export default logger;