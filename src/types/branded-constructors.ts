// Type-Safe Constructor Functions for Branded Types

import type {
	TApprovalState,
	TAuctionDuration,
	TAuctionEndTime,
	TAuctionId,
	TAuctionItemId,
	TAuctionStartTime,
	TAuditId,
	TAutoExtensionCount,
	TAvailableUnits,
	TBidAmount,
	TBidDeadline,
	TBidderId,
	TBidderScore,
	TBidFee,
	TBidId,
	TBidQuantity,
	TBidRank,
	TBidTimeout,
	TBlindBid,
	TBundleId,
	TBuyItNowPrice,
	TCategoryId,
	TCombinationValue,
	TCoordinates,
	TCurrency,
	TCurrentPrice,
	TDepositAmount,
	TEliminationPrice,
	TEscrowAmount,
	TEventType,
	TExchangeRate,
	TGuaranteeAmount,
	TImmutableHash,
	TItemId,
	TItemQuantity,
	TLocationId,
	TLogLevel,
	TMaxBidders,
	TMaxBidsPerUser,
	TMinimumBid,
	TMinimumIncrement,
	TNotificationChannel,
	TNotificationId,
	TPackageId,
	TParticipantCount,
	TPaymentMethod,
	TPaymentStatus,
	TPennyBidFee,
	TPriceDrop,
	TPriceDropInterval,
	TPriceDropRate,
	TPriority,
	TRapidBidThreshold,
	TRefundAmount,
	TRegionCode,
	TRemainingUnits,
	TReservePrice,
	TRoundNumber,
	TRuleCategory,
	TRuleId,
	TRuleLimit,
	TRulePercentage,
	TRuleSeverity,
	TRuleThreshold,
	TScore,
	TSealedBid,
	TSecondPrice,
	TSellerId,
	TShippingZone,
	TSoldUnits,
	TStartingPrice,
	TTimeExtension,
	TTimeIncrement,
	TTimestamp,
	TTotalFees,
	TTransactionId,
	TUniqueBidders,
	TUnitQuantity,
	TUserId,
	TValidationStatus,
	TVickreyPrice,
	TWinningBid,
} from "./branded-types";

// Monetary constructors
export const createBidAmount = (value: number): TBidAmount => {
	if (value <= 0) {
		throw new Error("BidAmount must be greater than 0");
	}
	if (!Number.isInteger(value)) {
		throw new Error("BidAmount must be in whole cents");
	}
	return value as TBidAmount;
};

export const createReservePrice = (value: number): TReservePrice => {
	if (value <= 0) {
		throw new Error("ReservePrice must be greater than 0");
	}
	if (!Number.isInteger(value)) {
		throw new Error("ReservePrice must be in whole cents");
	}
	return value as TReservePrice;
};

export const createStartingPrice = (value: number): TStartingPrice => {
	if (value <= 0) {
		throw new Error("StartingPrice must be greater than 0");
	}
	if (!Number.isInteger(value)) {
		throw new Error("StartingPrice must be in whole cents");
	}
	return value as TStartingPrice;
};

export const createMinimumIncrement = (value: number): TMinimumIncrement => {
	if (value <= 0) {
		throw new Error("MinimumIncrement must be greater than 0");
	}
	if (!Number.isInteger(value)) {
		throw new Error("MinimumIncrement must be in whole cents");
	}
	return value as TMinimumIncrement;
};

export const createBuyItNowPrice = (value: number): TBuyItNowPrice => {
	if (value <= 0) {
		throw new Error("BuyItNowPrice must be greater than 0");
	}
	if (!Number.isInteger(value)) {
		throw new Error("BuyItNowPrice must be in whole cents");
	}
	return value as TBuyItNowPrice;
};

export const createPennyBidFee = (value: number): TPennyBidFee => {
	if (value <= 0) {
		throw new Error("PennyBidFee must be greater than 0");
	}
	if (!Number.isInteger(value)) {
		throw new Error("PennyBidFee must be in whole cents");
	}
	return value as TPennyBidFee;
};

