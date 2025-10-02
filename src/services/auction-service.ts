import { eq } from "drizzle-orm";
import { validateAuctionConfig } from "../business-rules/validators/auction-config-validator";
import { executeInTx } from "../database/drizzle-adapter";
import { outbox } from "../database/schema";
import type {
	TAuctionId,
	TIdempotencyKey,
	TTimestamp,
	TUserId,
} from "../types/branded-types";
import type {
	AuctionData,
	AuctionResult,
	AuctionStatus,
	AuctionType,
	CreateAuctionRequest,
	IAuctionQueries,
	IAuctionService,
	IDatabaseAdapter,
	IOutboxRepository,
	IWinnerQueries,
} from "../types/core-interfaces";

export class AuctionService implements IAuctionService {
	private auctionQueries: IAuctionQueries;
	private winnerQueries: IWinnerQueries;
	private dbAdapter: IDatabaseAdapter;
	private outboxRepo: IOutboxRepository;

	constructor(
		auctionQueries: IAuctionQueries,
		winnerQueries: IWinnerQueries,
		dbAdapter: IDatabaseAdapter,
		outboxRepo: IOutboxRepository,
	) {
		this.auctionQueries = auctionQueries;
		this.winnerQueries = winnerQueries;
		this.dbAdapter = dbAdapter;
		this.outboxRepo = outboxRepo;
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

		return executeInTx(async (tx) => {
			// Insert auction via query
			const id = await this.auctionQueries.createAuction(tx, auctionReq);

			// Outbox insert
			await tx.insert(outbox).values({
				event_type: "auction_created",
				payload: { auctionId: id, ...auctionReq },
				idempotency_key: idempotencyKey,
				created_at: new Date() as TTimestamp,
			});

			return id;
		});
	}

	async startAuction(auctionId: TAuctionId): Promise<void> {
		const auction = await this.getAuction(auctionId);
		if (!auction) throw new Error("Auction not found");
		await auction.placeBid(null as any, this.auctionRepo, this.bidRepo); // Stub
	}

	async pauseAuction(auctionId: TAuctionId, reason: string): Promise<void> {
		const auction = await this.getAuction(auctionId);
		if (!auction) throw new Error("Auction not found");
		await auction.pause(reason, this.auctionRepo);
	}

	async resumeAuction(auctionId: TAuctionId): Promise<void> {
		const auction = await this.getAuction(auctionId);
		if (!auction) throw new Error("Auction not found");
		await auction.resume(this.auctionRepo);
	}

	async endAuction(id: TAuctionId): Promise<AuctionResult> {
		const status = await this.auctionQueries.getStatus(id);
		if (status !== AuctionStatus.ACTIVE)
			throw new Error("Cannot end non-active auction");

		return executeInTx(async (tx) => {
			// Update status
			await tx
				.update(auctions)
				.set({ status: AuctionStatus.COMPLETED })
				.where(eq(auctions.id, id));

			// Determine winner
			const type = await this.auctionQueries.getType(id); // Assume method
			const winnerId = await this.winnerQueries.determineWinner(tx, id, type);
			const finalPrice = await this.auctionQueries.getCurrentPrice(id, type);

			// Outbox
			await tx.insert(outbox).values({
				event_type: "auction_ended",
				payload: { auctionId: id, winnerId, finalPrice },
				created_at: new Date() as TTimestamp,
			});

			return {
				auctionId: id,
				winnerId,
				winningBidId: null, // From winner query if needed
				finalPrice,
				totalBids: await this.auctionQueries.getBidCount(id), // Assume
				endedAt: new Date() as TTimestamp,
				resultType: winnerId ? "sold" : "no_bids",
			};
		});
	}

	async cancelAuction(auctionId: TAuctionId, reason: string): Promise<void> {
		const auction = await this.getAuction(auctionId);
		if (!auction) throw new Error("Auction not found");
		await auction.cancel(reason, this.auctionRepo);
	}

	async extendAuction(
		auctionId: TAuctionId,
		duration: Duration,
	): Promise<void> {
		const auction = await this.getAuction(auctionId);
		if (!auction) throw new Error("Auction not found");
		await auction.extend(duration, this.auctionRepo);
	}

	async getAuctionData(id: TAuctionId): Promise<AuctionData | null> {
		return this.auctionQueries.getAuctionData(id);
	}

	async findAuctionsByStatus(status: AuctionStatus): Promise<AuctionData[]> {
		return this.auctionQueries.findAuctionsByStatus(status); // Assume method or criteria
	}

	async findAuctionsByType(type: AuctionType): Promise<AuctionData[]> {
		return this.auctionQueries.findAuctionsByType(type);
	}
}
