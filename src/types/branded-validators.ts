// Type Guards and Validation for Branded Types

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

// Type guards for runtime validation
export const isValidBidAmount = (value: unknown): value is TBidAmount =>
	typeof value === "number" && value > 0 && Number.isInteger(value);

export const isValidReservePrice = (value: unknown): value is TReservePrice =>
	typeof value === "number" && value > 0 && Number.isInteger(value);

export const isValidStartingPrice = (value: unknown): value is TStartingPrice =>
	typeof value === "number" && value > 0 && Number.isInteger(value);

export const isValidMinimumIncrement = (
	value: unknown,
): value is TMinimumIncrement =>
	typeof value === "number" && value > 0 && Number.isInteger(value);

export const isValidBuyItNowPrice = (value: unknown): value is TBuyItNowPrice =>
	typeof value === "number" && value > 0 && Number.isInteger(value);

export const isValidPennyBidFee = (value: unknown): value is TPennyBidFee =>
	typeof value === "number" && value > 0 && Number.isInteger(value);

export const isValidCurrency = (value: unknown): value is TCurrency =>
	typeof value === "string" && value.length === 3 && /^[A-Z]+$/.test(value);

export const isValidExchangeRate = (value: unknown): value is TExchangeRate =>
	typeof value === "number" && value > 0;

export const isValidAuctionDuration = (
	value: unknown,
): value is TAuctionDuration =>
	typeof value === "number" && value >= 60000 && value <= 2592000000;

export const isValidTimeExtension = (value: unknown): value is TTimeExtension =>
	typeof value === "number" && value > 0;

export const isValidBidTimeout = (value: unknown): value is TBidTimeout =>
	typeof value === "number" && value > 0;

export const isValidTimestamp = (value: unknown): value is TTimestamp =>
	typeof value === "number" && value > 0;

export const isValidAuctionStartTime = (
	value: unknown,
): value is TAuctionStartTime =>
	value instanceof Date && !isNaN(value.getTime());

export const isValidAuctionEndTime = (
	value: unknown,
): value is TAuctionEndTime => value instanceof Date && !isNaN(value.getTime());

export const isValidBidDeadline = (value: unknown): value is TBidDeadline =>
	value instanceof Date && !isNaN(value.getTime());

export const isValidAuctionId = (value: unknown): value is TAuctionId =>
	typeof value === "string" && value.length > 0;

export const isValidBidId = (value: unknown): value is TBidId =>
	typeof value === "string" && value.length > 0;

export const isValidUserId = (value: unknown): value is TUserId =>
	typeof value === "string" && value.length > 0;

export const isValidItemId = (value: unknown): value is TItemId =>
	typeof value === "string" && value.length > 0;

export const isValidCategoryId = (value: unknown): value is TCategoryId =>
	typeof value === "string" && value.length > 0;

export const isValidAuctionItemId = (value: unknown): value is TAuctionItemId =>
	typeof value === "string" && value.length > 0;

export const isValidBidderId = (value: unknown): value is TBidderId =>
	typeof value === "string" && value.length > 0;

export const isValidSellerId = (value: unknown): value is TSellerId =>
	typeof value === "string" && value.length > 0;

export const isValidItemQuantity = (value: unknown): value is TItemQuantity =>
	typeof value === "number" && value > 0 && Number.isInteger(value);

export const isValidBidQuantity = (value: unknown): value is TBidQuantity =>
	typeof value === "number" && value > 0 && Number.isInteger(value);

export const isValidMaxBidders = (value: unknown): value is TMaxBidders =>
	typeof value === "number" && value > 0 && Number.isInteger(value);

export const isValidMaxBidsPerUser = (
	value: unknown,
): value is TMaxBidsPerUser =>
	typeof value === "number" && value > 0 && Number.isInteger(value);

export const isValidAutoExtensionCount = (
	value: unknown,
): value is TAutoExtensionCount =>
	typeof value === "number" && value >= 0 && Number.isInteger(value);

export const isValidBidRank = (value: unknown): value is TBidRank =>
	typeof value === "number" && value > 0 && Number.isInteger(value);

export const isValidScore = (value: unknown): value is TScore =>
	typeof value === "number" && value >= 0;

export const isValidPriority = (value: unknown): value is TPriority =>
	typeof value === "number" && value >= 0 && Number.isInteger(value);

export const isValidCurrentPrice = (value: unknown): value is TCurrentPrice =>
	typeof value === "number" && value > 0 && Number.isInteger(value);

export const isValidMinimumBid = (value: unknown): value is TMinimumBid =>
	typeof value === "number" && value > 0 && Number.isInteger(value);

export const isValidWinningBid = (value: unknown): value is TWinningBid =>
	typeof value === "number" && value > 0 && Number.isInteger(value);

export const isValidPriceDrop = (value: unknown): value is TPriceDrop =>
	typeof value === "number" && value > 0 && Number.isInteger(value);

export const isValidPriceDropInterval = (
	value: unknown,
): value is TPriceDropInterval =>
	typeof value === "number" && value > 0 && Number.isInteger(value);