export const createCurrency = (value: string): TCurrency => {
	if (!value || value.trim().length === 0) {
		throw new Error("Currency cannot be empty");
	}
	if (value.length !== 3) {
		throw new Error("Currency must be 3 characters (ISO 4217)");
	}
	return value.toUpperCase() as TCurrency;
};

export const createExchangeRate = (value: number): TExchangeRate => {
	if (value <= 0) {
		throw new Error("ExchangeRate must be greater than 0");
	}
	return value as TExchangeRate;
};

// Temporal constructors
export const createAuctionDuration = (
	milliseconds: number,
): TAuctionDuration => {
	if (milliseconds < 60000) {
		throw new Error("AuctionDuration must be at least 1 minute (60000ms)");
	}
	if (milliseconds > 2592000000) {
		throw new Error("AuctionDuration cannot exceed 30 days (2592000000ms)");
	}
	return milliseconds as TAuctionDuration;
};

export const createTimeExtension = (milliseconds: number): TTimeExtension => {
	if (milliseconds <= 0) {
		throw new Error("TimeExtension must be greater than 0");
	}
	return milliseconds as TTimeExtension;
};

export const createBidTimeout = (milliseconds: number): TBidTimeout => {
	if (milliseconds <= 0) {
		throw new Error("BidTimeout must be greater than 0");
	}
	return milliseconds as TBidTimeout;
};

export const createTimestamp = (unixTime: number): TTimestamp => {
	if (unixTime <= 0) {
		throw new Error("Timestamp must be greater than 0");
	}
	return unixTime as TTimestamp;
};

// Date-time constructors
export const createAuctionStartTime = (date: Date): TAuctionStartTime => {
	if (!(date instanceof Date) || isNaN(date.getTime())) {
		throw new Error("AuctionStartTime must be a valid Date");
	}
	return date as TAuctionStartTime;
};

export const createAuctionEndTime = (date: Date): TAuctionEndTime => {
	if (!(date instanceof Date) || isNaN(date.getTime())) {
		throw new Error("AuctionEndTime must be a valid Date");
	}
	return date as TAuctionEndTime;
};

export const createBidDeadline = (date: Date): TBidDeadline => {
	if (!(date instanceof Date) || isNaN(date.getTime())) {
		throw new Error("BidDeadline must be a valid Date");
	}
	return date as TBidDeadline;
};

// ID constructors
export const createAuctionId = (id: string): TAuctionId => {
	if (!id || id.trim().length === 0) {
		throw new Error("AuctionId cannot be empty");
	}
	return id as TAuctionId;
};

export const createBidId = (id: string): TBidId => {
	if (!id || id.trim().length === 0) {
		throw new Error("BidId cannot be empty");
	}
	return id as TBidId;
};

export const createUserId = (id: string): TUserId => {
	if (!id || id.trim().length === 0) {
		throw new Error("UserId cannot be empty");
	}
	return id as TUserId;
};

export const createItemId = (id: string): TItemId => {
	if (!id || id.trim().length === 0) {
		throw new Error("ItemId cannot be empty");
	}
	return id as TItemId;
};

export const createCategoryId = (id: string): TCategoryId => {
	if (!id || id.trim().length === 0) {
		throw new Error("CategoryId cannot be empty");
	}
	return id as TCategoryId;
};

// Composite ID constructors
export const createAuctionItemId = (id: string): TAuctionItemId => {
	if (!id || id.trim().length === 0) {
		throw new Error("AuctionItemId cannot be empty");
	}
	return id as TAuctionItemId;
};

export const createBidderId = (id: string): TBidderId => {
	if (!id || id.trim().length === 0) {
		throw new Error("BidderId cannot be empty");
	}
	return id as TBidderId;
};

export const createSellerId = (id: string): TSellerId => {
	if (!id || id.trim().length === 0) {
		throw new Error("SellerId cannot be empty");
	}
	return id as TSellerId;
};

// Quantity constructors
export const createItemQuantity = (value: number): TItemQuantity => {
	if (value <= 0) {
		throw new Error("ItemQuantity must be greater than 0");
	}
	if (!Number.isInteger(value)) {
		throw new Error("ItemQuantity must be a whole number");
	}
	return value as TItemQuantity;
};

