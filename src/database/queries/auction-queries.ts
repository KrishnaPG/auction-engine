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
	IDatabaseAdapter,
	QueryCriteria,
	TAuctionId,
	TBidAmount,
	TBidId,
	TCurrentPrice,
	Tx,
} from "../../types/core-interfaces";
import { AuctionStatus as StatusEnum } from "../../types/core-interfaces";
import { auctionConfigurations, auctions, bids, outboxEvents } from "../schema";

export class AuctionQueries implements IAuctionQueries {
	private db: IDatabaseAdapter;

	constructor(db: IDatabaseAdapter) {
		this.db = db;
	}

	async getAuctionData(id: TAuctionId): Promise<AuctionData | null> {
		const drizzle = this.db.getDrizzle();
		const [data] = await drizzle
			.select()
			.from(auctions)
			.where(eq(auctions.id, id));
		if (!data) return null;
		data.status = await this.getStatus(id);
		return data as AuctionData;
	}

	async getCurrentPrice(
		auctionId: TAuctionId,
		type: AuctionType,
	): Promise<TCurrentPrice> {
		const drizzle = this.db.getDrizzle();
		let query;
		switch (type) {
			case "english":
				query = drizzle
					.select({
						price: sql<number>`COALESCE(MAX(${bids.amount}), ${auctions.startingPrice})`,
					})
					.from(auctions)
					.leftJoin(bids, eq(bids.auctionId, auctions.id))
					.where(eq(auctions.id, auctionId));
				break;
			case "dutch":
				query = drizzle
					.select({
						price: sql<number>`GREATEST(${auctions.startingPrice} - (EXTRACT(EPOCH FROM (NOW() - ${auctions.startTime})) * ${auctions.minIncrement}), ${auctions.reservePrice})`,
					})
					.from(auctions)
					.where(eq(auctions.id, auctionId));
				break;
			case "reverse":
				query = drizzle
					.select({
						price: sql<number>`COALESCE(MIN(${bids.amount}), ${auctions.startingPrice})`,
					})
					.from(auctions)
					.leftJoin(bids, eq(bids.auctionId, auctions.id))
					.where(eq(auctions.id, auctionId));
				break;
			case "vickrey":
				query = drizzle
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
				query = drizzle
					.select({
						price: sql<number>`COALESCE(MAX(${bids.amount}), ${auctions.startingPrice})`,
					})
					.from(auctions)
					.leftJoin(bids, eq(bids.auctionId, auctions.id))
					.where(eq(auctions.id, auctionId));
				break;
			case "double":
				query = drizzle
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
				query = drizzle
					.select({ price: auctions.currentPrice })
					.from(auctions)
					.where(eq(auctions.id, auctionId));
		}
		const [result] = await query;
		return brand<TCurrentPrice>(result.price);
	}

	async getStatus(id: TAuctionId): Promise<AuctionStatus> {
		const drizzle = this.db.getDrizzle();
		const [result] = await drizzle
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
		const type = await this.getType(auctionId);
		const currentPrice = await this.getCurrentPrice(auctionId, type);
		const drizzle = this.db.getDrizzle();
		const [auction] = await drizzle
			.select({ minIncrement: auctions.minIncrement })
			.from(auctions)
			.where(eq(auctions.id, auctionId));
		return amount > currentPrice + auction.minIncrement;
	}

	async createAuction(tx: Tx, req: CreateAuctionRequest): Promise<TAuctionId> {
		if (req.idempotencyKey) {
			const existing = await this.getByIdempotency(req.idempotencyKey);
			if (existing) return existing;
		}
		const drizzle = this.db.getDrizzle();
		const [result] = await drizzle
			.insert(auctions)
			.values({
				title: req.title,
				description: req.description,
				type: req.type,
				startingPrice: req.startingPrice.amount,
				reservePrice: req.reservePrice?.amount,
				minIncrement: req.minBidIncrement.amount,
				startTime: req.startTime,
				endTime: req.endTime,
				createdBy: req.createdBy,
				status: StatusEnum.DRAFT,
				version: 1,
				idempotencyKey: req.idempotencyKey,
			})
			.returning({ id: auctions.id });
		return brand<TAuctionId>(result.id);
	}

	async updateAuction(
		tx: Tx,
		id: TAuctionId,
		updates: Partial<AuctionData>,
	): Promise<void> {
		const drizzle = this.db.getDrizzle();
		await drizzle
			.update(auctions)
			.set({ ...updates, updatedAt: new Date() })
			.where(eq(auctions.id, id));
	}

