import { and, eq, gt, gte, lt, lte, sql } from "drizzle-orm";
import { brand } from "../../types/branded-constructors";
import type { TIdempotencyKey, TUserId } from "../../types/branded-types";
import type {
	AuctionConfig,
	AuctionData,
	AuctionStatus,
	AuctionType,
	CreateAuctionRequest,
	IAuctionQueries,
	QueryCriteria,
	TAuctionId,
	TBidAmount,
	TBidId,
	TCurrentPrice,
	Tx,
} from "../../types/core-interfaces";
import { AuctionStatus as StatusEnum } from "../../types/core-interfaces";
import { db } from "../drizzle-adapter";
import { auctionConfigurations, auctions, bids, outboxEvents } from "../schema";

export class AuctionQueries implements IAuctionQueries {

	async getAuctionData(id: TAuctionId): Promise<AuctionData | null> {
		const [data] = await db.select().from(auctions).where(eq(auctions.id, id));
		if (!data) return null;
		data.status = await this.getStatus(id);
		return data as unknown as AuctionData;
	}

	async getCurrentPrice(
		auctionId: TAuctionId,
		type: AuctionType,
	): Promise<TCurrentPrice> {
		let query: any;
		switch (type) {
			case "english":
				query = db
					.select({
						price: sql<number>`COALESCE(MAX(${bids.amount}), ${auctions.startingPrice})`,
					})
					.from(auctions)
					.leftJoin(bids, eq(bids.auctionId, auctions.id))
					.where(eq(auctions.id, auctionId));
				break;
			case "dutch":
				query = db
					.select({
						price: sql<number>`GREATEST(${auctions.startingPrice} - (EXTRACT(EPOCH FROM (NOW() - ${auctions.startTime})) * ${auctions.minIncrement}), ${auctions.reservePrice})`,
					})
					.from(auctions)
					.where(eq(auctions.id, auctionId));
				break;
			case "reverse":
				query = db
					.select({
						price: sql<number>`COALESCE(MIN(${bids.amount}), ${auctions.startingPrice})`,
					})
					.from(auctions)
					.leftJoin(bids, eq(bids.auctionId, auctions.id))
					.where(eq(auctions.id, auctionId));
				break;
			case "vickrey":
				query = db
					.select({
						price: sql<number>`(
							SELECT amount FROM (
								SELECT amount, ROW_NUMBER() OVER (ORDER BY amount DESC) as rn
								FROM bids WHERE auction_id = ${auctionId}
							) ranked WHERE rn = 2
						)`,
					})
					.from(auctions)
					.where(eq(auctions.id, auctionId));
				break;
			case "buy_it_now":
				query = db
					.select({
						price: sql<number>`COALESCE(MAX(${bids.amount}), ${auctions.startingPrice})`,
					})
					.from(auctions)
					.leftJoin(bids, eq(bids.auctionId, auctions.id))
					.where(eq(auctions.id, auctionId));
				break;
			case "double":
				query = db
					.select({
						price: sql<number>`(
							SELECT COALESCE(
								(SELECT MAX(b.amount) FROM bids b WHERE b.auction_id = ${auctionId} AND b.amount > 0),
								${auctions.startingPrice}
							)
						)`,
					})
					.from(auctions)
					.where(eq(auctions.id, auctionId));
				break;
			default:
				query = db
					.select({ price: auctions.currentPrice })
					.from(auctions)
					.where(eq(auctions.id, auctionId));
		}
		const [result] = await query;
		if (!result) throw new Error("No result found for current price");
		return brand<TCurrentPrice>(result.price);
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
		if (!result) throw new Error("No result found for status");
		return result.status;
	}

	async canPlaceBid(
		auctionId: TAuctionId,
		amount: TBidAmount,
	): Promise<boolean> {
		const status = await this.getStatus(auctionId);
		if (status !== StatusEnum.ACTIVE) return false;
		const type = await this.getType(auctionId);
		const currentPrice = await this.getCurrentPrice(auctionId, type);
		const [auction] = await db
			.select({ minIncrement: auctions.minIncrement })
			.from(auctions)
			.where(eq(auctions.id, auctionId));
		if (!auction) throw new Error("Auction not found");
		return amount.value > currentPrice + Number(auction.minIncrement);
	}

	async createAuction(req: CreateAuctionRequest): Promise<TAuctionId> {
		if (req.idempotencyKey) {
			const existing = await this.getByIdempotency(req.idempotencyKey);
			if (existing) return existing;
		}
		const [result] = await db
			.insert(auctions)
			.values({
				...req,
				startingPrice: req.startingPrice.toString(),
				reservePrice: req.reservePrice?.toString(),
				minIncrement: req.minIncrement.toString(),
				startTime: new Date(req.startTime),
				endTime: new Date(req.endTime),
				status: StatusEnum.DRAFT,
				version: 1,
			})
			.returning({ id: auctions.id });
		if (!result) throw new Error("Failed to create auction");
		return brand<TAuctionId>(result.id);
	}