export const createBidQuantity = (value: number): TBidQuantity => {
	if (value <= 0) {
		throw new Error("BidQuantity must be greater than 0");
	}
	if (!Number.isInteger(value)) {
		throw new Error("BidQuantity must be a whole number");
	}
	return value as TBidQuantity;
};

export const createMaxBidders = (value: number): TMaxBidders => {
	if (value <= 0) {
		throw new Error("MaxBidders must be greater than 0");
	}
	if (!Number.isInteger(value)) {
		throw new Error("MaxBidders must be a whole number");
	}
	return value as TMaxBidders;
};

export const createMaxBidsPerUser = (value: number): TMaxBidsPerUser => {
	if (value <= 0) {
		throw new Error("MaxBidsPerUser must be greater than 0");
	}
	if (!Number.isInteger(value)) {
		throw new Error("MaxBidsPerUser must be a whole number");
	}
	return value as TMaxBidsPerUser;
};

export const createAutoExtensionCount = (
	value: number,
): TAutoExtensionCount => {
	if (value < 0) {
		throw new Error("AutoExtensionCount cannot be negative");
	}
	if (!Number.isInteger(value)) {
		throw new Error("AutoExtensionCount must be a whole number");
	}
	return value as TAutoExtensionCount;
};

// Ranking and scoring constructors
export const createBidRank = (value: number): TBidRank => {
	if (value <= 0) {
		throw new Error("BidRank must be greater than 0");
	}
	if (!Number.isInteger(value)) {
		throw new Error("BidRank must be a whole number");
	}
	return value as TBidRank;
};

export const createScore = (value: number): TScore => {
	if (value < 0) {
		throw new Error("Score cannot be negative");
	}
	return value as TScore;
};

export const createPriority = (value: number): TPriority => {
	if (value < 0) {
		throw new Error("Priority cannot be negative");
	}
	if (!Number.isInteger(value)) {
		throw new Error("Priority must be a whole number");
	}
	return value as TPriority;
};

// English auction specific constructors
export const createCurrentPrice = (value: number): TCurrentPrice => {
	if (value <= 0) {
		throw new Error("CurrentPrice must be greater than 0");
	}
	if (!Number.isInteger(value)) {
		throw new Error("CurrentPrice must be in whole cents");
	}
	return value as TCurrentPrice;
};

export const createMinimumBid = (value: number): TMinimumBid => {
	if (value <= 0) {
		throw new Error("MinimumBid must be greater than 0");
	}
	if (!Number.isInteger(value)) {
		throw new Error("MinimumBid must be in whole cents");
	}
	return value as TMinimumBid;
};

export const createWinningBid = (value: number): TWinningBid => {
	if (value <= 0) {
		throw new Error("WinningBid must be greater than 0");
	}
	if (!Number.isInteger(value)) {
		throw new Error("WinningBid must be in whole cents");
	}
	return value as TWinningBid;
};

// Dutch auction specific constructors
export const createPriceDrop = (value: number): TPriceDrop => {
	if (value <= 0) {
		throw new Error("PriceDrop must be greater than 0");
	}
	if (!Number.isInteger(value)) {
		throw new Error("PriceDrop must be in whole cents");
	}
	return value as TPriceDrop;
};

export const createPriceDropInterval = (value: number): TPriceDropInterval => {
	if (value <= 0) {
		throw new Error("PriceDropInterval must be greater than 0");
	}
	if (!Number.isInteger(value)) {
		throw new Error("PriceDropInterval must be in whole seconds");
	}
	return value as TPriceDropInterval;
};

// Sealed-bid auction constructors
export const createSealedBid = (value: number): TSealedBid => {
	if (value <= 0) {
		throw new Error("SealedBid must be greater than 0");
	}
	if (!Number.isInteger(value)) {
		throw new Error("SealedBid must be in whole cents");
	}
	return value as TSealedBid;
};

export const createBlindBid = (value: number): TBlindBid => {
	if (value <= 0) {
		throw new Error("BlindBid must be greater than 0");
	}
	if (!Number.isInteger(value)) {
		throw new Error("BlindBid must be in whole cents");
	}
	return value as TBlindBid;
};

export const createBidderScore = (value: number): TBidderScore => {
	if (value < 0) {
		throw new Error("BidderScore cannot be negative");
	}
	return value as TBidderScore;
};