export const isValidSealedBid = (value: unknown): value is TSealedBid =>
	typeof value === "number" && value > 0 && Number.isInteger(value);

export const isValidBlindBid = (value: unknown): value is TBlindBid =>
	typeof value === "number" && value > 0 && Number.isInteger(value);

export const isValidBidderScore = (value: unknown): value is TBidderScore =>
	typeof value === "number" && value >= 0;

export const isValidSecondPrice = (value: unknown): value is TSecondPrice =>
	typeof value === "number" && value > 0 && Number.isInteger(value);

export const isValidVickreyPrice = (value: unknown): value is TVickreyPrice =>
	typeof value === "number" && value > 0 && Number.isInteger(value);

export const isValidUnitQuantity = (value: unknown): value is TUnitQuantity =>
	typeof value === "number" && value > 0 && Number.isInteger(value);

export const isValidAvailableUnits = (
	value: unknown,
): value is TAvailableUnits =>
	typeof value === "number" && value > 0 && Number.isInteger(value);

export const isValidSoldUnits = (value: unknown): value is TSoldUnits =>
	typeof value === "number" && value >= 0 && Number.isInteger(value);

export const isValidRemainingUnits = (
	value: unknown,
): value is TRemainingUnits =>
	typeof value === "number" && value >= 0 && Number.isInteger(value);

export const isValidPackageId = (value: unknown): value is TPackageId =>
	typeof value === "string" && value.length > 0;

export const isValidBundleId = (value: unknown): value is TBundleId =>
	typeof value === "string" && value.length > 0;

export const isValidCombinationValue = (
	value: unknown,
): value is TCombinationValue =>
	typeof value === "number" && value > 0 && Number.isInteger(value);

export const isValidBidFee = (value: unknown): value is TBidFee =>
	typeof value === "number" && value > 0 && Number.isInteger(value);

export const isValidTotalFees = (value: unknown): value is TTotalFees =>
	typeof value === "number" && value >= 0 && Number.isInteger(value);

export const isValidTimeIncrement = (value: unknown): value is TTimeIncrement =>
	typeof value === "number" && value > 0 && Number.isInteger(value);

export const isValidUniqueBidders = (value: unknown): value is TUniqueBidders =>
	typeof value === "number" && value > 0 && Number.isInteger(value);

export const isValidRoundNumber = (value: unknown): value is TRoundNumber =>
	typeof value === "number" && value > 0 && Number.isInteger(value);

export const isValidParticipantCount = (
	value: unknown,
): value is TParticipantCount =>
	typeof value === "number" && value > 0 && Number.isInteger(value);

export const isValidEliminationPrice = (
	value: unknown,
): value is TEliminationPrice =>
	typeof value === "number" && value > 0 && Number.isInteger(value);

export const isValidPriceDropRate = (value: unknown): value is TPriceDropRate =>
	typeof value === "number" && value > 0 && Number.isInteger(value);

export const isValidRapidBidThreshold = (
	value: unknown,
): value is TRapidBidThreshold =>
	typeof value === "number" && value > 0 && Number.isInteger(value);

export const isValidRuleId = (value: unknown): value is TRuleId =>
	typeof value === "string" && value.length > 0;

export const isValidRuleCategory = (value: unknown): value is TRuleCategory =>
	typeof value === "string" && value.length > 0;

export const isValidRuleSeverity = (value: unknown): value is TRuleSeverity =>
	["info", "warning", "error", "critical"].includes(value as string);

export const isValidRuleThreshold = (value: unknown): value is TRuleThreshold =>
	typeof value === "number" && value >= 0;

export const isValidRuleLimit = (value: unknown): value is TRuleLimit =>
	typeof value === "number" && value > 0 && Number.isInteger(value);

export const isValidRulePercentage = (
	value: unknown,
): value is TRulePercentage =>
	typeof value === "number" && value >= 0 && value <= 100;

export const isValidValidationStatus = (
	value: unknown,
): value is TValidationStatus =>
	["pending", "valid", "invalid", "expired"].includes(value as string);

export const isValidApprovalState = (value: unknown): value is TApprovalState =>
	["pending", "approved", "rejected", "requires_review"].includes(
		value as string,
	);

export const isValidNotificationId = (
	value: unknown,
): value is TNotificationId => typeof value === "string" && value.length > 0;

export const isValidEventType = (value: unknown): value is TEventType =>
	typeof value === "string" && value.length > 0;

export const isValidNotificationChannel = (
	value: unknown,
): value is TNotificationChannel =>
	["email", "sms", "push", "in_app", "webhook"].includes(value as string);

export const isValidAuditId = (value: unknown): value is TAuditId =>
	typeof value === "string" && value.length > 0;

export const isValidLogLevel = (value: unknown): value is TLogLevel =>
	["trace", "debug", "info", "warn", "error", "fatal"].includes(
		value as string,
	);

export const isValidImmutableHash = (value: unknown): value is TImmutableHash =>
	typeof value === "string" &&
	value.length === 64 &&
	/^[a-fA-F0-9]+$/.test(value);

export const isValidLocationId = (value: unknown): value is TLocationId =>
	typeof value === "string" && value.length > 0;