	async updateAuction(
		tx: any,
		id: TAuctionId,
		updates: Partial<AuctionData>,
	): Promise<void> {
		await tx
			.update(auctions)
			.set({ ...updates, updatedAt: new Date() })
			.where(eq(auctions.id, id));
	}

	async setAuctionConfig(
		tx: any,
		auctionId: TAuctionId,
		config: AuctionConfig,
	): Promise<void> {
		await tx
			.insert(auctionConfigurations)
			.values({
				auctionId,
				typeSpecificParams: config as any,
			})
			.onConflictDoUpdate({
				target: auctionConfigurations.auctionId,
				set: { typeSpecificParams: config as any },
			});
	}

	async updateAuctionStatus(
		tx: any,
		auctionId: TAuctionId,
		newStatus: AuctionStatus,
		reason?: string,
	): Promise<void> {
		const [auction] = await tx
			.select({ version: auctions.version })
			.from(auctions)
			.where(eq(auctions.id, auctionId));
		if (!auction) throw new Error("Auction not found");
		await tx
			.update(auctions)
			.set({
				status: newStatus,
				updatedAt: new Date(),
				version: (auction.version || 0) + 1,
			})
			.where(eq(auctions.id, auctionId));
		await tx.insert(outboxEvents).values({
			eventType: "status_changed",
			auctionId,
			payload: { auctionId, status: newStatus, reason } as any,
		});
	}

	async findAuctions(criteria?: QueryCriteria): Promise<AuctionData[]> {
		let query = db.select().from(auctions);
		if (criteria?.filters) {
			criteria.filters.forEach((f) => {
				if (f.field === "status" && f.operator === "equals")
					query = query.where(eq(auctions.status, f.value));
			});
		}
		if (criteria?.pagination) {
			query = query
				.limit(criteria.pagination.limit)
				.offset(criteria.pagination.offset || 0);
		}
		const results = await query;
		const auctionData = await Promise.all(
			results.map((r) => this.getAuctionData(brand<TAuctionId>(r.id))),
		);
		return auctionData.filter((data): data is AuctionData => data !== null);
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
		const auctionData = await Promise.all(
			results.map((r) => this.getAuctionData(brand<TAuctionId>(r.id))),
		);
		return auctionData.filter((data): data is AuctionData => data !== null);
	}

	async findAuctionsByCreator(creatorId: TUserId): Promise<AuctionData[]> {
		const results = await db
			.select()
			.from(auctions)
			.where(eq(auctions.createdBy, creatorId));
		const auctionData = await Promise.all(
			results.map((r) => this.getAuctionData(brand<TAuctionId>(r.id))),
		);
		return auctionData.filter((data): data is AuctionData => data !== null);
	}

	async getType(id: TAuctionId): Promise<AuctionType> {
		const [data] = await db
			.select({ type: auctions.type })
			.from(auctions)
			.where(eq(auctions.id, id));
		if (!data) throw new Error("Auction not found");
		return data.type as AuctionType;
	}

	async getBidCount(id: TAuctionId): Promise<number> {
		const [result] = await db
			.select({ count: sql<number>`COUNT(*)` })
			.from(bids)
			.where(eq(bids.auctionId, id));
		if (!result) throw new Error("No result found for bid count");
		return result.count;
	}

	async getByIdempotency(key: TIdempotencyKey): Promise<TAuctionId | null> {
		const [result] = await db
			.select({ id: auctions.id })
			.from(auctions)
			.where(eq(auctions.idempotencyKey, key));
		return result ? brand<TAuctionId>(result.id) : null;
	}

	async placeBid(
		tx: any,
		bidData: {
			auctionId: TAuctionId;
			bidderId: TUserId;
			amount: TBidAmount;
			quantity?: number;
			idempotencyKey?: TIdempotencyKey;
		},
	): Promise<TBidId> {
		if (bidData.idempotencyKey) {
			const existing = await this.getBidByIdempotency(bidData.idempotencyKey);
			if (existing) return existing.id;
		}
		const [result] = await tx
			.insert(bids)
			.values({
				auctionId: bidData.auctionId,
				bidderId: bidData.bidderId,
				amount: bidData.amount.toString(),
				quantity: bidData.quantity || 1,
				status: "active",
				version: 1,
				idempotencyKey: bidData.idempotencyKey,
			})
			.returning({ id: bids.id });
		if (!result) throw new Error("Failed to place bid");
		await tx.insert(outboxEvents).values({
			eventType: "bid_placed",
			auctionId: bidData.auctionId,
			payload: { bidId: result.id, ...bidData } as any,
		});
		return brand<TBidId>(result.id);
	}

	async getBidByIdempotency(
		key: TIdempotencyKey,
	): Promise<{ id: TBidId } | null> {
		const [result] = await db
			.select({ id: bids.id })
			.from(bids)
			.where(eq(bids.idempotencyKey, key));
		return result ? { id: brand<TBidId>(result.id) } : null;
	}
}