// Vickrey auction constructors
export const createSecondPrice = (value: number): TSecondPrice => {
	if (value <= 0) {
		throw new Error("SecondPrice must be greater than 0");
	}
	if (!Number.isInteger(value)) {
		throw new Error("SecondPrice must be in whole cents");
	}
	return value as TSecondPrice;
};

export const createVickreyPrice = (value: number): TVickreyPrice => {
	if (value <= 0) {
		throw new Error("VickreyPrice must be greater than 0");
	}
	if (!Number.isInteger(value)) {
		throw new Error("VickreyPrice must be in whole cents");
	}
	return value as TVickreyPrice;
};

// Multi-unit auction constructors
export const createUnitQuantity = (value: number): TUnitQuantity => {
	if (value <= 0) {
		throw new Error("UnitQuantity must be greater than 0");
	}
	if (!Number.isInteger(value)) {
		throw new Error("UnitQuantity must be a whole number");
	}
	return value as TUnitQuantity;
};

export const createAvailableUnits = (value: number): TAvailableUnits => {
	if (value <= 0) {
		throw new Error("AvailableUnits must be greater than 0");
	}
	if (!Number.isInteger(value)) {
		throw new Error("AvailableUnits must be a whole number");
	}
	return value as TAvailableUnits;
};

export const createSoldUnits = (value: number): TSoldUnits => {
	if (value < 0) {
		throw new Error("SoldUnits cannot be negative");
	}
	if (!Number.isInteger(value)) {
		throw new Error("SoldUnits must be a whole number");
	}
	return value as TSoldUnits;
};

export const createRemainingUnits = (value: number): TRemainingUnits => {
	if (value < 0) {
		throw new Error("RemainingUnits cannot be negative");
	}
	if (!Number.isInteger(value)) {
		throw new Error("RemainingUnits must be a whole number");
	}
	return value as TRemainingUnits;
};

// Combinatorial auction constructors
export const createPackageId = (id: string): TPackageId => {
	if (!id || id.trim().length === 0) {
		throw new Error("PackageId cannot be empty");
	}
	return id as TPackageId;
};

export const createBundleId = (id: string): TBundleId => {
	if (!id || id.trim().length === 0) {
		throw new Error("BundleId cannot be empty");
	}
	return id as TBundleId;
};

export const createCombinationValue = (value: number): TCombinationValue => {
	if (value <= 0) {
		throw new Error("CombinationValue must be greater than 0");
	}
	if (!Number.isInteger(value)) {
		throw new Error("CombinationValue must be in whole cents");
	}
	return value as TCombinationValue;
};

// Penny auction constructors
export const createBidFee = (value: number): TBidFee => {
	if (value <= 0) {
		throw new Error("BidFee must be greater than 0");
	}
	if (!Number.isInteger(value)) {
		throw new Error("BidFee must be in whole cents");
	}
	return value as TBidFee;
};

export const createTotalFees = (value: number): TTotalFees => {
	if (value < 0) {
		throw new Error("TotalFees cannot be negative");
	}
	if (!Number.isInteger(value)) {
		throw new Error("TotalFees must be in whole cents");
	}
	return value as TTotalFees;
};

export const createTimeIncrement = (value: number): TTimeIncrement => {
	if (value <= 0) {
		throw new Error("TimeIncrement must be greater than 0");
	}
	if (!Number.isInteger(value)) {
		throw new Error("TimeIncrement must be in whole seconds");
	}
	return value as TTimeIncrement;
};

export const createUniqueBidders = (value: number): TUniqueBidders => {
	if (value <= 0) {
		throw new Error("UniqueBidders must be greater than 0");
	}
	if (!Number.isInteger(value)) {
		throw new Error("UniqueBidders must be a whole number");
	}
	return value as TUniqueBidders;
};

// Japanese/Chinese auction constructors
export const createRoundNumber = (value: number): TRoundNumber => {
	if (value <= 0) {
		throw new Error("RoundNumber must be greater than 0");
	}
	if (!Number.isInteger(value)) {
		throw new Error("RoundNumber must be a whole number");
	}
	return value as TRoundNumber;
};

