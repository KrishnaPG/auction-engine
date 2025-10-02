import { and, eq, gt, gte, lt, lte, sql } from "drizzle-orm";
import type { TCurrency, TIdempotencyKey, TUserId } from "../../types";
import type {
	AuctionData,
	AuctionStatus,
	AuctionType,
	CreateAuctionRequest,
	IAuctionQueries,
	QueryCriteria,
	TAuctionId,
	TBidAmount,
} from "../../types/core-interfaces";
import {
	Money,
	AuctionStatus as StatusEnum,
} from "../../types/core-interfaces";
import { db } from "../drizzle-adapter";
import { auctions, bids } from "../schema"; // Assume schema defined

export class AuctionQueries implements IAuctionQueries {
	async getAuctionData(id: TAuctionId): Promise<AuctionData | null> {
		const [data] = await db.select().from(auctions).where(eq(auctions.id, id));
		if (!data) return null;
		data.status = await this.getStatus(id);
		return data as AuctionData;
	}

	async getCurrentPrice(id: TAuctionId): Promise<Money> {
		const [result] = await db
			.select({
				price: sql`COALESCE(MAX(${bids.amount}), ${auctions.startingPrice})`,
			})
			.from(auctions)
			.leftJoin(bids, eq(bids.auctionId, auctions.id))
			.where(eq(auctions.id, id))
			.groupBy(auctions.id, auctions.startingPrice);
		return new Money(result.price, "USD" as TCurrency); // Assume currency
	}

	async getStatus(id: TAuctionId): Promise<AuctionStatus> {
		const [result] = await db
			.select({
				status: sql<AuctionStatus>`CASE
          WHEN ${auctions.startTime} > NOW() THEN ${StatusEnum.SCHEDULED}
          WHEN ${auctions.endTime} < NOW() THEN ${StatusEnum.COMPLETED}
          WHEN ${auctions.status} = ${StatusEnum.PAUSED} THEN ${StatusEnum.PAUSED}
          ELSE ${StatusEnum.ACTIVE}
        END`,
			})
			.from(auctions)
			.where(eq(auctions.id, id));
		return result.status;
	}

	async canPlaceBid(
		auctionId: TAuctionId,
		amount: TBidAmount,
	): Promise<boolean> {
		const status = await this.getStatus(auctionId);
		if (status !== StatusEnum.ACTIVE) return false;
		const currentPrice = await this.getCurrentPrice(auctionId);
		const [auction] = await db
			.select({ minIncrement: auctions.minIncrement })
			.from(auctions)
			.where(eq(auctions.id, auctionId));
		return amount > currentPrice.amount + auction.minIncrement;
	}

	async createAuction(
		tx: any,
		config: CreateAuctionRequest,
	): Promise<TAuctionId> {
		const [result] = await tx
			.insert(auctions)
			.values({
				title: config.title,
				description: config.description,
				type: config.type,
				startingPrice: config.startingPrice.amount,
				reservePrice: config.reservePrice?.amount,
				minIncrement: config.minBidIncrement.amount,
				startTime: config.startTime,
				endTime: config.endTime,
				createdBy: config.createdBy,
				status: StatusEnum.DRAFT,
				version: 1,
			})
			.returning({ id: auctions.id });
		return result.id;
	}

	async updateAuction(
		id: TAuctionId,
		updates: Partial<AuctionData>,
	): Promise<void> {
		await db.update(auctions).set(updates).where(eq(auctions.id, id));
	}

	async findAuctions(criteria?: QueryCriteria): Promise<AuctionData[]> {
		let query = db.select().from(auctions);
		if (criteria?.filters) {
			// Build dynamic where (stub for simplicity)
			criteria.filters.forEach((f) => {
				if (f.field === "status" && f.operator === "equals")
					query = query.where(eq(sql`status`, f.value));
			});
		}
		if (criteria?.sortBy) {
			// Stub
		}
		if (criteria?.pagination) {
			query = query
				.limit(criteria.pagination.limit)
				.offset(criteria.pagination.offset || 0);
		}
		const results = await query;
		return Promise.all(
			results.map((r) => this.getAuctionData(r.id as TAuctionId)),
		);
	}

	async findActiveAuctions(): Promise<AuctionData[]> {
		return this.findAuctions({
			filters: [
				{ field: "status", operator: "equals", value: StatusEnum.ACTIVE },
			],
		});
	}

	async findAuctionsByType(type: AuctionType): Promise<AuctionData[]> {
		const results = await db
			.select()
			.from(auctions)
			.where(eq(auctions.type, type));
		return Promise.all(
			results.map((r) => this.getAuctionData(r.id as TAuctionId)),
		);
	}

	async findAuctionsByCreator(creatorId: TUserId): Promise<AuctionData[]> {
		const results = await db
			.select()
			.from(auctions)
			.where(eq(auctions.createdBy, creatorId));
		return Promise.all(
			results.map((r) => this.getAuctionData(r.id as TAuctionId)),
		);
	}

	// Stub for getType
	async getType(id: TAuctionId): Promise<AuctionType> {
		const [data] = await db
			.select({ type: auctions.type })
			.from(auctions)
			.where(eq(auctions.id, id));
		return data.type;
	}

	// Stub for getBidCount
	async getBidCount(id: TAuctionId): Promise<number> {
		const [result] = await db
			.select({ count: sql<number>`COUNT(*)` })
			.from(bids)
			.where(eq(bids.auctionId, id));
		return result.count;
	}

	// Stub for getByIdempotency
	async getByIdempotency(key: TIdempotencyKey): Promise<TAuctionId | null> {
		// Assume idempotency table or auctions.idempotency_key
		const [result] = await db
			.select({ id: auctions.id })
			.from(auctions)
			.where(eq(auctions.idempotencyKey, key));
		return result ? result.id : null;
	}
}
