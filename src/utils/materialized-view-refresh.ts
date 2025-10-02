import { sql } from "drizzle-orm";
import { db } from "../database/drizzle-adapter";
import { MaterializedViewName } from "../database/materialized-views";
import { StoredProcedures } from "../database/stored-procedures";

export interface RefreshOperationResult {
	viewName: string;
	status: "success" | "failed" | "skipped";
	durationMs: number;
	errorMessage?: string;
	retryCount: number;
}

export interface RefreshOperationOptions {
	maxRetries?: number;
	retryDelayMs?: number;
	timeoutMs?: number;
	forceRefresh?: boolean;
	viewsToRefresh?: MaterializedViewName[];
	logOperation?: boolean;
}

export class MaterializedViewRefreshService {
	private static readonly DEFAULT_OPTIONS: Required<RefreshOperationOptions> = {
		maxRetries: 2,
		retryDelayMs: 1000,
		timeoutMs: 15000,
		forceRefresh: false,
		viewsToRefresh: [],
		logOperation: true,
	};

	/**
	 * Get relevant materialized views for a specific auction type
	 */
	static getViewsForAuctionType(auctionType: string): MaterializedViewName[] {
		const viewMapping: Record<string, MaterializedViewName[]> = {
			english: [MaterializedViewName.ENGLISH, MaterializedViewName.BASE],
			vickrey: [MaterializedViewName.VICKREY, MaterializedViewName.BASE],
			multi_unit: [MaterializedViewName.MULTI_UNIT, MaterializedViewName.BASE],
			dutch: [MaterializedViewName.DUTCH, MaterializedViewName.BASE],
			sealed_bid: [MaterializedViewName.SEALED_BID, MaterializedViewName.BASE],
			reverse: [MaterializedViewName.REVERSE, MaterializedViewName.BASE],
			buy_it_now: [MaterializedViewName.BUY_IT_NOW, MaterializedViewName.BASE],
			all_pay: [MaterializedViewName.ALL_PAY, MaterializedViewName.BASE],
			japanese: [MaterializedViewName.JAPANESE, MaterializedViewName.BASE],
			chinese: [MaterializedViewName.CHINESE, MaterializedViewName.BASE],
			penny: [MaterializedViewName.PENNY, MaterializedViewName.BASE],
			combinatorial: [
				MaterializedViewName.COMBINATORIAL,
				MaterializedViewName.BASE,
			],
		};

		return viewMapping[auctionType] || [MaterializedViewName.BASE];
	}

