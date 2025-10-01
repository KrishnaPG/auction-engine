// Database Abstraction Layer Exports

// Base adapter implementation
export * from "./base-adapter";
// Database-specific adapters
export * from "./drizzle-adapter";
export {
	DrizzleAdapter,
	DrizzleQueryBuilder,
	DrizzleSchemaBuilder,
	DrizzleTable,
} from "./drizzle-adapter";

// Re-export commonly used types for convenience
export type {
	DatabaseConfiguration,
	DatabaseHealth,
	DatabaseMetrics,
	MySQLConfig,
	PoolStats,
	PostgreSQLConfig,
	QueryResult,
	SingleQueryResult,
	SQLiteConfig,
} from "./interfaces";
// Core interfaces
export * from "./interfaces";
