// Database Abstraction Layer Exports

import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Create singleton database instance
const pool = new Pool({
	host: process.env.DB_HOST || "localhost",
	port: parseInt(process.env.DB_PORT || "5432"),
	database: process.env.DB_NAME || "auction_db",
	user: process.env.DB_USER || "postgres",
	password: process.env.DB_PASSWORD || "password",
	max: 10,
	idleTimeoutMillis: 30000,
	connectionTimeoutMillis: 2000,
});

// Test connection
pool.query("SELECT 1").catch(console.error);

// Export database instance for queries
export const db = drizzle(pool, {
	schema: {
		auctions: schema.auctions,
		bids: schema.bids,
		outboxEvents: schema.outboxEvents,
		auctionConfigurations: schema.auctionConfigurations,
		rules: schema.rules,
		ruleConfigurations: schema.ruleConfigurations,
		ruleViolations: schema.ruleViolations,
	},
});

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
// Export schema for direct use
export * from "./schema";