export const createParticipantCount = (value: number): TParticipantCount => {
	if (value <= 0) {
		throw new Error("ParticipantCount must be greater than 0");
	}
	if (!Number.isInteger(value)) {
		throw new Error("ParticipantCount must be a whole number");
	}
	return value as TParticipantCount;
};

export const createEliminationPrice = (value: number): TEliminationPrice => {
	if (value <= 0) {
		throw new Error("EliminationPrice must be greater than 0");
	}
	if (!Number.isInteger(value)) {
		throw new Error("EliminationPrice must be in whole cents");
	}
	return value as TEliminationPrice;
};

export const createPriceDropRate = (value: number): TPriceDropRate => {
	if (value <= 0) {
		throw new Error("PriceDropRate must be greater than 0");
	}
	if (!Number.isInteger(value)) {
		throw new Error("PriceDropRate must be in whole cents");
	}
	return value as TPriceDropRate;
};

export const createRapidBidThreshold = (value: number): TRapidBidThreshold => {
	if (value <= 0) {
		throw new Error("RapidBidThreshold must be greater than 0");
	}
	if (!Number.isInteger(value)) {
		throw new Error("RapidBidThreshold must be in whole seconds");
	}
	return value as TRapidBidThreshold;
};

// Business rule constructors
export const createRuleId = (id: string): TRuleId => {
	if (!id || id.trim().length === 0) {
		throw new Error("RuleId cannot be empty");
	}
	return id as TRuleId;
};

export const createRuleCategory = (category: string): TRuleCategory => {
	if (!category || category.trim().length === 0) {
		throw new Error("RuleCategory cannot be empty");
	}
	return category as TRuleCategory;
};

export const createRuleSeverity = (severity: string): TRuleSeverity => {
	const validSeverities = ["info", "warning", "error", "critical"];
	if (!validSeverities.includes(severity)) {
		throw new Error(
			`RuleSeverity must be one of: ${validSeverities.join(", ")}`,
		);
	}
	return severity as TRuleSeverity;
};

export const createRuleThreshold = (value: number): TRuleThreshold => {
	if (value < 0) {
		throw new Error("RuleThreshold cannot be negative");
	}
	return value as TRuleThreshold;
};

export const createRuleLimit = (value: number): TRuleLimit => {
	if (value <= 0) {
		throw new Error("RuleLimit must be greater than 0");
	}
	if (!Number.isInteger(value)) {
		throw new Error("RuleLimit must be a whole number");
	}
	return value as TRuleLimit;
};

export const createRulePercentage = (value: number): TRulePercentage => {
	if (value < 0 || value > 100) {
		throw new Error("RulePercentage must be between 0 and 100");
	}
	return value as TRulePercentage;
};

// Validation state constructors
export const createValidationStatus = (status: string): TValidationStatus => {
	const validStatuses = ["pending", "valid", "invalid", "expired"];
	if (!validStatuses.includes(status)) {
		throw new Error(
			`ValidationStatus must be one of: ${validStatuses.join(", ")}`,
		);
	}
	return status as TValidationStatus;
};

export const createApprovalState = (state: string): TApprovalState => {
	const validStates = ["pending", "approved", "rejected", "requires_review"];
	if (!validStates.includes(state)) {
		throw new Error(`ApprovalState must be one of: ${validStates.join(", ")}`);
	}
	return state as TApprovalState;
};

// Notification constructors
export const createNotificationId = (id: string): TNotificationId => {
	if (!id || id.trim().length === 0) {
		throw new Error("NotificationId cannot be empty");
	}
	return id as TNotificationId;
};

export const createEventType = (type: string): TEventType => {
	if (!type || type.trim().length === 0) {
		throw new Error("EventType cannot be empty");
	}
	return type as TEventType;
};

export const createNotificationChannel = (
	channel: string,
): TNotificationChannel => {
	const validChannels = ["email", "sms", "push", "in_app", "webhook"];
	if (!validChannels.includes(channel)) {
		throw new Error(
			`NotificationChannel must be one of: ${validChannels.join(", ")}`,
		);
	}
	return channel as TNotificationChannel;
};

