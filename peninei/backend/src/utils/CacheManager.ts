// import winston from "winst/on/lib/winston/config";
import { createLogger } from "../logger.js";
import type { Logger } from "winston";

type CacheReturnType<T> = Promise<T | undefined>;
type CacheSetter<T, K = string> = (key: K) => CacheReturnType<T>;

type CacheValue<T> = {
    value: T;
    timestamp: number;
};

export class CacheManager<T, K = string> {
    private cache: Map<string, CacheValue<T>> = new Map();

    private setter: CacheSetter<T, K>;
    private timeout: number;
    private logString: string;
    private logger: Logger;

    constructor(setter: CacheSetter<T, K>, timeout: number, logString: string) {
        this.setter = setter;
        this.timeout = timeout;
        this.logString = logString;
        this.logger = createLogger(this.logString);
    }

    private normalizeKey(key: K): string {
        // Convert Date objects to ISO string for consistent cache keys
        if (key instanceof Date) {
            return key.toISOString();
        } else if (typeof key === "object") {
            return JSON.stringify(key);
        }

        return String(key);
    }

    public async get(key: K): CacheReturnType<T> {
        const normalizedKey = this.normalizeKey(key);
        this.logger.debug(
            "Current cache keys: " + Array.from(this.cache.keys())
        );
        const cachedValue = this.cache.get(normalizedKey);
        this.logger.debug(`Getting cache for key: ${normalizedKey}`);
        if (cachedValue) {
            this.logger.debug(`Cache hit for key: ${normalizedKey}`);
            if (Date.now() - cachedValue.timestamp < this.timeout) {
                return cachedValue.value;
            }
            this.logger.debug(`Cache expired for key: ${normalizedKey}`);
            this.cache.delete(normalizedKey);
        }
        this.logger.debug(`Cache miss for key: ${normalizedKey}`);
        const value = await this.setter(key);
        this.cache.set(normalizedKey, { value, timestamp: Date.now() });
        return value;
    }
}
