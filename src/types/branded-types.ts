// Base Branded Type Framework
export declare const __brand: unique symbol;

// The brand stores both the root base-type and the accumulated tags
export type Brand<Root, Tags extends string> = {
  readonly [__brand]: {
    root: Root;
    tags: Record<Tags, true>;
  };
};

// Accumulate brands and preserve root
export type Branded<Base, Tag extends string> =
  Base extends { readonly [__brand]: { root: infer R; tags: infer T } }
    ? R & Brand<R, keyof T & string | Tag> // merge existing tags + new tag
    : Base & Brand<Base, Tag>;

// Core Domain Branded Types

// Monetary Values
export type TBidAmount = Branded<number, "BidAmount">;
export type TReservePrice = Branded<number, "ReservePrice">;
export type TStartingPrice = Branded<number, "StartingPrice">;
export type TMinimumIncrement = Branded<number, "MinimumIncrement">;
export type TBuyItNowPrice = Branded<number, "BuyItNowPrice">;
export type TPennyBidFee = Branded<number, "PennyBidFee">;
export type TCurrency = Branded<string, "Currency">;
export type TExchangeRate = Branded<number, "ExchangeRate">;

// Temporal Types
export type TAuctionDuration = Branded<number, "AuctionDuration">; // milliseconds
export type TTimeExtension = Branded<number, "TimeExtension">; // milliseconds
export type TBidTimeout = Branded<number, "BidTimeout">; // milliseconds
export type TTimestamp = Branded<number, "Timestamp">; // Unix timestamp

// Date-time branded types
export type TAuctionStartTime = Branded<TTimestamp, "AuctionStartTime">;
export type TAuctionEndTime = Branded<TTimestamp, "AuctionEndTime">;
export type TBidDeadline = Branded<TTimestamp, "BidDeadline">;

// Identification Types
export type TAuctionId = Branded<string, "AuctionId">;
export type TBidId = Branded<string, "BidId">;
export type TUserId = Branded<string, "UserId">;
export type TItemId = Branded<string, "ItemId">;
export type TCategoryId = Branded<string, "CategoryId">;

// Composite identifiers
export type TAuctionItemId = Branded<string, "AuctionItemId">;
export type TBidderId = Branded<string, "BidderId">;
export type TSellerId = Branded<string, "SellerId">;

// Quantity and Count Types
export type TItemQuantity = Branded<number, "ItemQuantity">;
export type TBidQuantity = Branded<number, "BidQuantity">;
export type TMaxBidders = Branded<number, "MaxBidders">;
export type TMaxBidsPerUser = Branded<number, "MaxBidsPerUser">;
export type TAutoExtensionCount = Branded<number, "AutoExtensionCount">;

// Scoring and ranking
export type TBidRank = Branded<number, "BidRank">;
export type TScore = Branded<number, "Score">;
export type TPriority = Branded<number, "Priority">;

// Auction Type-Specific Branded Types

// English Auction Types
export type TCurrentPrice = Branded<number, "CurrentPrice">;
export type TMinimumBid = Branded<number, "MinimumBid">;
export type TWinningBid = Branded<number, "WinningBid">;

// Price trajectory for Dutch auctions
export type TPriceDrop = Branded<number, "PriceDrop">;
export type TPriceDropInterval = Branded<number, "PriceDropInterval">;

// Sealed-Bid Auction Types
export type TSealedBid = Branded<number, "SealedBid">;
export type TBlindBid = Branded<number, "BlindBid">;
export type TBidderScore = Branded<number, "BidderScore">;

// Vickrey auction specific
export type TSecondPrice = Branded<number, "SecondPrice">;
export type TVickreyPrice = Branded<number, "VickreyPrice">;

// Multi-Unit Auction Types
export type TUnitQuantity = Branded<number, "UnitQuantity">;
export type TAvailableUnits = Branded<number, "AvailableUnits">;
export type TSoldUnits = Branded<number, "SoldUnits">;
export type TRemainingUnits = Branded<number, "RemainingUnits">;

// Combinatorial auction specific
export type TPackageId = Branded<string, "PackageId">;
export type TBundleId = Branded<string, "BundleId">;
export type TCombinationValue = Branded<number, "CombinationValue">;

// Penny Auction Types
export type TBidFee = Branded<number, "BidFee">;
export type TTotalFees = Branded<number, "TotalFees">;
export type TTimeIncrement = Branded<number, "TimeIncrement">; // seconds added per bid
export type TUniqueBidders = Branded<number, "UniqueBidders">;

// Japanese/Chinese Auction Types
export type TRoundNumber = Branded<number, "RoundNumber">;
export type TParticipantCount = Branded<number, "ParticipantCount">;
export type TEliminationPrice = Branded<number, "EliminationPrice">;

// Chinese auction specific
export type TPriceDropRate = Branded<number, "PriceDropRate">;
export type TRapidBidThreshold = Branded<number, "RapidBidThreshold">;

// Business Rules Branded Types
export type TRuleId = Branded<string, "RuleId">;
export type TRuleCategory = Branded<string, "RuleCategory">;
export type TRuleSeverity = Branded<string, "RuleSeverity">;

// Rule configuration values
export type TRuleThreshold = Branded<number, "RuleThreshold">;
export type TRuleLimit = Branded<number, "RuleLimit">;
export type TRulePercentage = Branded<number, "RulePercentage">;

// Validation states
export type TValidationStatus = Branded<string, "ValidationStatus">;
export type TApprovalState = Branded<string, "ApprovalState">;

// Notification and Audit Types
export type TNotificationId = Branded<string, "NotificationId">;
export type TEventType = Branded<string, "EventType">;
export type TNotificationChannel = Branded<string, "NotificationChannel">;

// Audit trail types
export type TAuditId = Branded<string, "AuditId">;
export type TLogLevel = Branded<string, "LogLevel">;
export type TImmutableHash = Branded<string, "ImmutableHash">;

// Geographic and Location Types
export type TLocationId = Branded<string, "LocationId">;
export type TRegionCode = Branded<string, "RegionCode">;
export type TCoordinates = Branded<string, "Coordinates">;
export type TShippingZone = Branded<string, "ShippingZone">;

// Payment and Transaction Types
export type TTransactionId = Branded<string, "TransactionId">;
export type TPaymentMethod = Branded<string, "PaymentMethod">;
export type TPaymentStatus = Branded<string, "PaymentStatus">;
export type TRefundAmount = Branded<number, "RefundAmount">;

// Escrow and guarantees
export type TEscrowAmount = Branded<number, "EscrowAmount">;
export type TDepositAmount = Branded<number, "DepositAmount">;
export type TGuaranteeAmount = Branded<number, "GuaranteeAmount">;