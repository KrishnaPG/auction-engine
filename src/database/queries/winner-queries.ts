import { and, desc, eq, gte, sql as rawSql, sql } from "drizzle-orm";
import type {
	AuctionType,
	IWinnerQueries,
	TAuctionId,
	TBidId,
	TUserId,
} from "../../types/core-interfaces";
import { AuctionType as TypeEnum } from "../../types/core-interfaces";
import { db } from "../drizzle-adapter";
import { MaterializedViewName, MaterializedViews } from "../materialized-views";
import { auctions, bids } from "../schema";
import { StoredProcedures } from "../stored-procedures";

export class WinnerQueries implements IWinnerQueries {
	private performanceMetrics = new Map<string, { totalTime: number; count: number }>();

	// Helper method to record performance metrics
	private recordPerformance(key: string, duration: number): void {
		const current = this.performanceMetrics.get(key) || { totalTime: 0, count: 0 };
		this.performanceMetrics.set(key, {
			totalTime: current.totalTime + duration,
			count: current.count + 1,
		});
	}

	// Helper method to get performance metrics
	getPerformanceMetrics(): Map<string, { averageTime: number; count: number }> {
		const metrics = new Map<string, { averageTime: number; count: number }>();
		this.performanceMetrics.forEach((value, key) => {
			metrics.set(key, {
				averageTime: value.totalTime / value.count,
				count: value.count,
			});
		});
		return metrics;
	}

	// Helper method to check if materialized view exists
	private async materializedViewExists(viewName: string): Promise<boolean> {
		try {
			const result = await db.execute(rawSql`
			     SELECT EXISTS (
			       SELECT 1 FROM pg_matviews
			       WHERE matviewname = ${viewName}
			     )
			   `) as any;
			return result[0]?.exists || false;
		} catch (error) {
			console.warn(`Failed to check materialized view existence for ${viewName}:`, error);
			return false;
		}
	}

	// Helper method to get winner using materialized view
	private async getWinnerFromMaterializedView(
		auctionId: TAuctionId,
		viewName: string,
		conditions: string[] = [],
	): Promise<TUserId | null> {
		const startTime = performance.now();
		
		try {
			const viewExists = await this.materializedViewExists(viewName);
			if (!viewExists) {
				throw new Error(`Materialized view ${viewName} not found`);
			}

			const query = db
				.select({ bidderId: rawSql`bidder_id`.as('bidderId') })
				.from(rawSql`(SELECT * FROM ${viewName}) as mv`)
				.where(and(
					rawSql`mv.auction_id = ${auctionId}`,
					...conditions.map(condition => rawSql(condition))
				))
				.orderBy(rawSql`mv.amount DESC, mv.timestamp ASC`)
				.limit(1);

			const [result] = await query;
			const duration = performance.now() - startTime;
			this.recordPerformance(`${viewName}_query`, duration);
			
			return result ? result.bidderId as TUserId : null;
		} catch (error) {
			const duration = performance.now() - startTime;
			this.recordPerformance(`${viewName}_error`, duration);
			throw error;
		}
	}

	// Helper method to get winner using stored procedure
	private async getWinnerFromStoredProcedure(auctionId: TAuctionId): Promise<TUserId | null> {
		const startTime = performance.now();
		
		try {
			const result = await StoredProcedures.determineWinner(auctionId.toString());
			const duration = performance.now() - startTime;
			this.recordPerformance(`stored_procedure_query`, duration);
			
			if (result && result.length > 0) {
				return result[0].winner_id as TUserId;
			}
			return null;
		} catch (error) {
			const duration = performance.now() - startTime;
			this.recordPerformance(`stored_procedure_error`, duration);
			throw error;
		}
	}

