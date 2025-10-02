import { db } from "./src/database/index";
import { AuctionQueries } from "./src/database/queries/auction-queries";
import { AuctionService } from "./src/services/auction-service";
import { BidService } from "./src/services/bid-service";

// Initialize queries with DI
const auctionQueries = new AuctionQueries(db);

// Initialize services with DI
const auctionService = new AuctionService(
	auctionQueries,
	{} as any, // winnerQueries - placeholder
	db,
	{} as any, // outboxRepo - placeholder
);

const bidService = new BidService(
	{} as any, // bidQueries - placeholder
	auctionQueries,
	db,
	{} as any, // outboxRepo - placeholder
);

console.log("Auction system initialized with DI!");