// Audit constructors
export const createAuditId = (id: string): TAuditId => {
	if (!id || id.trim().length === 0) {
		throw new Error("AuditId cannot be empty");
	}
	return id as TAuditId;
};

export const createLogLevel = (level: string): TLogLevel => {
	const validLevels = ["trace", "debug", "info", "warn", "error", "fatal"];
	if (!validLevels.includes(level)) {
		throw new Error(`LogLevel must be one of: ${validLevels.join(", ")}`);
	}
	return level as TLogLevel;
};

export const createImmutableHash = (hash: string): TImmutableHash => {
	if (!hash || hash.trim().length === 0) {
		throw new Error("ImmutableHash cannot be empty");
	}
	if (hash.length !== 64) {
		throw new Error("ImmutableHash must be 64 characters (SHA-256)");
	}
	return hash as TImmutableHash;
};

// Geographic constructors
export const createLocationId = (id: string): TLocationId => {
	if (!id || id.trim().length === 0) {
		throw new Error("LocationId cannot be empty");
	}
	return id as TLocationId;
};

export const createRegionCode = (code: string): TRegionCode => {
	if (!code || code.trim().length === 0) {
		throw new Error("RegionCode cannot be empty");
	}
	if (code.length < 2 || code.length > 3) {
		throw new Error("RegionCode must be 2-3 characters (ISO 3166-2)");
	}
	return code.toUpperCase() as TRegionCode;
};

export const createCoordinates = (coords: string): TCoordinates => {
	if (!coords || coords.trim().length === 0) {
		throw new Error("Coordinates cannot be empty");
	}
	// Basic validation for lat,lng format
	const parts = coords.split(",");
	if (parts.length !== 2) {
		throw new Error('Coordinates must be in format "latitude,longitude"');
	}
	return coords as TCoordinates;
};

export const createShippingZone = (zone: string): TShippingZone => {
	if (!zone || zone.trim().length === 0) {
		throw new Error("ShippingZone cannot be empty");
	}
	return zone as TShippingZone;
};

// Payment constructors
export const createTransactionId = (id: string): TTransactionId => {
	if (!id || id.trim().length === 0) {
		throw new Error("TransactionId cannot be empty");
	}
	return id as TTransactionId;
};

export const createPaymentMethod = (method: string): TPaymentMethod => {
	const validMethods = [
		"credit_card",
		"debit_card",
		"bank_transfer",
		"paypal",
		"crypto",
	];
	if (!validMethods.includes(method)) {
		throw new Error(`PaymentMethod must be one of: ${validMethods.join(", ")}`);
	}
	return method as TPaymentMethod;
};

export const createPaymentStatus = (status: string): TPaymentStatus => {
	const validStatuses = [
		"pending",
		"processing",
		"completed",
		"failed",
		"cancelled",
		"refunded",
	];
	if (!validStatuses.includes(status)) {
		throw new Error(
			`PaymentStatus must be one of: ${validStatuses.join(", ")}`,
		);
	}
	return status as TPaymentStatus;
};

export const createRefundAmount = (value: number): TRefundAmount => {
	if (value < 0) {
		throw new Error("RefundAmount cannot be negative");
	}
	if (!Number.isInteger(value)) {
		throw new Error("RefundAmount must be in whole cents");
	}
	return value as TRefundAmount;
};

export const createEscrowAmount = (value: number): TEscrowAmount => {
	if (value <= 0) {
		throw new Error("EscrowAmount must be greater than 0");
	}
	if (!Number.isInteger(value)) {
		throw new Error("EscrowAmount must be in whole cents");
	}
	return value as TEscrowAmount;
};

export const createDepositAmount = (value: number): TDepositAmount => {
	if (value <= 0) {
		throw new Error("DepositAmount must be greater than 0");
	}
	if (!Number.isInteger(value)) {
		throw new Error("DepositAmount must be in whole cents");
	}
	return value as TDepositAmount;
};

export const createGuaranteeAmount = (value: number): TGuaranteeAmount => {
	if (value <= 0) {
		throw new Error("GuaranteeAmount must be greater than 0");
	}
	if (!Number.isInteger(value)) {
		throw new Error("GuaranteeAmount must be in whole cents");
	}
	return value as TGuaranteeAmount;
};