	// Helper method for fallback queries
	private async getWinnerFromFallback(
		auctionId: TAuctionId,
		type: AuctionType,
	): Promise<TUserId | null> {
		const startTime = performance.now();
		
		try {
			let query: any;
			switch (type) {
				case TypeEnum.ENGLISH:
					query = db
						.select({ bidderId: bids.bidderId })
						.from(bids)
						.innerJoin(auctions, eq(bids.auctionId, auctions.id))
						.where(
							and(
								eq(auctions.id, auctionId),
								eq(auctions.type, type),
								eq(auctions.status, "completed"),
								eq(bids.status, "active"),
								gte(bids.amount, sql`COALESCE(${auctions.reservePrice}, 0)`),
							),
						)
						.orderBy(sql`${bids.amount} DESC, ${bids.timestamp} ASC`)
						.limit(1);
					break;
				case TypeEnum.VICKREY:
					query = db
						.select({ bidderId: bids.bidderId })
						.from(bids)
						.innerJoin(auctions, eq(bids.auctionId, auctions.id))
						.where(
							and(
								eq(auctions.id, auctionId),
								eq(auctions.type, type),
								eq(auctions.status, "completed"),
								eq(bids.status, "active"),
							),
						)
						.orderBy(sql`${bids.amount} DESC, ${bids.timestamp} ASC`)
						.limit(1);
					break;
				case TypeEnum.MULTI_UNIT:
					query = db
						.select({ bidderId: bids.bidderId })
						.from(bids)
						.innerJoin(auctions, eq(bids.auctionId, auctions.id))
						.where(
							and(
								eq(auctions.id, auctionId),
								eq(auctions.type, type),
								eq(auctions.status, "completed"),
								eq(bids.status, "active"),
							),
						)
						.orderBy(sql`${bids.amount} DESC, ${bids.timestamp} ASC`)
						.limit(1);
					break;
				default:
					// Use base materialized view as fallback for other types
					return await this.getWinnerFromMaterializedView(
						auctionId,
						MaterializedViewName.BASE,
						[`bid_rank_within_auction = 1`]
					);
			}

			const [result] = await query;
			const duration = performance.now() - startTime;
			this.recordPerformance(`${type}_fallback_query`, duration);
			
			return result ? result.bidderId as TUserId : null;
		} catch (error) {
			const duration = performance.now() - startTime;
			this.recordPerformance(`${type}_fallback_error`, duration);
			throw error;
		}
	}

	async determineWinner(
		auctionId: TAuctionId,
		type: AuctionType,
	): Promise<TUserId | null> {
		const startTime = performance.now();
		
		try {
			let winner: TUserId | null = null;

			// Try materialized views first for critical auction types
			switch (type) {
				case TypeEnum.ENGLISH:
					winner = await this.getWinnerFromMaterializedView(
						auctionId,
						MaterializedViewName.ENGLISH,
						[`reserve_status = 'meets_reserve'`, `bid_rank_within_auction = 1`]
					);
					break;
				case TypeEnum.VICKREY:
					winner = await this.getWinnerFromMaterializedView(
						auctionId,
						MaterializedViewName.VICKREY,
						[`vickrey_rank = 1`]
					);
					break;
				case TypeEnum.MULTI_UNIT:
					winner = await this.getWinnerFromMaterializedView(
						auctionId,
						MaterializedViewName.MULTI_UNIT,
						[`allocation_status = 'winning'`]
					);
					break;
				default:
					// For other types, try stored procedure first
					try {
						winner = await this.getWinnerFromStoredProcedure(auctionId);
					} catch (error) {
						console.warn(`Stored procedure failed for ${type}, falling back to materialized view:`, error);
					}
					
					// If stored procedure failed, try base materialized view
					if (!winner) {
						try {
							winner = await this.getWinnerFromMaterializedView(
								auctionId,
								MaterializedViewName.BASE,
								[`bid_rank_within_auction = 1`]
							);
						} catch (error) {
							console.warn(`Base materialized view failed for ${type}, falling back to original query:`, error);
						}
					}
			}

			// Final fallback to original queries if all else fails
			if (!winner) {
				winner = await this.getWinnerFromFallback(auctionId, type);
			}

			const duration = performance.now() - startTime;
			this.recordPerformance(`determineWinner_${type}`, duration);
			
			return winner;
		} catch (error) {
			const duration = performance.now() - startTime;
			this.recordPerformance(`determineWinner_${type}_error`, duration);
			console.error(`Error determining winner for auction ${auctionId} with type ${type}:`, error);
			throw error;
		}
	}

