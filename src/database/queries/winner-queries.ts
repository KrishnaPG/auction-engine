import { eq, sql } from "drizzle-orm";
import type {
	AuctionType,
	IWinnerQueries,
	TAuctionId,
	TBidId,
	TUserId,
} from "../../types/core-interfaces";
import { AuctionType as TypeEnum } from "../../types/core-interfaces";
import { db } from "../drizzle-adapter";
import { auctions, bids } from "../schema";

export class WinnerQueries implements IWinnerQueries {
	async determineWinner(
		auctionId: TAuctionId,
		type: AuctionType,
	): Promise<TUserId | null> {
		let query;
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
			case TypeEnum.DUTCH:
				query = db
					.select({ bidderId: bids.bidderId })
					.from(bids)
					.innerJoin(auctions, eq(bids.auctionId, auctions.id))
					.where(
						and(
							eq(auctions.id, auctionId),
							eq(auctions.type, type),
							eq(auctions.status, "completed"),
							eq(bids.status, "winning"),
							gte(bids.amount, sql`${auctions.currentPrice}`),
						),
					)
					.orderBy(bids.timestamp.asc())
					.limit(1);
				break;
			case TypeEnum.SEALED_BID:
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
							eq(bids.isAnonymous, true),
						),
					)
					.orderBy(sql`${bids.amount} DESC, ${bids.timestamp} ASC`)
					.limit(1);
				break;
			case TypeEnum.REVERSE:
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
					.orderBy(sql`${bids.amount} ASC, ${bids.timestamp} ASC`)
					.limit(1);
				break;
			case TypeEnum.VICKREY: {
				const vickreyQuery = db
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
				const [result] = await vickreyQuery;
				return result ? result.bidderId : null;
			}
			case TypeEnum.BUY_IT_NOW:
				query = db
					.select({ bidderId: bids.bidderId })
					.from(bids)
					.innerJoin(auctions, eq(bids.auctionId, auctions.id))
					.where(
						and(
							eq(auctions.id, auctionId),
							eq(auctions.type, type),
							eq(auctions.status, "completed"),
							eq(bids.status, "winning"),
							gte(bids.amount, sql`${auctions.buyItNowPrice}`),
						),
					)
					.orderBy(bids.timestamp.asc())
					.limit(1);
				break;
			case TypeEnum.ALL_PAY:
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
			case TypeEnum.JAPANESE:
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
					.orderBy(bids.timestamp.desc())
					.limit(1);
				break;
			case TypeEnum.CHINESE:
				query = db
					.select({ bidderId: bids.bidderId })
					.from(bids)
					.innerJoin(auctions, eq(bids.auctionId, auctions.id))
					.where(
						and(
							eq(auctions.id, auctionId),
							eq(auctions.type, type),
							eq(auctions.status, "completed"),
							eq(bids.status, "winning"),
						),
					)
					.orderBy(bids.timestamp.asc())
					.limit(1);
				break;
			case TypeEnum.PENNY:
				query = db
					.select({ bidderId: bids.bidderId })
					.from(bids)
					.innerJoin(auctions, eq(bids.auctionId, auctions.id))
					.where(
						and(
							eq(auctions.id, auctionId),
							eq(auctions.type, type),
							eq(auctions.status, "completed"),
							eq(bids.status, "winning"),
						),
					)
					.orderBy(bids.timestamp.desc())
					.limit(1);
				break;
			case TypeEnum.MULTI_UNIT: {
				// Simplified: highest bids up to units
				const multiQuery = db
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
					.limit(auctions.units || 1); // Assume units in auctions
				const results = await multiQuery;
				return results[0]?.bidderId || null; // First winner
			}
			case TypeEnum.COMBINATORIAL:
				// Simplified greedy
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
							sql`package_items IS NOT NULL`,
						),
					)
					.orderBy(sql`${bids.packageBidAmount} DESC, ${bids.timestamp} ASC`)
					.limit(1);
				break;
			default:
				throw new Error(`Unsupported auction type: ${type}`);
		}
		const [result] = await query;
		return result ? result.bidderId : null;
	}

	async determineWinners(auctionId: TAuctionId): Promise<Map<TUserId, TBidId>> {
		// For multi-unit/combinatorial, return map of winners
		// Stub: implement based on type
		const type = await db
			.select({ type: auctions.type })
			.from(auctions)
			.where(eq(auctions.id, auctionId));
		const winners = new Map<TUserId, TBidId>();
		if (type[0].type === TypeEnum.MULTI_UNIT) {
			const results = await db
				.select({ bidderId: bids.bidderId, id: bids.id })
				.from(bids)
				.innerJoin(auctions, eq(bids.auctionId, auctions.id))
				.where(and(eq(auctions.id, auctionId), eq(bids.status, "active")))
				.orderBy(sql`${bids.amount} DESC`)
				.limit(5); // Assume 5 units
			results.forEach((r) => winners.set(r.bidderId, r.id));
		}
		return winners;
	}
}