	/**
	 * Execute a single refresh operation with retry logic
	 */
	static async executeRefreshWithRetry(
		viewName: MaterializedViewName,
		options: RefreshOperationOptions = {},
	): Promise<RefreshOperationResult> {
		const config = {
			...MaterializedViewRefreshService.DEFAULT_OPTIONS,
			...options,
		};
		const startTime = Date.now();
		let lastError: Error | null = null;
		let retryCount = 0;

		while (retryCount <= config.maxRetries) {
			try {
				if (config.logOperation) {
					console.log(
						`[MaterializedViewRefresh] Attempting to refresh view: ${viewName} (attempt ${retryCount + 1}/${config.maxRetries + 1})`,
					);
				}

				// Execute the refresh using the stored procedure with timeout
				const result = await Promise.race([
					StoredProcedures.refreshViewsSafely(viewName, config.forceRefresh),
					new Promise((_, reject) =>
						setTimeout(
							() => reject(new Error("Refresh timeout")),
							config.timeoutMs,
						),
					),
				]);

				const durationMs = Date.now() - startTime;

				if (config.logOperation) {
					console.log(
						`[MaterializedViewRefresh] Successfully refreshed view: ${viewName} in ${durationMs}ms`,
					);
				}

				return {
					viewName,
					status: "success",
					durationMs,
					retryCount,
				};
			} catch (error) {
				lastError = error as Error;
				retryCount++;

				if (config.logOperation) {
					console.warn(
						`[MaterializedViewRefresh] Refresh attempt ${retryCount} failed for view ${viewName}:`,
						error,
					);
				}

				// If we've exhausted retries, break the loop
				if (retryCount > config.maxRetries) {
					break;
				}

				// Wait before retrying (exponential backoff)
				const delay = config.retryDelayMs * 2 ** (retryCount - 1);
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}

		const durationMs = Date.now() - startTime;

		if (config.logOperation) {
			console.error(
				`[MaterializedViewRefresh] Failed to refresh view: ${viewName} after ${retryCount} attempts`,
				lastError,
			);
		}

		return {
			viewName,
			status: "failed",
			durationMs,
			errorMessage: lastError?.message,
			retryCount,
		};
	}

	/**
	 * Refresh multiple views concurrently with individual retry logic
	 */
	static async refreshViewsConcurrently(
		auctionType: string,
		options: RefreshOperationOptions = {},
	): Promise<RefreshOperationResult[]> {
		const config = {
			...MaterializedViewRefreshService.DEFAULT_OPTIONS,
			...options,
		};
		const viewsToRefresh =
			config.viewsToRefresh.length > 0
				? config.viewsToRefresh
				: MaterializedViewRefreshService.getViewsForAuctionType(auctionType);

		if (config.logOperation) {
			console.log(
				`[MaterializedViewRefresh] Starting concurrent refresh for auction type: ${auctionType}, views:`,
				viewsToRefresh,
			);
		}

		// Execute all refresh operations concurrently
		const refreshPromises = viewsToRefresh.map((viewName) =>
			MaterializedViewRefreshService.executeRefreshWithRetry(viewName, config),
		);

		const results = await Promise.allSettled(refreshPromises);

		const successfulResults: RefreshOperationResult[] = [];
		const failedResults: RefreshOperationResult[] = [];

		results.forEach((result, index) => {
			if (result.status === "fulfilled") {
				successfulResults.push(result.value);
			} else {
				const viewName = viewsToRefresh[index] || 'unknown';
				failedResults.push({
					viewName,
					status: "failed",
					durationMs: 0,
					errorMessage: result.reason?.message || "Unknown error",
					retryCount: 0,
				});
			}
		});

		if (config.logOperation) {
			console.log(
				`[MaterializedViewRefresh] Concurrent refresh completed. Successful: ${successfulResults.length}, Failed: ${failedResults.length}`,
			);

			if (failedResults.length > 0) {
				console.warn(
					"[MaterializedViewRefresh] Failed refresh operations:",
					failedResults,
				);
			}
		}

		return [...successfulResults, ...failedResults];
	}

	/**
	 * Get refresh performance metrics
	 */
	static getRefreshMetrics(results: RefreshOperationResult[]): {
		totalViews: number;
		successfulViews: number;
		failedViews: number;
		totalDurationMs: number;
		averageDurationMs: number;
		totalRetries: number;
	} {
		const successfulViews = results.filter(
			(r) => r.status === "success",
		).length;
		const failedViews = results.filter((r) => r.status === "failed").length;
		const totalDurationMs = results.reduce((sum, r) => sum + r.durationMs, 0);
		const averageDurationMs =
			results.length > 0 ? totalDurationMs / results.length : 0;
		const totalRetries = results.reduce((sum, r) => sum + r.retryCount, 0);

		return {
			totalViews: results.length,
			successfulViews,
			failedViews,
			totalDurationMs,
			averageDurationMs,
			totalRetries,
		};
	}

	/**
	 * Log refresh operation performance
	 */
	static logRefreshPerformance(
		auctionId: string,
		auctionType: string,
		results: RefreshOperationResult[],
		startTime: number,
	): void {
		const metrics = MaterializedViewRefreshService.getRefreshMetrics(results);
		const totalDuration = Date.now() - startTime;

		console.log(
			`[MaterializedViewRefresh] Auction ${auctionId} (${auctionType}) refresh summary:`,
			{
				totalDuration,
				metrics,
				timestamp: new Date().toISOString(),
			},
		);

		// Log performance warnings
		if (metrics.failedViews > 0) {
			console.warn(
				`[MaterializedViewRefresh] Auction ${auctionId}: ${metrics.failedViews} view(s) failed to refresh`,
			);
		}

		if (metrics.averageDurationMs > 5000) {
			console.warn(
				`[MaterializedViewRefresh] Auction ${auctionId}: Average refresh duration ${metrics.averageDurationMs}ms exceeds threshold`,
			);
		}
	}
}
