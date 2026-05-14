export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export class Logger {
  private static level: LogLevel = LogLevel.DEBUG;
  private static logs: { timestamp: string, level: string, message: string, data?: any }[] = [];

  private static formatTime(): string {
    const d = new Date();
    return d.toISOString();
  }

  private static log(level: LogLevel, levelName: string, message: string, data?: any) {
    if (level < this.level) return;

    const entry = {
      timestamp: this.formatTime(),
      level: levelName,
      message,
      data
    };
    
    this.logs.push(entry);
    
    // Keep only last 1000 logs to prevent memory leaks
    if (this.logs.length > 1000) {
      this.logs.shift();
    }

    const prefix = `[ScrollToPrompt] [${levelName}]`;
    if (data !== undefined) {
      if (level === LogLevel.ERROR) console.error(prefix, message, data);
      else if (level === LogLevel.WARN) console.warn(prefix, message, data);
      else if (level === LogLevel.INFO) console.info(prefix, message, data);
      else console.debug(prefix, message, data);
    } else {
      if (level === LogLevel.ERROR) console.error(prefix, message);
      else if (level === LogLevel.WARN) console.warn(prefix, message);
      else if (level === LogLevel.INFO) console.info(prefix, message);
      else console.debug(prefix, message);
    }
  }

  public static debug(message: string, data?: any) { this.log(LogLevel.DEBUG, 'DEBUG', message, data); }
  public static info(message: string, data?: any) { this.log(LogLevel.INFO, 'INFO', message, data); }
  public static warn(message: string, data?: any) { this.log(LogLevel.WARN, 'WARN', message, data); }
  public static error(message: string, data?: any) { this.log(LogLevel.ERROR, 'ERROR', message, data); }

  public static getLogs() {
    return this.logs;
  }

  public static downloadLogs() {
    const blob = new Blob([JSON.stringify(this.logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scrolltoprompt_logs_${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  public static setupGlobalAccess() {
    if (typeof window !== 'undefined') {
      (window as any).__STP_LOGGER__ = this;
      this.info('Logger initialized. Access logs via window.__STP_LOGGER__.getLogs() or download them using window.__STP_LOGGER__.downloadLogs()');
    }
  }
}
