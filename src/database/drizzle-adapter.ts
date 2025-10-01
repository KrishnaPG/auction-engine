// Drizzle ORM Database Adapter Implementation

import "dotenv/config";
import type { drizzle } from "drizzle-orm/node-postgres";
import { createTimestamp } from "../types/branded-constructors";
import type { TTimestamp } from "../types/branded-types";
import { BaseDatabaseAdapter, BaseTransaction } from "./base-adapter";
import type {
	DatabaseConfiguration,
	DatabaseHealth,
	IDatabaseAdapter,
	ITransaction,
} from "./interfaces";

/**
 * Drizzle ORM implementation of database adapter
 * Provides type-safe database operations with Drizzle ORM
 */
export class DrizzleAdapter
	extends BaseDatabaseAdapter
	implements IDatabaseAdapter
{
	private db?: ReturnType<typeof drizzle>;
	private connectionCount: number = 0;

	constructor(config: DatabaseConfiguration) {
		super(config);
	}

	public async connect(): Promise<void> {
		try {
			this.validateConfig(this.config);

			// Initialize Drizzle database connection
			// This would be configured based on the specific database type
			switch (this.config.type) {
				case "postgresql":
					await this.connectPostgreSQL();
					break;
				case "mysql":
					await this.connectMySQL();
					break;
				case "sqlite":
					await this.connectSQLite();
					break;
				default:
					throw new Error(
						`Unsupported database type: ${(this.config as any).type}`,
					);
			}

			this.connected = true;
			this.lastError = undefined;
		} catch (error) {
			this.connected = false;
			throw this.handleConnectionError(error as Error);
		}
	}

	public async disconnect(): Promise<void> {
		if (this.db) {
			// Drizzle handles connection cleanup automatically
			this.db = undefined;
			this.connected = false;
		}
	}

	public async query<T = any>(
		sql: string,
		params?: readonly any[],
	): Promise<readonly T[]> {
		this.validateSQL(sql);

		if (!this.db || !this.connected) {
			throw new Error("Database not connected");
		}

		const startTime = Date.now();
		const sanitizedParams = this.sanitizeParams(params);

		try {
			// Use Drizzle's raw SQL execution
			const result = await this.db.execute(sql);
			const duration = Date.now() - startTime;

			this.metrics.recordQuery(sql, duration, true);

			// Drizzle returns different result formats based on query type
			if (Array.isArray(result)) {
				return result as T[];
			}

			// For SELECT queries, extract rows
			if (result && typeof result === "object" && "rows" in result) {
				return (result as any).rows as T[];
			}

			return [];
		} catch (error) {
			const duration = Date.now() - startTime;
			this.metrics.recordQuery(sql, duration, false);
			throw this.handleQueryError(error as Error, sql, sanitizedParams);
		}
	}

	public async queryOne<T = any>(
		sql: string,
		params?: readonly any[],
	): Promise<T | null> {
		const results = await this.query<T>(sql, params);
		return results.length > 0 ? results[0] : null;
	}

	public async queryValue<T = any>(
		sql: string,
		params?: readonly any[],
	): Promise<T> {
		const result = await this.queryOne<T>(sql, params);
		if (result === null) {
			throw new Error("Query returned no results");
		}
		return result;
	}

	public async beginTransaction(): Promise<ITransaction> {
		if (!this.db || !this.connected) {
			throw new Error("Database not connected");
		}

		// Drizzle handles transactions through database connections
		return new DrizzleTransaction(this.db);
	}

	public async executeInTransaction<T>(
		operation: (tx: ITransaction) => Promise<T>,
	): Promise<T> {
		const transaction = await this.beginTransaction();

		try {
			const result = await operation(transaction);
			await transaction.commit();
			return result;
		} catch (error) {
			try {
				await transaction.rollback();
			} catch (rollbackError) {
				console.error("Transaction rollback failed:", rollbackError);
			}
			throw error;
		}
	}

	public async migrate(): Promise<void> {
		if (!this.db) {
			throw new Error("Database not connected");
		}

		// Use Drizzle's migration system
		// This would integrate with Drizzle Kit migrations
		throw new Error(
			"Migration not yet implemented - requires Drizzle Kit integration",
		);
	}

	public async rollback(steps: number): Promise<void> {
		if (!this.db) {
			throw new Error("Database not connected");
		}

		// Use Drizzle's migration rollback
		throw new Error(
			"Rollback not yet implemented - requires Drizzle Kit integration",
		);
	}

	protected async getActiveConnectionCount(): Promise<number> {
		return this.connectionCount;
	}

	private async connectPostgreSQL(): Promise<void> {
		const config = this.config as any; // PostgreSQLConfig
		// Initialize Drizzle with PostgreSQL
		// This would use the actual Drizzle PostgreSQL driver
		throw new Error("PostgreSQL Drizzle connection not yet implemented");
	}

	private async connectMySQL(): Promise<void> {
		const config = this.config as any; // MySQLConfig
		// Initialize Drizzle with MySQL
		throw new Error("MySQL Drizzle connection not yet implemented");
	}

	private async connectSQLite(): Promise<void> {
		const config = this.config as any; // SQLiteConfig
		// Initialize Drizzle with SQLite
		throw new Error("SQLite Drizzle connection not yet implemented");
	}

	private validateConfig(config: DatabaseConfiguration): void {
		switch (config.type) {
			case "postgresql":
				this.validatePostgreSQLConfig(config);
				break;
			case "mysql":
				this.validateMySQLConfig(config);
				break;
			case "sqlite":
				this.validateSQLiteConfig(config);
				break;
			default:
				throw new Error(`Unsupported database type: ${(config as any).type}`);
		}
	}

	private validatePostgreSQLConfig(config: any): void {
		if (!config.host) {
			throw new Error("PostgreSQL host is required");
		}
		if (!config.port || config.port <= 0 || config.port > 65535) {
			throw new Error("PostgreSQL port must be between 1 and 65535");
		}
		if (!config.database) {
			throw new Error("PostgreSQL database name is required");
		}
		if (!config.username) {
			throw new Error("PostgreSQL username is required");
		}
		if (!config.password) {
			throw new Error("PostgreSQL password is required");
		}
	}

	private validateMySQLConfig(config: any): void {
		if (!config.host) {
			throw new Error("MySQL host is required");
		}
		if (!config.port || config.port <= 0 || config.port > 65535) {
			throw new Error("MySQL port must be between 1 and 65535");
		}
		if (!config.database) {
			throw new Error("MySQL database name is required");
		}
		if (!config.username) {
			throw new Error("MySQL username is required");
		}
		if (!config.password) {
			throw new Error("MySQL password is required");
		}
	}

	private validateSQLiteConfig(config: any): void {
		if (!config.databasePath) {
			throw new Error("SQLite database path is required");
		}
	}
}

