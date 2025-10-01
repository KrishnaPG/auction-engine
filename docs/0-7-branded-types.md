# 0.7 Branded Types Design for Type Safety

## Overview

This document defines a comprehensive branded types system for the auction engine, eliminating primitive obsession and ensuring type safety across all 13 auction types. The branded type system uses TypeScript's branded types pattern to create distinct types for different domain concepts while maintaining runtime compatibility.

## Base Branded Type Framework

```typescript
// Create a branded type utility
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
```

## Core Domain Branded Types

### Monetary Values

```typescript
// Base monetary amount in smallest currency unit (cents)
export type TBidAmount = Branded<number, "BidAmount">;
export type TReservePrice = Branded<number, "ReservePrice">;
export type TStartingPrice = Branded<number, "StartingPrice">;
export type TMinimumIncrement = Branded<number, "MinimumIncrement">;
export type TBuyItNowPrice = Branded<number, "BuyItNowPrice">;
export type TPennyBidFee = Branded<number, "PennyBidFee">;

// Currency and exchange rates
export type TCurrency = Branded<string, "Currency">;
export type TExchangeRate = Branded<number, "ExchangeRate">;
```

### Temporal Types

```typescript
// Time representations
export type TAuctionDuration = Branded<number, "AuctionDuration">; // milliseconds
export type TTimeExtension = Branded<number, "TimeExtension">; // milliseconds
export type TBidTimeout = Branded<number, "BidTimeout">; // milliseconds
export type TTimestamp = Branded<number, "Timestamp">; // Unix timestamp

// Date-time branded types
export type TAuctionStartTime = Branded<Date, "AuctionStartTime">;
export type TAuctionEndTime = Branded<Date, "AuctionEndTime">;
export type TBidDeadline = Branded<Date, "BidDeadline">;
```

### Identification Types

```typescript
// Entity identifiers
export type TAuctionId = Branded<string, "AuctionId">;
export type TBidId = Branded<string, "BidId">;
export type TUserId = Branded<string, "UserId">;
export type TItemId = Branded<string, "ItemId">;
export type TCategoryId = Branded<string, "CategoryId">;

// Composite identifiers
export type TAuctionItemId = Branded<string, "AuctionItemId">;
export type TBidderId = Branded<string, "BidderId">;
export type TSellerId = Branded<string, "SellerId">;
```

### Quantity and Count Types

```typescript
// Quantity representations
export type TItemQuantity = Branded<number, "ItemQuantity">;
export type TBidQuantity = Branded<number, "BidQuantity">;
export type TMaxBidders = Branded<number, "MaxBidders">;
export type TMaxBidsPerUser = Branded<number, "MaxBidsPerUser">;
export type TAutoExtensionCount = Branded<number, "AutoExtensionCount">;

// Scoring and ranking
export type TBidRank = Branded<number, "BidRank">;
export type TScore = Branded<number, "Score">;
export type TPriority = Branded<number, "Priority">;
```

## Auction Type-Specific Branded Types

### English Auction Types

```typescript
// English auction specific
export type TCurrentPrice = Branded<number, "CurrentPrice">;
export type TMinimumBid = Branded<number, "MinimumBid">;
export type TWinningBid = Branded<number, "WinningBid">;

// Price trajectory for Dutch auctions
export type TPriceDrop = Branded<number, "PriceDrop">;
export type TPriceDropInterval = Branded<number, "PriceDropInterval">;
```

### Sealed-Bid Auction Types

```typescript
// Sealed-bid specific
export type TSealedBid = Branded<number, "SealedBid">;
export type TBlindBid = Branded<number, "BlindBid">;
export type TBidderScore = Branded<number, "BidderScore">;

// Vickrey auction specific
export type TSecondPrice = Branded<number, "SecondPrice">;
export type TVickreyPrice = Branded<number, "VickreyPrice">;
```

### Multi-Unit Auction Types

```typescript
// Multi-unit specific
export type TUnitQuantity = Branded<number, "UnitQuantity">;
export type TAvailableUnits = Branded<number, "AvailableUnits">;
export type TSoldUnits = Branded<number, "SoldUnits">;
export type TRemainingUnits = Branded<number, "RemainingUnits">;

// Combinatorial auction specific
export type TPackageId = Branded<string, "PackageId">;
export type TBundleId = Branded<string, "BundleId">;
export type TCombinationValue = Branded<number, "CombinationValue">;
```

### Penny Auction Types

```typescript
// Penny auction specific
export type TBidFee = Branded<number, "BidFee">;
export type TTotalFees = Branded<number, "TotalFees">;
export type TTimeIncrement = Branded<number, "TimeIncrement">; // seconds added per bid
export type TUniqueBidders = Branded<number, "UniqueBidders">;
```

### Japanese/Chinese Auction Types

```typescript
// Japanese auction specific
export type TRoundNumber = Branded<number, "RoundNumber">;
export type TParticipantCount = Branded<number, "ParticipantCount">;
export type TEliminationPrice = Branded<number, "EliminationPrice">;

// Chinese auction specific
export type TPriceDropRate = Branded<number, "PriceDropRate">;
export type TRapidBidThreshold = Branded<number, "RapidBidThreshold">;
```

