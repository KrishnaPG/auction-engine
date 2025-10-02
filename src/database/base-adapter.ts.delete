// Base Database Adapter Implementation

import { createTimestamp } from "../types/branded-constructors";
import type { TTimestamp } from "../types/branded-types";
import type {
	ConnectionError,
	DatabaseConfiguration,
	DatabaseError,
	DatabaseHealth,
	DatabaseMetrics,
	IDatabaseAdapter,
	IQueryMetrics,
	ITransaction,
	QueryError,
} from "./interfaces";

/**
 * Base implementation of database adapter with common functionality
 * Provides metrics collection, error handling, and health checking
 */
export abstract class BaseDatabaseAdapter implements IDatabaseAdapter {
	protected config: DatabaseConfiguration;
	protected connected: boolean = false;
	protected metrics: IQueryMetrics;
	protected lastError?: Error;

	constructor(config: DatabaseConfiguration, metrics?: IQueryMetrics) {
		this.config = config;
		this.metrics = metrics || new DefaultQueryMetrics();
	}

	public abstract connect(): Promise<void>;
	public abstract disconnect(): Promise<void>;
	public abstract query<T = any>(
		sql: string,
		params?: readonly any[],
	): Promise<readonly T[]>;
	public abstract queryOne<T = any>(
		sql: string,
		params?: readonly any[],
	): Promise<T | null>;
	public abstract queryValue<T = any>(
		sql: string,
		params?: readonly any[],
	): Promise<T>;
	public abstract beginTransaction(): Promise<ITransaction>;
	public abstract executeInTransaction<T>(
		operation: (tx: ITransaction) => Promise<T>,
	): Promise<T>;

	public isConnected(): boolean {
		return this.connected;
	}

	public async migrate(): Promise<void> {
		throw new Error("Migration not implemented by base adapter");
	}

	public async rollback(steps: number): Promise<void> {
		throw new Error("Rollback not implemented by base adapter");
	}

	public async healthCheck(): Promise<DatabaseHealth> {
		const startTime = Date.now();

		try {
			await this.queryOne("SELECT 1");
			const responseTime = Date.now() - startTime;

			return {
				isHealthy: true,
				responseTime,
				activeConnections: await this.getActiveConnectionCount(),
				timestamp: createTimestamp(Date.now()),
			};
		} catch (error) {
			const responseTime = Date.now() - startTime;
			this.lastError = error as Error;

			return {
				isHealthy: false,
				responseTime,
				activeConnections: 0,
				lastError: error instanceof Error ? error.message : "Unknown error",
				timestamp: createTimestamp(Date.now()),
				errors: [error instanceof Error ? error.message : "Unknown error"],
			};
		}
	}

	public getConfig(): DatabaseConfiguration {
		return this.config;
	}

	public getMetrics(): DatabaseMetrics {
		return this.metrics.getMetrics();
	}

	public getLastError(): Error | undefined {
		return this.lastError;
	}

	protected abstract getActiveConnectionCount(): Promise<number>;

	protected handleQueryError(
		error: Error,
		sql: string,
		params?: readonly any[],
	): DatabaseError {
		const queryError: QueryError = Object.assign(new Error(error.message), {
			name: 'QueryError',
			code: error.name,
			query: sql,
			params: params || [],
			severity: this.determineErrorSeverity(error),
		});

		this.lastError = queryError;
		return queryError;
	}

	protected handleConnectionError(error: Error): DatabaseError {
		const connectionError: ConnectionError = Object.assign(new Error(error.message), {
			name: 'ConnectionError',
			code: error.name,
			severity: 'high' as const,
		});

		this.lastError = connectionError;
		return connectionError;
	}

	private determineErrorSeverity(
		error: Error,
	): "low" | "medium" | "high" | "critical" {
		const message = error.message.toLowerCase();

		if (message.includes("connection") || message.includes("timeout")) {
			return "high";
		}

		if (message.includes("syntax") || message.includes("constraint")) {
			return "medium";
		}

		if (message.includes("deadlock") || message.includes("serialization")) {
			return "critical";
		}

		return "low";
	}

	protected validateSQL(sql: string): void {
		if (!sql || sql.trim().length === 0) {
			throw new Error("SQL query cannot be empty");
		}

		// Basic SQL injection prevention
		const dangerousPatterns = [
			/(\bUNION\b.*\bSELECT\b)/i,
			/(\bDROP\b.*\bTABLE\b)/i,
			/(\bDELETE\b.*\bFROM\b.*\bWHERE\b.*\b1\s*=\s*1)/i,
			/(\bUPDATE\b.*\bSET\b.*\bWHERE\b.*\b1\s*=\s*1)/i,
		];

		for (const pattern of dangerousPatterns) {
			if (pattern.test(sql)) {
				throw new Error("Potentially dangerous SQL pattern detected");
			}
		}
	}

	protected sanitizeParams(params?: readonly any[]): readonly any[] {
		if (!params) return [];

		return params.map((param) => {
			if (param === null || param === undefined) {
				return null;
			}

			if (typeof param === "object" && param instanceof Date) {
				return param.toISOString();
			}

			return param;
		});
	}
}

/**
 * Default implementation of query metrics
 */
class DefaultQueryMetrics implements IQueryMetrics {
	private queries: Array<{
		sql: string;
		duration: number;
		success: boolean;
		timestamp: number;
	}> = [];
	private maxHistorySize = 1000;

	recordQuery(sql: string, duration: number, success: boolean): void {
		this.queries.push({
			sql: sql.substring(0, 100), // Truncate for storage
			duration,
			success,
			timestamp: Date.now(),
		});

		// Keep only recent queries
		if (this.queries.length > this.maxHistorySize) {
			this.queries = this.queries.slice(-this.maxHistorySize);
		}
	}

	getMetrics(): DatabaseMetrics {
		const now = Date.now();
		const recentQueries = this.queries.filter((q) => now - q.timestamp < 60000); // Last minute

		if (recentQueries.length === 0) {
			return {
				queriesPerSecond: 0,
				averageQueryTime: 0,
				slowQueries: 0,
				connectionCount: 0,
				errorRate: 0,
				timestamp: createTimestamp(now),
			};
		}

		const totalDuration = recentQueries.reduce((sum, q) => sum + q.duration, 0);
		const successfulQueries = recentQueries.filter((q) => q.success);
		const slowQueries = recentQueries.filter((q) => q.duration > 1000); // > 1 second

		return {
			queriesPerSecond: recentQueries.length / 60,
			averageQueryTime: totalDuration / recentQueries.length,
			slowQueries: slowQueries.length,
			connectionCount: 0, // Would need to be provided by specific adapter
			errorRate:
				(recentQueries.length - successfulQueries.length) /
				recentQueries.length,
			timestamp: createTimestamp(now),
		};
	}

	reset(): void {
		this.queries = [];
	}
}

/**
 * Base transaction implementation
 */
export abstract class BaseTransaction implements ITransaction {
	protected active: boolean = true;

	constructor() {}

	public abstract query<T = any>(
		sql: string,
		params?: readonly any[],
	): Promise<readonly T[]>;
	public abstract queryOne<T = any>(
		sql: string,
		params?: readonly any[],
	): Promise<T | null>;
	public abstract commit(): Promise<void>;
	public abstract rollback(): Promise<void>;

	public isActive(): boolean {
		return this.active;
	}

	protected validateActive(): void {
		if (!this.active) {
			throw new Error("Transaction is no longer active");
		}
	}

	protected markInactive(): void {
		this.active = false;
	}
}