export const isValidRegionCode = (value: unknown): value is TRegionCode =>
	typeof value === "string" &&
	value.length >= 2 &&
	value.length <= 3 &&
	/^[A-Z]+$/.test(value);

export const isValidCoordinates = (value: unknown): value is TCoordinates =>
	typeof value === "string" && /^\d+\.\d+,\d+\.\d+$/.test(value);

export const isValidShippingZone = (value: unknown): value is TShippingZone =>
	typeof value === "string" && value.length > 0;

export const isValidTransactionId = (value: unknown): value is TTransactionId =>
	typeof value === "string" && value.length > 0;

export const isValidPaymentMethod = (value: unknown): value is TPaymentMethod =>
	["credit_card", "debit_card", "bank_transfer", "paypal", "crypto"].includes(
		value as string,
	);

export const isValidPaymentStatus = (value: unknown): value is TPaymentStatus =>
	[
		"pending",
		"processing",
		"completed",
		"failed",
		"cancelled",
		"refunded",
	].includes(value as string);

export const isValidRefundAmount = (value: unknown): value is TRefundAmount =>
	typeof value === "number" && value >= 0 && Number.isInteger(value);

export const isValidEscrowAmount = (value: unknown): value is TEscrowAmount =>
	typeof value === "number" && value > 0 && Number.isInteger(value);

export const isValidDepositAmount = (value: unknown): value is TDepositAmount =>
	typeof value === "number" && value > 0 && Number.isInteger(value);

export const isValidGuaranteeAmount = (
	value: unknown,
): value is TGuaranteeAmount =>
	typeof value === "number" && value > 0 && Number.isInteger(value);

// Validation helpers
export const validateBidAmount = (amount: TBidAmount): boolean =>
	isValidBidAmount(amount);

export const validateAuctionDuration = (duration: TAuctionDuration): boolean =>
	isValidAuctionDuration(duration);

export const validateStartingPrice = (price: TStartingPrice): boolean =>
	isValidStartingPrice(price);

export const validateReservePrice = (price: TReservePrice): boolean =>
	isValidReservePrice(price);

export const validateMinimumIncrement = (
	increment: TMinimumIncrement,
): boolean => isValidMinimumIncrement(increment);

export const validateAuctionId = (id: TAuctionId): boolean =>
	isValidAuctionId(id);

export const validateUserId = (id: TUserId): boolean => isValidUserId(id);

export const validateTimestamp = (timestamp: TTimestamp): boolean =>
	isValidTimestamp(timestamp);

// Complex validation functions
export const validateAuctionTiming = (
	startTime: TAuctionStartTime,
	endTime: TAuctionEndTime,
): boolean => {
	if (!isValidAuctionStartTime(startTime) || !isValidAuctionEndTime(endTime)) {
		return false;
	}

	const duration = Number(endTime) - Number(startTime);
	return duration >= 60000 && duration <= 2592000000; // 1 minute to 30 days
};

export const validateBidConstraints = (
	bidAmount: TBidAmount,
	currentPrice: TCurrentPrice,
	minimumIncrement: TMinimumIncrement,
): boolean => {
	if (
		!isValidBidAmount(bidAmount) ||
		!isValidCurrentPrice(currentPrice) ||
		!isValidMinimumIncrement(minimumIncrement)
	) {
		return false;
	}

	const requiredMinimum = Number(currentPrice) + Number(minimumIncrement);
	return Number(bidAmount) >= requiredMinimum;
};

export const validateMultiUnitConstraints = (
	bidQuantity: TBidQuantity,
	availableUnits: TAvailableUnits,
): boolean => {
	if (
		!isValidBidQuantity(bidQuantity) ||
		!isValidAvailableUnits(availableUnits)
	) {
		return false;
	}

	return Number(bidQuantity) <= Number(availableUnits);
};

export const validateCombinatorialPackage = (
	packageItems: readonly TItemId[],
	packageValue: TCombinationValue,
): boolean => {
	if (!Array.isArray(packageItems) || packageItems.length === 0) {
		return false;
	}

	if (!isValidCombinationValue(packageValue)) {
		return false;
	}

	return packageItems.every((itemId) => isValidItemId(itemId));
};

// Currency validation
export const validateCurrencyAmount = (
	amount: number,
	currency: TCurrency,
): boolean => {
	if (!isValidCurrency(currency)) {
		return false;
	}

	return amount > 0 && Number.isInteger(amount);
};

// Geographic validation
export const validateShippingZone = (
	zone: TShippingZone,
	region: TRegionCode,
): boolean => {
	if (!isValidShippingZone(zone) || !isValidRegionCode(region)) {
		return false;
	}

	// Add more complex validation logic here if needed
	return true;
};

// Payment validation
export const validatePaymentAmount = (
	amount: number,
	method: TPaymentMethod,
	status: TPaymentStatus,
): boolean => {
	if (!isValidPaymentMethod(method) || !isValidPaymentStatus(status)) {
		return false;
	}

	if (amount <= 0 || !Number.isInteger(amount)) {
		return false;
	}

	return true;
};
