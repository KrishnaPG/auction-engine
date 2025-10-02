/** biome-ignore-all lint/complexity/noStaticOnlyClass: namespace */

import { sql } from "drizzle-orm";
import { db } from "./drizzle-adapter";
import { MaterializedViews } from "./materialized-views";
import { SchemaExtensions } from "./schema-extensions";
import { StoredProcedures } from "./stored-procedures";
import { Triggers } from "./triggers";

export class DatabaseInitializer {
	// Main ensureTables method that creates all database objects
	static async ensureTables(): Promise<void> {
		try {
			console.log("Starting database initialization...");

			// Step 1: Create extension tables first (they don't depend on materialized views)
			console.log("Creating extension tables...");
			await SchemaExtensions.createAllExtensionTables();

			// Step 2: Create materialized views
			console.log("Creating materialized views...");
			await MaterializedViews.createAllMaterializedViews();

			// Step 3: Create triggers
			console.log("Creating triggers...");
			await Triggers.createAllTriggers();

			// Step 4: Create stored procedures
			console.log("Creating stored procedures...");
			await StoredProcedures.createAllStoredProcedures();

			// Step 5: Refresh all materialized views to ensure they have current data
			console.log("Refreshing materialized views...");
			await MaterializedViews.refreshMaterializedViews();

			console.log("Database initialization completed successfully!");
		} catch (error) {
			console.error("Database initialization failed:", error);
			throw error;
		}
	}

	// Safe initialization with rollback capability
	static async safeInitialization(): Promise<{
		success: boolean;
		error?: string;
		rollback?: boolean;
	}> {
		let transaction: any;

		try {
			// Start transaction
			transaction = await db.transaction(async (tx) => {
				// Override db instance with transaction for all operations
				const originalDb = db;
				(global as any).db = tx;

				try {
					await DatabaseInitializer.ensureTables();
					return { success: true };
				} catch (error) {
					console.error("Transaction failed, rolling back:", error);
					throw error;
				} finally {
					// Restore original db instance
					(global as any).db = originalDb;
				}
			});

			return { success: true };
		} catch (error) {
			console.error("Safe initialization failed:", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
				rollback: true,
			};
		}
	}

	// Check if database objects exist
	static async checkDatabaseObjects(): Promise<{
		materializedViews: boolean;
		triggers: boolean;
		storedProcedures: boolean;
		extensionTables: boolean;
	}> {
		try {
			const mvResult = await db.execute(sql`
			     SELECT EXISTS (
			       SELECT FROM information_schema.tables
			       WHERE table_schema = 'public'
			       AND table_type = 'MATERIALIZED VIEW'
			       AND table_name LIKE 'mv_%'
			     ) as exists
			   `);

			const triggersResult = await db.execute(sql`
			     SELECT EXISTS (
			       SELECT FROM information_schema.triggers
			       WHERE trigger_name LIKE 'trigger_refresh_materialized_views%'
			     ) as exists
			   `);

			const proceduresResult = await db.execute(sql`
			     SELECT EXISTS (
			       SELECT FROM information_schema.routines
			       WHERE routine_type = 'FUNCTION'
			       AND routine_name IN (
			         'determine_auction_winner',
			         'determine_batch_winners',
			         'cache_auction_winner',
			         'refresh_materialized_views_safely',
			         'get_auction_statistics'
			       )
			     ) as exists
			   `);

			const extensionTablesResult = await db.execute(sql`
			     SELECT EXISTS (
			       SELECT FROM information_schema.tables
			       WHERE table_schema = 'public'
			       AND table_name IN (
			         'auction_winners',
			         'materialized_view_logs',
			         'auction_performance_metrics',
			         'query_optimization_stats',
			         'materialized_view_refresh_schedules',
			         'materialized_view_audit'
			       )
			     ) as exists
			   `);

			return {
				materializedViews: (mvResult as unknown as Array<{ exists: boolean }>)[0]?.exists || false,
				triggers: (triggersResult as unknown as Array<{ exists: boolean }>)[0]?.exists || false,
				storedProcedures: (proceduresResult as unknown as Array<{ exists: boolean }>)[0]?.exists || false,
				extensionTables: (extensionTablesResult as unknown as Array<{ exists: boolean }>)[0]?.exists || false,
			};
		} catch (error) {
			console.error("Error checking database objects:", error);
			return {
				materializedViews: false,
				triggers: false,
				storedProcedures: false,
				extensionTables: false,
			};
		}
	}

	// Get database initialization status
	static async getInitializationStatus(): Promise<{
		isInitialized: boolean;
		missingObjects: string[];
		version: string;
		lastInitialized?: Date;
	}> {
		try {
			const objects = await DatabaseInitializer.checkDatabaseObjects();
			const missingObjects: string[] = [];

			if (!objects.materializedViews) missingObjects.push("Materialized Views");
			if (!objects.triggers) missingObjects.push("Triggers");
			if (!objects.storedProcedures) missingObjects.push("Stored Procedures");
			if (!objects.extensionTables) missingObjects.push("Extension Tables");

			// Check for initialization log
			const logResult = await db.execute(sql`
			     SELECT MAX(executed_at) as last_initialized
			     FROM materialized_view_logs
			     WHERE operation = 'CREATE' AND status = 'SUCCESS'
			   `);

			return {
				isInitialized: missingObjects.length === 0,
				missingObjects,
				version: "1.0.0",
				lastInitialized: (logResult as unknown as Array<{ last_initialized: Date }>)?.[0]?.last_initialized,
			};
		} catch (error) {
			console.error("Error getting initialization status:", error);
			return {
				isInitialized: false,
				missingObjects: ["Error checking status"],
				version: "1.0.0",
			};
		}
	}