	async setAuctionConfig(
		tx: Tx,
		auctionId: TAuctionId,
		config: AuctionConfig,
	): Promise<void> {
		const drizzle = this.db.getDrizzle();
		await drizzle
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
		tx: Tx,
		auctionId: TAuctionId,
		newStatus: AuctionStatus,
		reason?: string,
	): Promise<void> {
		const drizzle = this.db.getDrizzle();
		const [auction] = await drizzle
			.select({ version: auctions.version })
			.from(auctions)
			.where(eq(auctions.id, auctionId));
		await drizzle
			.update(auctions)
			.set({
				status: newStatus,
				updatedAt: new Date(),
				version: (auction.version || 0) + 1,
			})
			.where(eq(auctions.id, auctionId));
		await drizzle.insert(outboxEvents).values({
			eventType: "status_changed",
			auctionId,
			payload: { auctionId, status: newStatus, reason } as any,
		});
	}

	async findAuctions(criteria?: QueryCriteria): Promise<AuctionData[]> {
		const drizzle = this.db.getDrizzle();
		let query = drizzle.select().from(auctions);
		if (criteria?.filters) {
			criteria.filters.forEach((f) => {
				if (f.field === "status" && f.operator === "equals")
					query = query.where(eq(sql`status`, f.value));
			});
		}
		if (criteria?.pagination) {
			query = query
				.limit(criteria.pagination.limit)
				.offset(criteria.pagination.offset || 0);
		}
		const results = await query;
		return Promise.all(
			results.map((r) => this.getAuctionData(brand<TAuctionId>(r.id))),
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
		const drizzle = this.db.getDrizzle();
		const results = await drizzle
			.select()
			.from(auctions)
			.where(eq(auctions.type, type));
		return Promise.all(
			results.map((r) => this.getAuctionData(brand<TAuctionId>(r.id))),
		);
	}

	async findAuctionsByCreator(creatorId: TUserId): Promise<AuctionData[]> {
		const drizzle = this.db.getDrizzle();
		const results = await drizzle
			.select()
			.from(auctions)
			.where(eq(auctions.createdBy, creatorId));
		return Promise.all(
			results.map((r) => this.getAuctionData(brand<TAuctionId>(r.id))),
		);
	}

	async getType(id: TAuctionId): Promise<AuctionType> {
		const drizzle = this.db.getDrizzle();
		const [data] = await drizzle
			.select({ type: auctions.type })
			.from(auctions)
			.where(eq(auctions.id, id));
		return data.type;
	}

	async getBidCount(id: TAuctionId): Promise<number> {
		const drizzle = this.db.getDrizzle();
		const [result] = await drizzle
			.select({ count: sql<number>`COUNT(*)` })
			.from(bids)
			.where(eq(bids.auctionId, id));
		return result.count;
	}

	async getByIdempotency(key: TIdempotencyKey): Promise<TAuctionId | null> {
		const drizzle = this.db.getDrizzle();
		const [result] = await drizzle
			.select({ id: auctions.id })
			.from(auctions)
			.where(eq(auctions.idempotencyKey, key));
		return result ? brand<TAuctionId>(result.id) : null;
	}

	async placeBid(
		tx: Tx,
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
		const drizzle = this.db.getDrizzle();
		const [result] = await drizzle
			.insert(bids)
			.values({
				auctionId: bidData.auctionId,
				bidderId: bidData.bidderId,
				amount: bidData.amount,
				quantity: bidData.quantity || 1,
				status: "active",
				version: 1,
				idempotencyKey: bidData.idempotencyKey,
			})
			.returning({ id: bids.id });
		await drizzle.insert(outboxEvents).values({
			eventType: "bid_placed",
			auctionId: bidData.auctionId,
			payload: { bidId: result.id, ...bidData } as any,
		});
		return brand<TBidId>(result.id);
	}

	async getBidByIdempotency(
		key: TIdempotencyKey,
	): Promise<{ id: TBidId } | null> {
		const drizzle = this.db.getDrizzle();
		const [result] = await drizzle
			.select({ id: bids.id })
			.from(bids)
			.where(eq(bids.idempotencyKey, key));
		return result ? { id: brand<TBidId>(result.id) } : null;
	}
}
