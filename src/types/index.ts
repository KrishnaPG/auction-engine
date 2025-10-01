// Core TypeScript Types and Interfaces for Auction System

export * from "./branded-constructors";
export {
	createAuctionDuration,
	createAuctionEndTime,
	createAuctionId,
	createAuctionStartTime,
	createBidAmount,
	createBidId,
	createBidQuantity,
	createCurrency,
	createCurrentPrice,
	createItemQuantity,
	createStartingPrice,
	createTimestamp,
	createUserId,
} from "./branded-constructors";
// Re-export commonly used types for convenience
export type {
	TAuctionDuration,
	TAuctionEndTime,
	TAuctionId,
	TAuctionStartTime,
	TBidAmount,
	TBidId,
	TBidQuantity,
	TCurrency,
	TCurrentPrice,
	TItemQuantity,
	TStartingPrice,
	TTimestamp,
	TUserId,
} from "./branded-types";
// Branded Types System
export * from "./branded-types";
export * from "./branded-validators";
export {
	isValidAuctionDuration,
	isValidAuctionEndTime,
	isValidAuctionId,
	isValidAuctionStartTime,
	isValidBidAmount,
	isValidBidId,
	isValidBidQuantity,
	isValidCurrency,
	isValidCurrentPrice,
	isValidItemQuantity,
	isValidStartingPrice,
	isValidTimestamp,
	isValidUserId,
	validateAuctionTiming,
	validateBidConstraints,
	validateMultiUnitConstraints,
} from "./branded-validators";
// Core Domain Interfaces
export * from "./core-interfaces";
export {
	AccountStatus,
	AuctionStatus,
	AuctionType,
	BidStatus,
	UserRole,
} from "./core-interfaces";
