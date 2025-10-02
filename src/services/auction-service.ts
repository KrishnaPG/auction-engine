import { eq } from "drizzle-orm";
import { validateAuctionConfig } from "../business-rules/validators/auction-config-validator";
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

	constructor(
		auctionQueries: IAuctionQueries,
		winnerQueries: IWinnerQueries,
	) {
		this.auctionQueries = auctionQueries;
		this.winnerQueries = winnerQueries;
	}

	async createAuction(
		req: CreateAuctionRequest & { idempotencyKey?: TIdempotencyKey },
	): Promise<TAuctionId> {
		const { idempotencyKey, ...auctionReq } = req;

		// Validate
		validateAuctionConfig(auctionReq);

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
		
			// Determine winner
			const type = await this.auctionQueries.getAuctionType(id);
			const winnerId = await this.winnerQueries.determineWinner(tx, id, type);
			const finalPrice = await this.auctionQueries.getCurrentPrice(id, type);
		
			// Outbox
			await tx.insert(outboxEvents).values({
				eventType: "auction_ended",
				auctionId: id,
				payload: { auctionId: id, winnerId, finalPrice },
				createdAt: new Date(),
			});
		
			return {
				auctionId: id,
				winnerId: winnerId || undefined,
				winningBidId: undefined, // From winner query if needed
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

	async extendAuction(
		auctionId: TAuctionId,
		duration: number,
	): Promise<void> {
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
