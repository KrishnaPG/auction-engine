// Database Abstraction Layer Interfaces

import type {
	TAuctionId,
	TBidId,
	TTimestamp,
	TUserId,
} from "../types/branded-types";

// Database Configuration Types
export interface DatabaseConfig {
	readonly host: string;
	readonly port: number;
	readonly database: string;
	readonly username: string;
	readonly password: string;
	readonly ssl?: boolean;
	readonly connectionTimeout?: number;
	readonly queryTimeout?: number;
}

export interface PostgreSQLConfig extends DatabaseConfig {
	readonly type: "postgresql";
	readonly poolOptions?: {
		readonly min?: number;
		readonly max?: number;
		readonly acquireTimeout?: number;
		readonly idleTimeout?: number;
		readonly evictionInterval?: number;
	};
}

export interface MySQLConfig extends DatabaseConfig {
	readonly type: "mysql";
	readonly poolOptions?: {
		readonly min?: number;
		readonly max?: number;
		readonly acquireTimeout?: number;
		readonly idleTimeout?: number;
	};
}

export interface SQLiteConfig {
	readonly type: "sqlite";
	readonly databasePath: string;
	readonly readonly?: boolean;
	readonly timeout?: number;
}

export type DatabaseConfiguration =
	| PostgreSQLConfig
	| MySQLConfig
	| SQLiteConfig;

// Outbox Repository for events
export interface IOutboxRepository {
	saveEvent(event: {
		type: string;
		payload: any;
		idempotencyKey?: string;
		timestamp: TTimestamp;
	}): Promise<void>;

	findByIdempotency(key: string): Promise<any | null>;
}

// Core Database Interfaces

export interface IDatabaseAdapter {
	connect(): Promise<void>;
	disconnect(): Promise<void>;
	isConnected(): boolean;

	// Query Operations
	query<T = any>(sql: string, params?: readonly any[]): Promise<readonly T[]>;
	queryOne<T = any>(sql: string, params?: readonly any[]): Promise<T | undefined | null>;
	queryValue<T = any>(sql: string, params?: readonly any[]): Promise<T>;

	// Transaction Management
	beginTransaction(): Promise<ITransaction>;
	executeInTransaction<T>(
		operation: (tx: ITransaction) => Promise<T>,
	): Promise<T>;

	// Schema Operations
	migrate(): Promise<void>;
	rollback(steps: number): Promise<void>;

	// Health Check
	healthCheck(): Promise<DatabaseHealth>;

	// Configuration
	getConfig(): DatabaseConfiguration;

	// Drizzle-specific (optional for other adapters)
	getDrizzle?(): ReturnType<typeof import("drizzle-orm/node-postgres").drizzle>;
}

export interface ITransaction {
	query<T = any>(sql: string, params?: readonly any[]): Promise<T[]>;
	queryOne<T = any>(sql: string, params?: readonly any[]): Promise<T | null>;
	insert(table: any): { values(data: any): Promise<any> };
	update(table: any): { set(data: any): { where(condition: any): Promise<void> } };
	commit(): Promise<void>;
	rollback(): Promise<void>;
	isActive(): boolean;
}

// Connection Pool Interface

export interface IConnectionPool {
	getConnection(): Promise<IConnection>;
	releaseConnection(connection: IConnection): Promise<void>;
	getPoolStats(): PoolStats;
	close(): Promise<void>;
}

export interface IConnection {
	query<T = any>(sql: string, params?: readonly any[]): Promise<readonly T[]>;
	queryOne<T = any>(sql: string, params?: readonly any[]): Promise<T | null>;
	beginTransaction(): Promise<ITransaction>;
	close(): Promise<void>;
	isOpen(): boolean;
}

// Query Builder Interface

export interface IQueryBuilder {
	select(fields?: string | string[]): ISelectQueryBuilder;
	insert(table: string): IInsertQueryBuilder;
	update(table: string): IUpdateQueryBuilder;
	delete(table: string): IDeleteQueryBuilder;
}

export interface ISelectQueryBuilder {
	from(table: string): ISelectQueryBuilder;
	where(condition: string, params?: readonly any[]): ISelectQueryBuilder;
	whereIn(field: string, values: readonly any[]): ISelectQueryBuilder;
	whereBetween(field: string, min: any, max: any): ISelectQueryBuilder;
	orderBy(field: string, direction?: "ASC" | "DESC"): ISelectQueryBuilder;
	limit(count: number): ISelectQueryBuilder;
	offset(count: number): ISelectQueryBuilder;
	join(
		table: string,
		condition: string,
		type?: "INNER" | "LEFT" | "RIGHT" | "FULL",
	): ISelectQueryBuilder;
	groupBy(fields: string | string[]): ISelectQueryBuilder;
	having(condition: string, params?: readonly any[]): ISelectQueryBuilder;
	toSQL(): { sql: string; params: readonly any[] };
}

