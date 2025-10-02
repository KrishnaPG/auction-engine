/** biome-ignore-all lint/complexity/noStaticOnlyClass: namespace */
import { sql } from "drizzle-orm";
import { db } from "./drizzle-adapter";

export class SchemaExtensions {
	// Create auction winners table for caching winner determination results
	static async createAuctionWinnersTable(): Promise<void> {
		await db.execute(sql`
      CREATE TABLE IF NOT EXISTS auction_winners (
        auction_id UUID PRIMARY KEY,
        winner_bid_id UUID NOT NULL REFERENCES bids(id) ON DELETE CASCADE,
        winner_user_id UUID NOT NULL,
        winning_amount DECIMAL(15,2) NOT NULL,
        payment_amount DECIMAL(15,2),
        determined_at TIMESTAMP NOT NULL DEFAULT NOW(),
        determination_method VARCHAR(50) NOT NULL,
        is_cached BOOLEAN DEFAULT true,
        last_refreshed_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (auction_id) REFERENCES auctions(id) ON DELETE CASCADE
      );
    `);

		// Create indexes for auction winners table
		await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_auction_winners_auction_id ON auction_winners(auction_id);

      CREATE INDEX IF NOT EXISTS idx_auction_winners_winner_id ON auction_winners(winner_user_id);

      CREATE INDEX IF NOT EXISTS idx_auction_winners_determination_method ON auction_winners(determination_method);

      CREATE INDEX IF NOT EXISTS idx_auction_winners_determined_at ON auction_winners(determined_at DESC);
    `);
	}

	// Create materialized view logs table for monitoring refresh operations
	static async createMaterializedViewLogsTable(): Promise<void> {
		await db.execute(sql`
      CREATE TABLE IF NOT EXISTS materialized_view_logs (
        id SERIAL PRIMARY KEY,
        view_name VARCHAR(100) NOT NULL,
        operation VARCHAR(20) NOT NULL, -- CREATE, REFRESH, DROP
        status VARCHAR(20) NOT NULL, -- SUCCESS, FAILED, RUNNING
        error_message TEXT,
        refresh_duration INTERVAL,
        records_affected INTEGER,
        executed_by VARCHAR(100),
        executed_at TIMESTAMP NOT NULL DEFAULT NOW(),
        details JSONB
      );
    `);

		// Create indexes for materialized view logs table
		await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_materialized_view_logs_view_name ON materialized_view_logs(view_name);

      CREATE INDEX IF NOT EXISTS idx_materialized_view_logs_status ON materialized_view_logs(status);

      CREATE INDEX IF NOT EXISTS idx_materialized_view_logs_executed_at ON materialized_view_logs(executed_at DESC);
    `);
	}

	// Create auction performance metrics table
	static async createAuctionPerformanceMetricsTable(): Promise<void> {
		await db.execute(sql`
      CREATE TABLE IF NOT EXISTS auction_performance_metrics (
        id SERIAL PRIMARY KEY,
        auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
        metric_name VARCHAR(100) NOT NULL,
        metric_value DECIMAL(15,2),
        metric_unit VARCHAR(50),
        calculated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        context JSONB,
        FOREIGN KEY (auction_id) REFERENCES auctions(id) ON DELETE CASCADE
      );
    `);

		// Create indexes for performance metrics table
		await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_auction_performance_metrics_auction_id ON auction_performance_metrics(auction_id);

      CREATE INDEX IF NOT EXISTS idx_auction_performance_metrics_metric_name ON auction_performance_metrics(metric_name);

      CREATE INDEX IF NOT EXISTS idx_auction_performance_metrics_calculated_at ON auction_performance_metrics(calculated_at DESC);
    `);
	}

	// Create query optimization stats table
	static async createQueryOptimizationStatsTable(): Promise<void> {
		await db.execute(sql`
      CREATE TABLE IF NOT EXISTS query_optimization_stats (
        id SERIAL PRIMARY KEY,
        query_type VARCHAR(100) NOT NULL,
        table_name VARCHAR(100) NOT NULL,
        execution_time_avg DECIMAL(10,4),
        execution_time_min DECIMAL(10,4),
        execution_time_max DECIMAL(10,4),
        rows_processed_avg INTEGER,
        cache_hit_rate DECIMAL(5,2),
        last_measured_at TIMESTAMP NOT NULL DEFAULT NOW(),
        measurement_count INTEGER DEFAULT 1,
        INDEX (query_type, table_name)
      );
    `);
	}

	// Create materialized view refresh schedules table
	static async createRefreshSchedulesTable(): Promise<void> {
		await db.execute(sql`
      CREATE TABLE IF NOT EXISTS materialized_view_refresh_schedules (
        id SERIAL PRIMARY KEY,
        view_name VARCHAR(100) NOT NULL,
        refresh_type VARCHAR(20) NOT NULL, -- ON_CHANGE, SCHEDULED, MANUAL
        refresh_interval INTERVAL,
        last_refreshed_at TIMESTAMP,
        next_refresh_at TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(view_name, refresh_type)
      );
    `);

		// Create indexes for refresh schedules table
		await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_refresh_schedules_view_name ON materialized_view_refresh_schedules(view_name);

      CREATE INDEX IF NOT EXISTS idx_refresh_schedules_is_active ON materialized_view_refresh_schedules(is_active);

      CREATE INDEX IF NOT EXISTS idx_refresh_schedules_next_refresh_at ON materialized_view_refresh_schedules(next_refresh_at);
    `);
	}

	// Create audit log for materialized view operations
	static async createMaterializedViewAuditTable(): Promise<void> {
		await db.execute(sql`
      CREATE TABLE IF NOT EXISTS materialized_view_audit (
        id SERIAL PRIMARY KEY,
        operation_type VARCHAR(50) NOT NULL, -- CREATE, ALTER, DROP, REFRESH
        object_type VARCHAR(50) NOT NULL, -- MATERIALIZED_VIEW, TRIGGER, FUNCTION
        object_name VARCHAR(100) NOT NULL,
        operation_details JSONB,
        performed_by VARCHAR(100),
        performed_at TIMESTAMP NOT NULL DEFAULT NOW(),
        ip_address INET,
        user_agent TEXT,
        success BOOLEAN DEFAULT true,
        error_message TEXT
      );
    `);

		// Create indexes for audit table
		await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_materialized_view_audit_operation_type ON materialized_view_audit(operation_type);

      CREATE INDEX IF NOT EXISTS idx_materialized_view_audit_object_name ON materialized_view_audit(object_name);

      CREATE INDEX IF NOT EXISTS idx_materialized_view_audit_performed_at ON materialized_view_audit(performed_at DESC);

      CREATE INDEX IF NOT EXISTS idx_materialized_view_audit_success ON materialized_view_audit(success);
    `);
	}

	// Create all extension tables
	static async createAllExtensionTables(): Promise<void> {
		try {
			await SchemaExtensions.createAuctionWinnersTable();
			await SchemaExtensions.createMaterializedViewLogsTable();
			await SchemaExtensions.createAuctionPerformanceMetricsTable();
			await SchemaExtensions.createQueryOptimizationStatsTable();
			await SchemaExtensions.createRefreshSchedulesTable();
			await SchemaExtensions.createMaterializedViewAuditTable();
		} catch (error) {
			console.error("Error creating extension tables:", error);
			throw error;
		}
	}

	// Log materialized view operation
	static async logMaterializedViewOperation(
		viewName: string,
		operation: string,
		status: string,
		errorMessage?: string,
		refreshDuration?: any,
		recordsAffected?: number,
		executedBy?: string,
	): Promise<void> {
		try {
			await db.execute(sql`
        INSERT INTO materialized_view_logs (
          view_name, operation, status, error_message, 
          refresh_duration, records_affected, executed_by
        ) VALUES (
          ${viewName}, ${operation}, ${status}, ${errorMessage}, 
          ${refreshDuration}, ${recordsAffected}, ${executedBy}
        )
      `);
		} catch (error) {
			console.error("Error logging materialized view operation:", error);
		}
	}

	// Record performance metric
	static async recordPerformanceMetric(
		auctionId: string,
		metricName: string,
		metricValue: number,
		metricUnit?: string,
		context?: any,
	): Promise<void> {
		try {
			await db.execute(sql`
        INSERT INTO auction_performance_metrics (
          auction_id, metric_name, metric_value, metric_unit, context
        ) VALUES (
          ${auctionId}, ${metricName}, ${metricValue}, ${metricUnit}, ${context}
        )
      `);
		} catch (error) {
			console.error("Error recording performance metric:", error);
		}
	}

	// Get materialized view statistics
	static async getMaterializedViewStats(viewName?: string): Promise<any> {
		try {
			if (viewName) {
				return await db.execute(sql`
	         SELECT
	           matviewname,
	           pg_size_pretty(pg_relation_size(matviewname::text)) as size,
	           last_autovacuum,
	           n_tup_ins
	         FROM pg_matviews
	         WHERE matviewname = ${viewName}
	       `);
			} else {
				return await db.execute(sql`
	         SELECT
	           matviewname,
	           pg_size_pretty(pg_relation_size(matviewname::text)) as size,
	           last_autovacuum,
	           n_tup_ins
	         FROM pg_matviews
	         WHERE matviewname LIKE 'mv_%'
	       `);
			}
		} catch (error) {
			console.error("Error getting materialized view stats:", error);
			return [];
		}
	}

	// Get query performance statistics
	static async getQueryPerformanceStats(): Promise<any> {
		try {
			return await db.execute(sql`
        SELECT 
          query_type,
          table_name,
          AVG(execution_time_avg) as avg_execution_time,
          AVG(rows_processed_avg) as avg_rows_processed,
          AVG(cache_hit_rate) as avg_cache_hit_rate,
          COUNT(*) as measurement_count
        FROM query_optimization_stats
        GROUP BY query_type, table_name
        ORDER BY avg_execution_time DESC
        LIMIT 10
      `);
		} catch (error) {
			console.error("Error getting query performance stats:", error);
			return [];
		}
	}
}