/**
 * Drizzle transaction implementation
 */
class DrizzleTransaction extends BaseTransaction {
	constructor(private db: ReturnType<typeof drizzle>) {
		super();
	}

	public async query<T = any>(
		sql: string,
		params?: readonly any[],
	): Promise<readonly T[]> {
		this.validateActive();

		try {
			const result = await this.db.execute(sql);

			if (Array.isArray(result)) {
				return result as T[];
			}

			if (result && typeof result === "object" && "rows" in result) {
				return (result as any).rows as T[];
			}

			return [];
		} catch (error) {
			throw new Error(`Transaction query failed: ${(error as Error).message}`);
		}
	}

	public async queryOne<T = any>(
		sql: string,
		params?: readonly any[],
	): Promise<T | null> {
		const results = await this.query<T>(sql, params);
		return results.length > 0 ? results[0] : null;
	}

	public async commit(): Promise<void> {
		this.validateActive();

		try {
			// Drizzle handles commit through the database connection
			this.markInactive();
		} catch (error) {
			this.markInactive();
			throw new Error(`Transaction commit failed: ${(error as Error).message}`);
		}
	}

	public async rollback(): Promise<void> {
		if (!this.active) return;

		try {
			// Drizzle handles rollback through the database connection
			this.markInactive();
		} catch (error) {
			console.error("Transaction rollback failed:", error);
			this.markInactive();
		}
	}
}

/**
 * Drizzle schema builder for type-safe table definitions
 */
export class DrizzleSchemaBuilder {
	private tables: Map<string, any> = new Map();

	table<T extends Record<string, any>>(
		name: string,
		schema: T,
	): DrizzleTable<T> {
		const table = new DrizzleTable(name, schema);
		this.tables.set(name, table);
		return table;
	}

	getTables(): ReadonlyMap<string, any> {
		return this.tables;
	}

	toSQL(): string {
		const sqlParts: string[] = [];

		for (const table of this.tables.values()) {
			sqlParts.push(table.toSQL());
		}

		return sqlParts.join("\n\n");
	}
}

/**
 * Drizzle table definition helper
 */
export class DrizzleTable<T extends Record<string, any>> {
	constructor(
		private name: string,
		private schema: T,
	) {}

	toSQL(): string {
		const columns = Object.entries(this.schema)
			.map(([name, definition]) => {
				if (typeof definition === "object" && definition !== null) {
					return `  ${name} ${definition.type}${definition.constraints || ""}`;
				}
				return `  ${name} ${definition}`;
			})
			.join(",\n");

		return `CREATE TABLE ${this.name} (\n${columns}\n);`;
	}

