import { eq } from "drizzle-orm";
import { validateBidAmount } from "../business-rules/validators/bid-validator"; // Assume
import { executeInTx } from "../database/drizzle-adapter";
import { bids, outbox } from "../database/schema";
import type {
	TAuctionId,
	TBidId,
	TIdempotencyKey,
	TTimestamp,
	TUserId,
} from "../types/branded-types";
import type {
	BidData,
	BidResult,
	BidValidation,
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

		return executeInTx(async (tx) => {
			// Idempotency
			const existing = await this.bidQueries.getByIdempotency(
				tx,
				idempotencyKey,
			);
			if (existing) return existing.id;

			// Preconditions
			const canPlace = await this.auctionQueries.canPlaceBid(
				tx,
				bidReq.auctionId,
				bidReq.amount,
			);
			if (!canPlace) throw new Error("Cannot place bid");

			// Insert bid
			const id = await this.bidQueries.placeBid(tx, {
				...bidReq,
				idempotencyKey,
			});

			// Outbox
			await tx.insert(outbox).values({
				event_type: "bid_placed",
				payload: {
					bidId: id,
					auctionId: bidReq.auctionId,
					amount: bidReq.amount,
				},
				created_at: new Date() as TTimestamp,
			});

			return id;
		});
	}

	async retractBid(bidId: TBidId, reason: string): Promise<void> {
		// Check can retract via query (status active, time < end - 5min, etc.)
		const bid = await this.bidQueries.getBidData(bidId); // Assume
		if (!bid || bid.status !== BidStatus.ACTIVE)
			throw new Error("Cannot retract");

		executeInTx(async (tx) => {
			await tx
				.update(bids)
				.set({ status: BidStatus.RETRACTED })
				.where(eq(bids.id, bidId));
			await tx.insert(outbox).values({
				event_type: "bid_retracted",
				payload: { bidId, reason },
				created_at: new Date() as TTimestamp,
			});
		});
	}

	async validateBid(
		auctionId: TAuctionId,
		amount: TBidAmount,
	): Promise<BidValidation> {
		return this.auctionQueries.canPlaceBid(auctionId, amount); // Returns validation object
	}
}

async;
getBidHistory(auctionId: TAuctionId)
: Promise<BidData[]>
{
	return this.bidQueries.getBidsByAuction(auctionId);
}

async;
getUserBids(userId: TUserId)
: Promise<BidData[]>
{
	return this.bidQueries.findBidsByBidder(userId);
}

async;
getWinningBids(auctionId: TAuctionId)
: Promise<BidData[]>
{
	return this.bidQueries.getWinningBids(auctionId);
}

async;
getBid(bidId: TBidId)
: Promise<BidData | null>
{
	return this.bidQueries.getBidData(bidId); // Assume
}
}