export interface IInsertQueryBuilder {
	values(data: Record<string, any>): IInsertQueryBuilder;
	toSQL(): { sql: string; params: readonly any[] };
}

export interface IUpdateQueryBuilder {
	set(data: Record<string, any>): IUpdateQueryBuilder;
	where(condition: string, params?: readonly any[]): IUpdateQueryBuilder;
	toSQL(): { sql: string; params: readonly any[] };
}

export interface IDeleteQueryBuilder {
	where(condition: string, params?: readonly any[]): IDeleteQueryBuilder;
	toSQL(): { sql: string; params: readonly any[] };
}

// Migration Interface

export interface IMigrationManager {
	migrate(): Promise<void>;
	rollback(steps: number): Promise<void>;
	getCurrentVersion(): Promise<number>;
	getAvailableMigrations(): Promise<readonly string[]>;
	validateMigrations(): Promise<MigrationValidation>;
}

export interface Migration {
	readonly id: string;
	readonly name: string;
	readonly up: (adapter: IDatabaseAdapter) => Promise<void>;
	readonly down: (adapter: IDatabaseAdapter) => Promise<void>;
	readonly dependencies?: readonly string[];
}

export interface MigrationValidation {
	readonly isValid: boolean;
	readonly errors: readonly string[];
	readonly warnings: readonly string[];
}

// Health Check Interface

export interface DatabaseHealth {
	readonly isHealthy: boolean;
	readonly responseTime: number;
	readonly activeConnections: number;
	readonly poolStats?: PoolStats;
	readonly lastError?: string;
	readonly timestamp: TTimestamp;
	readonly errors?: readonly string[];
}

// Pool Statistics

export interface PoolStats {
	readonly totalConnections: number;
	readonly activeConnections: number;
	readonly idleConnections: number;
	readonly waitingRequests: number;
	readonly averageWaitTime: number;
	readonly averageQueryTime: number;
}

// Error Types

export interface DatabaseError extends Error {
	readonly code: string;
	readonly sqlState?: string;
	readonly severity: "low" | "medium" | "high" | "critical";
	readonly query?: string;
	readonly params?: readonly any[];
}

export interface ConnectionError extends DatabaseError {
	readonly connectionId?: string;
}

export interface QueryError extends DatabaseError {
	readonly query: string;
	readonly params: readonly any[];
	readonly executionTime?: number;
}

export interface TransactionError extends DatabaseError {
	readonly transactionId?: string;
	readonly isolationLevel?: string;
}

// Configuration Validation

export interface DatabaseConfigValidation {
	readonly isValid: boolean;
	readonly errors: readonly string[];
	readonly warnings: readonly string[];
}

// Monitoring and Metrics

export interface DatabaseMetrics {
	readonly queriesPerSecond: number;
	readonly averageQueryTime: number;
	readonly slowQueries: number;
	readonly connectionCount: number;
	readonly errorRate: number;
	readonly cacheHitRate?: number;
	readonly timestamp: TTimestamp;
}

export interface IQueryMetrics {
	recordQuery(sql: string, duration: number, success: boolean): void;
	getMetrics(): DatabaseMetrics;
	reset(): void;
}

// Type Mapping for Database Results

export interface DatabaseTypeMap {
	readonly string: string;
	readonly number: number;
	readonly boolean: boolean;
	readonly date: Date;
	readonly timestamp: TTimestamp;
	readonly json: any;
	readonly uuid: string;
}

export interface FieldMapping {
	readonly fieldName: string;
	readonly columnName: string;
	readonly type: keyof DatabaseTypeMap;
	readonly nullable?: boolean;
	readonly transform?: (value: any) => any;
}

// Result Set Interface

export interface QueryResult<T = any> {
	readonly rows: readonly T[];
	readonly rowCount: number;
	readonly duration: number;
	readonly fields?: readonly string[];
}

export interface SingleQueryResult<T = any> {
	readonly row: T | null;
	readonly duration: number;
}

// Prepared Statement Interface

export interface IPreparedStatement {
	execute(params?: readonly any[]): Promise<QueryResult>;
	executeOne(params?: readonly any[]): Promise<SingleQueryResult>;
	close(): Promise<void>;
}

// Batch Operations

export interface IBatchOperation {
	addQuery(sql: string, params?: readonly any[]): void;
	addQueryOne(sql: string, params?: readonly any[]): void;
	execute(): Promise<BatchResult>;
}

export interface BatchResult {
	readonly results: readonly QueryResult[];
	readonly totalDuration: number;
	readonly successCount: number;
	readonly errorCount: number;
	readonly errors?: readonly QueryError[];
}
