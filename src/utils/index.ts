// Core Utilities and Constants for Auction Engine

// Auction lifecycle helpers
export * from "./auction-helpers";
// Bid processing utilities
export * from "./bid-helpers";
// Constants and configuration
export * from "./constants";
// Re-export commonly used utilities for convenience
export {
	AUCTION_DURATION,
	AUCTION_TYPES,
	AUTO_EXTENSION,
	BIDDER_LIMITS,
	ERROR_CODES,
	FEATURE_FLAGS,
	NOTIFICATION_TYPES,
	PERFORMANCE_LIMITS,
	PRICE_INCREMENT,
	TIME_EXTENSION,
	USER_ROLES,
} from "./constants";
// Type-safe helper functions
export * from "./type-safe-helpers";

export {
	TYPE_SAFE_LIMITS,
	TypeSafeArithmetic,
	TypeSafeAuctionHelpers,
	TypeSafeComparisons,
	TypeSafeErrorMessages,
	TypeSafeFormatting,
	TypeSafeValidation,
} from "./type-safe-helpers";
