import { eq, sql } from "drizzle-orm";
import { db } from "../database/index";
import { auctions, outboxEvents } from "../database/schema";
import type {
	TAuctionId,
	TIdempotencyKey,
	TTimestamp,
	TUserId,
} from "../types/branded-types";
import {
	type AuctionData,
	type AuctionResult,
	AuctionStatus,
	type AuctionType,
	type CreateAuctionRequest,
	type Duration,
	type IAuctionQueries,
	type IAuctionService,
	type IWinnerQueries,
} from "../types/core-interfaces";

export class AuctionService implements IAuctionService {
	private auctionQueries: IAuctionQueries;
	private winnerQueries: IWinnerQueries;

	constructor(auctionQueries: IAuctionQueries, winnerQueries: IWinnerQueries) {
		this.auctionQueries = auctionQueries;
		this.winnerQueries = winnerQueries;
	}

	async createAuction(
		req: CreateAuctionRequest & { idempotencyKey?: TIdempotencyKey },
	): Promise<TAuctionId> {
		const { idempotencyKey, ...auctionReq } = req;

		// TODO: Add validation when auction config validator is available
		// validateAuctionConfig(auctionReq);

		// Idempotency check (assume query method)
		if (idempotencyKey) {
			const existingId =
				await this.auctionQueries.getByIdempotency(idempotencyKey);
			if (existingId) return existingId;
		}

		return db.transaction(async (tx) => {
			// Insert auction via query
			const id = await this.auctionQueries.createAuction(tx, auctionReq);

			// Outbox insert
			await tx.insert(outboxEvents).values({
				eventType: "auction_created",
				auctionId: id,
				payload: { auctionId: id, ...auctionReq },
				createdAt: new Date(),
			});

			return id;
		});
	}

	async startAuction(auctionId: TAuctionId): Promise<void> {
		const auction = await this.getAuctionData(auctionId);
		if (!auction) throw new Error("Auction not found");
		// TODO: Implement auction start logic
		console.log(`Starting auction ${auctionId}`);
	}

	async pauseAuction(auctionId: TAuctionId, reason: string): Promise<void> {
		const auction = await this.getAuctionData(auctionId);
		if (!auction) throw new Error("Auction not found");
		// TODO: Implement auction pause logic
		console.log(`Pausing auction ${auctionId} with reason: ${reason}`);
	}

	async resumeAuction(auctionId: TAuctionId): Promise<void> {
		const auction = await this.getAuctionData(auctionId);
		if (!auction) throw new Error("Auction not found");
		// TODO: Implement auction resume logic
		console.log(`Resuming auction ${auctionId}`);
	}

	async endAuction(id: TAuctionId): Promise<AuctionResult> {
		const status = await this.auctionQueries.getStatus(id);
		if (status !== AuctionStatus.ACTIVE)
			throw new Error("Cannot end non-active auction");

		return db.transaction(async (tx) => {
			// Update status
			await tx
				.update(auctions)
				.set({ status: AuctionStatus.COMPLETED })
				.where(eq(auctions.id, id));
		
			// Get auction type
			const type = await this.auctionQueries.getAuctionType(id);
		
			// Determine winner using the winner view (calculations on demand)
			const winnerResult = await tx.execute(sql`
				SELECT
					winner_id,
					winning_bid_id,
					winning_amount,
					final_price,
					determination_method,
					determined_at
				FROM v_auction_winners
				WHERE auction_id = ${id}
				LIMIT 1
			`);
		
			const winner = (winnerResult as unknown as any[])[0] || null;
			const winnerId = winner?.winner_id || null;
			const winningBidId = winner?.winning_bid_id || null;
			const finalPrice = winner?.final_price || await this.auctionQueries.getCurrentPrice(id, type);
		
			// Log winner determination for monitoring
			console.log(`[AuctionService] Auction ${id} (${type}) winner determined:`, {
				winnerId,
				winningBidId,
				finalPrice,
				determinationMethod: winner?.determination_method,
				timestamp: winner?.determined_at,
			});
		
			// Outbox
			await tx.insert(outboxEvents).values({
				eventType: "auction_ended",
				auctionId: id,
				payload: {
					auctionId: id,
					winnerId,
					finalPrice,
					winningBidId,
					determinationMethod: winner?.determination_method,
				},
				createdAt: new Date(),
			});
		
			return {
				auctionId: id,
				winnerId: winnerId || undefined,
				winningBidId: winningBidId || undefined,
				finalPrice,
				totalBids: await this.auctionQueries.getBidCount(id),
				endedAt: Date.now() as TTimestamp,
				resultType: winnerId ? "sold" : "no_bids",
			};
		});
	}

	async cancelAuction(auctionId: TAuctionId, reason: string): Promise<void> {
		const auction = await this.getAuctionData(auctionId);
		if (!auction) throw new Error("Auction not found");
		// TODO: Implement auction cancel logic
		console.log(`Canceling auction ${auctionId} with reason: ${reason}`);
	}

	async extendAuction(auctionId: TAuctionId, duration: number): Promise<void> {
		const auction = await this.getAuctionData(auctionId);
		if (!auction) throw new Error("Auction not found");
		// TODO: Implement auction extend logic
		console.log(`Extending auction ${auctionId} by ${duration}ms`);
	}

	async getAuctionData(id: TAuctionId): Promise<AuctionData | null> {
		return this.auctionQueries.getAuctionData(id);
	}

	async findAuctionsByStatus(status: AuctionStatus): Promise<AuctionData[]> {
		return this.auctionQueries.findAuctionsByStatus(status);
	}

	async findAuctionsByType(type: AuctionType): Promise<AuctionData[]> {
		return this.auctionQueries.findAuctionsByType(type);
	}
}
