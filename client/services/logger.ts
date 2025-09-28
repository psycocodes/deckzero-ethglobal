// Logging service with Winston for Flow and ENS transactions
import { createLogger, format, transports, Logger } from 'winston';
import { config, logConfig } from '@/config';

class LoggerService {
  private static instance: LoggerService;
  private logger: Logger;

  private constructor() {
    this.logger = createLogger({
      level: logConfig.level,
      format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.json(),
        format.printf(({ timestamp, level, message, ...meta }) => {
          return JSON.stringify({
            timestamp,
            level,
            message,
            ...meta,
          });
        })
      ),
      defaultMeta: { service: 'deckzero-app' },
      transports: [
        new transports.Console({
          format: format.combine(
            format.colorize(),
            format.simple(),
            format.printf(({ timestamp, level, message, ...meta }) => {
              const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
              return `${timestamp} [${level}]: ${message} ${metaStr}`;
            })
          ),
        }),
      ],
    });

    // Add file transport in production
    if (process.env.NODE_ENV === 'production') {
      this.logger.add(
        new transports.File({
          filename: 'logs/error.log',
          level: 'error',
        })
      );
      this.logger.add(
        new transports.File({
          filename: 'logs/combined.log',
        })
      );
    }
  }

  public static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  // Flow transaction logging
  public logFlowTransaction(action: string, data: any, error?: Error) {
    const logData = {
      category: 'flow_transaction',
      action,
      network: config.flow.network,
      timestamp: new Date().toISOString(),
      ...data,
    };

    if (error) {
      this.logger.error(`Flow Transaction Failed: ${action}`, {
        ...logData,
        error: {
          message: error.message,
          stack: error.stack,
        },
      });
    } else {
      this.logger.info(`Flow Transaction: ${action}`, logData);
    }
  }

  // ENS transaction logging
  public logENSTransaction(action: string, data: any, error?: Error) {
    const logData = {
      category: 'ens_transaction',
      action,
      network: config.ethereum.network,
      timestamp: new Date().toISOString(),
      ...data,
    };

    if (error) {
      this.logger.error(`ENS Transaction Failed: ${action}`, {
        ...logData,
        error: {
          message: error.message,
          stack: error.stack,
        },
      });
    } else {
      this.logger.info(`ENS Transaction: ${action}`, logData);
    }
  }

  // Game event logging
  public logGameEvent(action: string, data: any, error?: Error) {
    const logData = {
      category: 'game_event',
      action,
      timestamp: new Date().toISOString(),
      ...data,
    };

    if (error) {
      this.logger.error(`Game Event Failed: ${action}`, {
        ...logData,
        error: {
          message: error.message,
          stack: error.stack,
        },
      });
    } else {
      this.logger.info(`Game Event: ${action}`, logData);
    }
  }

  // Web3Auth logging
  public logAuth(action: string, data: any, error?: Error) {
    const logData = {
      category: 'authentication',
      action,
      timestamp: new Date().toISOString(),
      // Remove sensitive data
      userId: data.userId,
      provider: data.provider,
      method: data.method,
    };

    if (error) {
      this.logger.error(`Auth Failed: ${action}`, {
        ...logData,
        error: {
          message: error.message,
          stack: error.stack,
        },
      });
    } else {
      this.logger.info(`Auth: ${action}`, logData);
    }
  }

  // API logging
  public logAPI(method: string, endpoint: string, data: any, error?: Error) {
    const logData = {
      category: 'api',
      method,
      endpoint,
      timestamp: new Date().toISOString(),
      requestId: data.requestId,
      userId: data.userId,
      statusCode: data.statusCode,
    };

    if (error) {
      this.logger.error(`API Error: ${method} ${endpoint}`, {
        ...logData,
        error: {
          message: error.message,
          stack: error.stack,
        },
      });
    } else {
      this.logger.info(`API: ${method} ${endpoint}`, logData);
    }
  }

  // General logging methods
  public info(message: string, meta?: any) {
    this.logger.info(message, meta);
  }

  public error(message: string, error?: Error, meta?: any) {
    this.logger.error(message, {
      ...meta,
      error: error ? {
        message: error.message,
        stack: error.stack,
      } : undefined,
    });
  }

  public warn(message: string, meta?: any) {
    this.logger.warn(message, meta);
  }

  public debug(message: string, meta?: any) {
    this.logger.debug(message, meta);
  }
}

// Export singleton instance
export const logger = LoggerService.getInstance();
export default logger;