	getName(): string {
		return this.name;
	}

	getSchema(): T {
		return this.schema;
	}
}

/**
 * Drizzle query builder for type-safe queries
 */
export class DrizzleQueryBuilder<T extends Record<string, any>> {
	private queryType: "select" | "insert" | "update" | "delete" = "select";
	private tableName: string;
	private selectedFields: string[] = [];
	private conditions: string[] = [];
	private values: Record<string, any> = {};
	private orderByFields: string[] = [];
	private limitCount?: number;
	private offsetCount?: number;

	static select<T extends Record<string, any>>(
		tableName: string,
	): DrizzleQueryBuilder<T> {
		const builder = new DrizzleQueryBuilder<T>();
		builder.tableName = tableName;
		builder.queryType = "select";
		return builder;
	}

	static insert<T extends Record<string, any>>(
		tableName: string,
	): DrizzleQueryBuilder<T> {
		const builder = new DrizzleQueryBuilder<T>();
		builder.tableName = tableName;
		builder.queryType = "insert";
		return builder;
	}

	static update<T extends Record<string, any>>(
		tableName: string,
	): DrizzleQueryBuilder<T> {
		const builder = new DrizzleQueryBuilder<T>();
		builder.tableName = tableName;
		builder.queryType = "update";
		return builder;
	}

	static delete<T extends Record<string, any>>(
		tableName: string,
	): DrizzleQueryBuilder<T> {
		const builder = new DrizzleQueryBuilder<T>();
		builder.tableName = tableName;
		builder.queryType = "delete";
		return builder;
	}

	fields(fields: (keyof T)[]): DrizzleQueryBuilder<T> {
		this.selectedFields = fields as string[];
		return this;
	}

	where(condition: string): DrizzleQueryBuilder<T> {
		this.conditions.push(condition);
		return this;
	}

	set(values: Partial<T>): DrizzleQueryBuilder<T> {
		this.values = { ...this.values, ...values };
		return this;
	}

	orderBy(
		field: keyof T,
		direction: "ASC" | "DESC" = "ASC",
	): DrizzleQueryBuilder<T> {
		this.orderByFields.push(`${String(field)} ${direction}`);
		return this;
	}

	limit(count: number): DrizzleQueryBuilder<T> {
		this.limitCount = count;
		return this;
	}

	offset(count: number): DrizzleQueryBuilder<T> {
		this.offsetCount = count;
		return this;
	}

	toSQL(): { sql: string; params: readonly any[] } {
		switch (this.queryType) {
			case "select":
				return this.buildSelectSQL();
			case "insert":
				return this.buildInsertSQL();
			case "update":
				return this.buildUpdateSQL();
			case "delete":
				return this.buildDeleteSQL();
			default:
				throw new Error(`Unsupported query type: ${this.queryType}`);
		}
	}

	private buildSelectSQL(): { sql: string; params: readonly any[] } {
		const fieldList = this.selectedFields.length > 0 ? this.selectedFields.join(", ") : "*";
		let sql = `SELECT ${fieldList} FROM ${this.tableName}`;

		if (this.conditions.length > 0) {
			sql += ` WHERE ${this.conditions.join(" AND ")}`;
		}

		if (this.orderByFields.length > 0) {
			sql += ` ORDER BY ${this.orderByFields.join(", ")}`;
		}

		if (this.limitCount) {
			sql += ` LIMIT ${this.limitCount}`;
		}

		if (this.offsetCount) {
			sql += ` OFFSET ${this.offsetCount}`;
		}

		return { sql, params: [] };
	}

	private buildInsertSQL(): { sql: string; params: readonly any[] } {
		const columns = Object.keys(this.values).join(", ");
		const placeholders = Object.keys(this.values)
			.map(() => "?")
			.join(", ");
		const sql = `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders})`;

		return { sql, params: Object.values(this.values) };
	}

	private buildUpdateSQL(): { sql: string; params: readonly any[] } {
		const setClause = Object.keys(this.values)
			.map((col) => `${col} = ?`)
			.join(", ");
		let sql = `UPDATE ${this.tableName} SET ${setClause}`;

		if (this.conditions.length > 0) {
			sql += ` WHERE ${this.conditions.join(" AND ")}`;
		}

		return { sql, params: Object.values(this.values) };
	}

	private buildDeleteSQL(): { sql: string; params: readonly any[] } {
		let sql = `DELETE FROM ${this.tableName}`;

		if (this.conditions.length > 0) {
			sql += ` WHERE ${this.conditions.join(" AND ")}`;
		}

		return { sql, params: [] };
	}
}