	// Initialize only missing objects
	static async initializeMissingObjects(): Promise<void> {
		try {
			const status = await DatabaseInitializer.getInitializationStatus();

			if (status.isInitialized) {
				console.log("Database is already fully initialized.");
				return;
			}

			console.log("Initializing missing objects:", status.missingObjects);

			if (status.missingObjects.includes("Materialized Views")) {
				await MaterializedViews.createAllMaterializedViews();
			}

			if (status.missingObjects.includes("Triggers")) {
				await Triggers.createAllTriggers();
			}

			if (status.missingObjects.includes("Stored Procedures")) {
				await StoredProcedures.createAllStoredProcedures();
			}

			if (status.missingObjects.includes("Extension Tables")) {
				await SchemaExtensions.createAllExtensionTables();
			}

			// Refresh all materialized views
			await MaterializedViews.refreshMaterializedViews();

			console.log("Missing objects initialized successfully!");
		} catch (error) {
			console.error("Failed to initialize missing objects:", error);
			throw error;
		}
	}

	// Cleanup and reset database objects (for testing/migrations)
	static async cleanup(): Promise<void> {
		try {
			console.log("Starting database cleanup...");

			// Drop triggers first (they depend on functions)
			await Triggers.dropAllTriggers();

			// Drop materialized views
			const materializedViews = [
				"mv_auction_bids_with_metadata",
				"mv_english_auction_bids",
				"mv_vickrey_auction_bids",
				"mv_multi_unit_auction_bids",
			];

			for (const view of materializedViews) {
				try {
					await db.execute(
						sql`DROP MATERIALIZED VIEW IF EXISTS ${sql.raw(view)} CASCADE`,
					);
				} catch (error) {
					console.warn(`Failed to drop materialized view ${view}:`, error);
				}
			}

			// Drop stored procedures (functions)
			const functions = [
				"determine_auction_winner",
				"determine_batch_winners",
				"cache_auction_winner",
				"refresh_materialized_views_safely",
				"get_auction_statistics",
			];

			for (const func of functions) {
				try {
					await db.execute(
						sql`DROP FUNCTION IF EXISTS ${sql.raw(func)}() CASCADE`,
					);
				} catch (error) {
					console.warn(`Failed to drop function ${func}:`, error);
				}
			}

			// Drop extension tables
			const extensionTables = [
				"auction_winners",
				"materialized_view_logs",
				"auction_performance_metrics",
				"query_optimization_stats",
				"materialized_view_refresh_schedules",
				"materialized_view_audit",
			];

			for (const table of extensionTables) {
				try {
					await db.execute(sql`DROP TABLE IF EXISTS ${sql.raw(table)} CASCADE`);
				} catch (error) {
					console.warn(`Failed to drop table ${table}:`, error);
				}
			}

			console.log("Database cleanup completed successfully!");
		} catch (error) {
			console.error("Database cleanup failed:", error);
			throw error;
		}
	}

	// Health check for database objects
	static async healthCheck(): Promise<{
		healthy: boolean;
		issues: string[];
		recommendations: string[];
	}> {
		try {
			const issues: string[] = [];
			const recommendations: string[] = [];

			// Check materialized views
			const mvStats = await SchemaExtensions.getMaterializedViewStats();
			if (mvStats.length === 0) {
				issues.push("No materialized views found");
				recommendations.push("Run ensureTables() to create materialized views");
			}

			// Check for recent refreshes
			const lastRefreshResult = await db.execute(sql`
			     SELECT MAX(executed_at) as last_refresh
			     FROM materialized_view_logs
			     WHERE operation = 'REFRESH' AND status = 'SUCCESS'
			   `);

			const lastRefreshTime = (lastRefreshResult as unknown as Array<{ last_refresh: Date }>)?.[0]?.last_refresh || null;
			if (
				!lastRefreshTime ||
				new Date(lastRefreshTime).getTime() < Date.now() - 3600000
			) {
				issues.push("Materialized views may be stale");
				recommendations.push("Consider refreshing materialized views");
			}

			// Check for failed operations
			const failedOpsResult = await db.execute(sql`
			     SELECT COUNT(*) as count
			     FROM materialized_view_logs
			     WHERE status = 'FAILED'
			     AND executed_at > NOW() - INTERVAL '24 hours'
			   `);

			const failedCount = (failedOpsResult as unknown as Array<{ count: number }>)[0]?.count || 0;
			if (failedCount > 0) {
				issues.push(
					`${failedCount} failed operations in last 24 hours`,
				);
				recommendations.push(
					"Review failed operations in materialized_view_logs table",
				);
			}

			return {
				healthy: issues.length === 0,
				issues,
				recommendations,
			};
		} catch (error) {
			console.error("Health check failed:", error);
			return {
				healthy: false,
				issues: ["Health check failed"],
				recommendations: ["Check database connection and permissions"],
			};
		}
	}
}