## Business Rules Branded Types

```typescript
// Business rule identifiers
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
```

## Notification and Audit Types

```typescript
// Notification types
export type TNotificationId = Branded<string, "NotificationId">;
export type TEventType = Branded<string, "EventType">;
export type TNotificationChannel = Branded<string, "NotificationChannel">;

// Audit trail types
export type TAuditId = Branded<string, "AuditId">;
export type TLogLevel = Branded<string, "LogLevel">;
export type TImmutableHash = Branded<string, "ImmutableHash">;
```

## Geographic and Location Types

```typescript
// Location-based auction types
export type TLocationId = Branded<string, "LocationId">;
export type TRegionCode = Branded<string, "RegionCode">;
export type TCoordinates = Branded<string, "Coordinates">;
export type TShippingZone = Branded<string, "ShippingZone">;
```

## Payment and Transaction Types

```typescript
// Payment processing
export type TTransactionId = Branded<string, "TransactionId">;
export type TPaymentMethod = Branded<string, "PaymentMethod">;
export type TPaymentStatus = Branded<string, "PaymentStatus">;
export type TRefundAmount = Branded<number, "RefundAmount">;

// Escrow and guarantees
export type TEscrowAmount = Branded<number, "EscrowAmount">;
export type TDepositAmount = Branded<number, "DepositAmount">;
export type TGuaranteeAmount = Branded<number, "GuaranteeAmount">;
```

## Type-Safe Constructor Functions

```typescript
// Monetary constructors
export const createBidAmount = (value: number): TBidAmount =>
  value as TBidAmount;
export const createReservePrice = (value: number): TReservePrice =>
  value as TReservePrice;
export const createStartingPrice = (value: number): TStartingPrice =>
  value as TStartingPrice;

// Temporal constructors
export const createAuctionDuration = (milliseconds: number): TAuctionDuration =>
  milliseconds as TAuctionDuration;
export const createTimestamp = (unixTime: number): TTimestamp =>
  unixTime as TTimestamp;

// ID constructors
export const createAuctionId = (id: string): TAuctionId =>
  id as TAuctionId;
export const createBidId = (id: string): TBidId =>
  id as TBidId;
export const createUserId = (id: string): TUserId =>
  id as TUserId;
```

## Type Guards and Validation

```typescript
// Type guards for runtime validation
export const isValidBidAmount = (value: unknown): value is TBidAmount =>
  typeof value === 'number' && value > 0;

export const isValidAuctionId = (value: unknown): value is TAuctionId =>
  typeof value === 'string' && value.length > 0;

export const isValidTimestamp = (value: unknown): value is TTimestamp =>
  typeof value === 'number' && value > 0;

// Validation helpers
export const validateBidAmount = (amount: TBidAmount): boolean =>
  isValidBidAmount(amount);

export const validateAuctionDuration = (duration: TAuctionDuration): boolean =>
  duration >= 60000 && duration <= 2592000000; // 1 minute to 30 days
```

## Usage Examples

```typescript
// Type-safe auction creation
const auctionId = createAuctionId("auction_123");
const startingPrice = createStartingPrice(10000); // $100.00 in cents
const reservePrice = createReservePrice(5000); // $50.00 in cents
const duration = createAuctionDuration(86400000); // 24 hours

// Type-safe bid placement
const bidAmount = createBidAmount(11000); // $110.00 in cents
const bidId = createBidId(`bid_${Date.now()}`);
const timestamp = createTimestamp(Date.now());

// Business rule validation with branded types
const canPlaceBid = (
  currentBid: TBidAmount,
  newBid: TBidAmount,
  minimumIncrement: TMinimumIncrement
): boolean => {
  const increment = Number(newBid) - Number(currentBid);
  return increment >= Number(minimumIncrement);
};
```

## Benefits of This Type System

1. **Primitive Obsession Prevention**: Eliminates confusion between different numeric values
2. **Type Safety**: Compile-time guarantees for correct value usage
3. **Domain Clarity**: Makes business logic explicit in type signatures
4. **Runtime Compatibility**: Maintains JavaScript compatibility while adding type safety
5. **Refactoring Safety**: Prevents accidental misuse during code changes
6. **Self-Documenting Code**: Types serve as living documentation

## Integration with Auction Types

This branded type system integrates seamlessly with all 13 auction types:

- **English Auctions**: Uses `TCurrentPrice`, `TMinimumBid`, `TWinningBid`
- **Dutch Auctions**: Uses `TPriceDrop`, `TPriceDropInterval`
- **Sealed-Bid Auctions**: Uses `TSealedBid`, `TBlindBid`
- **Vickrey Auctions**: Uses `TSecondPrice`, `TVickreyPrice`
- **Multi-Unit Auctions**: Uses `TUnitQuantity`, `TRemainingUnits`
- **Combinatorial Auctions**: Uses `TPackageId`, `TCombinationValue`
- **Penny Auctions**: Uses `TBidFee`, `TTimeIncrement`
- **Japanese Auctions**: Uses `TRoundNumber`, `TEliminationPrice`

This comprehensive type system ensures type safety across all auction implementations while maintaining performance and preventing common programming errors.