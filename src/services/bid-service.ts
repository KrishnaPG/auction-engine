import { eq } from "drizzle-orm";
import { validateBidAmount } from "../business-rules/validators/bid-validator"; // Assume
import { bids, outboxEvents } from "../database/schema";
import type {
	TAuctionId,
	TBidAmount,
	TBidId,
	TIdempotencyKey,
	TTimestamp,
	TUserId,
} from "../types/branded-types";
import type {
	BidData,
	BidResult,
	BidStatus,
	BidValidation,
	IAuctionQueries,
	IBidQueries,
	IBidService,
	IDatabaseAdapter,
	IOutboxRepository,
	PlaceBidRequest,
} from "../types/core-interfaces";

export class BidService implements IBidService {
	private bidQueries: IBidQueries;
	private auctionQueries: IAuctionQueries; // For validation
	private dbAdapter: IDatabaseAdapter;
	private outboxRepo: IOutboxRepository;

	constructor(
		bidQueries: IBidQueries,
		auctionQueries: IAuctionQueries,
		dbAdapter: IDatabaseAdapter,
		outboxRepo: IOutboxRepository,
	) {
		this.bidQueries = bidQueries;
		this.auctionQueries = auctionQueries;
		this.dbAdapter = dbAdapter;
		this.outboxRepo = outboxRepo;
	}

	async placeBid(
		req: PlaceBidRequest & { idempotencyKey: TIdempotencyKey },
	): Promise<TBidId> {
		const { idempotencyKey, ...bidReq } = req;

		// Validate amount
		validateBidAmount(bidReq.amount);

		return this.dbAdapter.executeInTransaction(async (tx) => {
			// Idempotency
			const existing = await this.bidQueries.getByIdempotency(
				idempotencyKey,
			);
			if (existing) return existing.id;

			// Preconditions
			const canPlace = await this.auctionQueries.canPlaceBid(
				bidReq.auctionId,
				bidReq.amount,
			);
			if (!canPlace) throw new Error("Cannot place bid");

			// Insert bid
			const id = await this.bidQueries.placeBid(tx, {
				...bidReq,
				amount: bidReq.amount,
				idempotencyKey,
			});

			// Outbox
			await tx.insert(outboxEvents).values({
				event_type: "bid_placed",
				payload: {
					bidId: id,
					auctionId: bidReq.auctionId,
					amount: bidReq.amount,
				},
				created_at: Date.now() as TTimestamp,
			});

			return id;
		});
	}

	async retractBid(bidId: TBidId, reason: string): Promise<void> {
		// Check can retract via query (status active, time < end - 5min, etc.)
		const bid = await this.bidQueries.getBidData(bidId); // Assume
		if (!bid || bid.status !== "active")
			throw new Error("Cannot retract");

		this.dbAdapter.executeInTransaction(async (tx) => {
			await tx
				.update(bids)
				.set({ status: "retracted" })
				.where(eq(bids.id, bidId));
			await tx.insert(outboxEvents).values({
				event_type: "bid_retracted",
				payload: { bidId, reason },
				created_at: Date.now() as TTimestamp,
			});
		});
	}

	async validateBid(
		auctionId: TAuctionId,
		amount: TBidAmount,
	): Promise<BidValidation> {
		const isValid = await this.auctionQueries.canPlaceBid(auctionId, amount);
		return {
			isValid,
			errors: isValid ? [] : ["Bid amount is too low or auction is not active"],
			warnings: [],
		};
	}


	getBidHistory(auctionId: TAuctionId): Promise<BidData[]>
	{
		return this.bidQueries.getBidsByAuction(auctionId);
	}

	getUserBids(userId: TUserId): Promise<BidData[]>
	{
		return this.bidQueries.findBidsByBidder(userId);
	}

	getWinningBids(auctionId: TAuctionId): Promise<BidData[]>
	{
		return this.bidQueries.getWinningBids(auctionId);
	}

	getBid(bidId: TBidId): Promise<BidData | null>
	{
		return this.bidQueries.getBidData(bidId); // Assume
	}
}