	async determineWinners(auctionId: TAuctionId): Promise<Map<TUserId, TBidId>> {
		const startTime = performance.now();
		const winners = new Map<TUserId, TBidId>();

		try {
			// First, get the auction type
			const typeResult = await db
				.select({ type: auctions.type })
				.from(auctions)
				.where(eq(auctions.id, auctionId));

			if (typeResult.length === 0) {
				return winners;
			}

			const auctionType = typeResult[0]!.type;

			// Use materialized view for multi-unit auctions
			if (auctionType === TypeEnum.MULTI_UNIT) {
				try {
					const viewExists = await this.materializedViewExists(MaterializedViewName.MULTI_UNIT);
					
					if (viewExists) {
						// Query materialized view for all winning bids
						const results = await db
							.select({ 
								bidderId: rawSql`bidder_id`.as('bidderId'),
								bidId: rawSql`bid_id`.as('bidId')
							})
							.from(rawSql`(SELECT * FROM ${MaterializedViewName.MULTI_UNIT}) as mv`)
							.where(and(
								rawSql`mv.auction_id = ${auctionId}`,
								rawSql`mv.allocation_status = 'winning'`
							))
							.orderBy(rawSql`mv.cumulative_quantity ASC`);

						results.forEach(r => {
							winners.set(r.bidderId as TUserId, r.bidId as TBidId);
						});
					} else {
						throw new Error(`Materialized view ${MaterializedViewName.MULTI_UNIT} not found`);
					}
				} catch (error) {
					console.warn(`Materialized view query failed for multi-unit auction, falling back to original query:`, error);
					
					// Fallback to original query
					const results = await db
						.select({ bidderId: bids.bidderId, id: bids.id })
						.from(bids)
						.innerJoin(auctions, eq(bids.auctionId, auctions.id))
						.where(and(eq(auctions.id, auctionId), eq(bids.status, "active")))
						.orderBy(sql`${bids.amount} DESC`)
						.limit(5); // Assume 5 units

					results.forEach(r => {
						winners.set(r.bidderId as TUserId, r.id as TBidId);
					});
				}
			} else if (auctionType === TypeEnum.COMBINATORIAL) {
				try {
					const viewExists = await this.materializedViewExists(MaterializedViewName.COMBINATORIAL);
					
					if (viewExists) {
						// Query materialized view for top bids
						const results = await db
							.select({ 
								bidderId: rawSql`bidder_id`.as('bidderId'),
								bidId: rawSql`bid_id`.as('bidId')
							})
							.from(rawSql`(SELECT * FROM ${MaterializedViewName.COMBINATORIAL}) as mv`)
							.where(rawSql`mv.auction_id = ${auctionId}`)
							.orderBy(rawSql`mv.amount DESC, mv.timestamp ASC`)
							.limit(5); // Top 5 bids as winners

						results.forEach(r => {
							winners.set(r.bidderId as TUserId, r.bidId as TBidId);
						});
					} else {
						throw new Error(`Materialized view ${MaterializedViewName.COMBINATORIAL} not found`);
					}
				} catch (error) {
					console.warn(`Materialized view query failed for combinatorial auction, falling back to original query:`, error);
					
					// Fallback to original query
					const results = await db
						.select({ bidderId: bids.bidderId, id: bids.id })
						.from(bids)
						.innerJoin(auctions, eq(bids.auctionId, auctions.id))
						.where(and(eq(auctions.id, auctionId), eq(bids.status, "active")))
						.orderBy(sql`${bids.amount} DESC`)
						.limit(5);

					results.forEach(r => {
						winners.set(r.bidderId as TUserId, r.id as TBidId);
					});
				}
			}

			const duration = performance.now() - startTime;
			this.recordPerformance(`determineWinners_${auctionType}`, duration);
			
			return winners;
		} catch (error) {
			const duration = performance.now() - startTime;
			this.recordPerformance(`determineWinners_error`, duration);
			console.error(`Error determining winners for auction ${auctionId}:`, error);
			throw error;
		}
	}
}
