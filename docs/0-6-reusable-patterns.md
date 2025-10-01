# Reusable Patterns Design Document for Auction Engine

## Overview

This document presents a comprehensive set of reusable patterns, helper methods, common interfaces, and reusable types designed to support all 13 auction types while maintaining clean, maintainable, and performant code. The patterns leverage TypeScript's type system, design patterns, and modern programming practices to ensure type safety, zero-copy operations, and optimal performance for real-time bidding scenarios.

## 1. Common Interfaces for Auction Operations

### Purpose and Usage Scenarios
Common interfaces provide the foundation for type-safe auction operations across all 13 auction types. They enable polymorphism, ensure consistent contracts, and facilitate dependency injection while maintaining the single responsibility principle.

### Core Interface Definitions

#### IAuctionEngine Interface
```typescript
interface IAuctionEngine {
  // Lifecycle Management
  startAuction(auctionId: AuctionId): Promise<AuctionState>;
  pauseAuction(auctionId: AuctionId, reason: string): Promise<void>;
  resumeAuction(auctionId: AuctionId): Promise<void>;
  endAuction(auctionId: AuctionId): Promise<AuctionResult>;
  cancelAuction(auctionId: AuctionId, reason: string): Promise<void>;

  // Bid Operations
  placeBid(bidRequest: BidRequest): Promise<BidResult>;
  retractBid(bidId: BidId, reason: string): Promise<void>;
  validateBid(bidRequest: BidRequest): Promise<BidValidation>;

  // State Queries
  getAuctionState(auctionId: AuctionId): Promise<AuctionState>;
  getBidHistory(auctionId: AuctionId): Promise<ReadonlyArray<Bid>>;
  getWinningBids(auctionId: AuctionId): Promise<ReadonlyArray<Bid>>;

  // Configuration
  updateAuctionConfig(auctionId: AuctionId, config: AuctionConfig): Promise<void>;
  getAuctionConfig(auctionId: AuctionId): Promise<AuctionConfig>;
}
```

#### IAuctionStrategy Interface
```typescript
interface IAuctionStrategy {
  // Strategy Identification
  readonly strategyType: AuctionType;
  readonly strategyName: string;

  // Core Strategy Methods
  canPlaceBid(auction: IAuction, bid: IBid): boolean;
  calculateNextPrice(auction: IAuction, currentBid?: IBid): Price;
  determineWinner(auction: IAuction): BidderId | null;
  shouldExtendAuction(auction: IAuction): boolean;
  calculateExtensionDuration(auction: IAuction): Duration;

  // Strategy-Specific Operations
  processBid(auction: IAuction, bid: IBid): BidProcessingResult;
  finalizeAuction(auction: IAuction): AuctionFinalizationResult;
}
```

#### IBidProcessor Interface
```typescript
interface IBidProcessor {
  processBid(bidRequest: BidRequest): Promise<BidProcessingResult>;
  validateBidConstraints(bidRequest: BidRequest): Promise<BidValidation>;
  calculateBidImpact(bidRequest: BidRequest): Promise<BidImpact>;
  notifyBidUpdate(bidUpdate: BidUpdate): Promise<void>;
}
```

### Implementation Examples and Best Practices

#### Type-Safe Implementation
```typescript
class AuctionEngine implements IAuctionEngine {
  constructor(
    private auctionRepository: IAuctionRepository,
    private bidProcessor: IBidProcessor,
    private notificationService: INotificationService,
    private strategyFactory: IAuctionStrategyFactory
  ) {}

  async placeBid(bidRequest: BidRequest): Promise<BidResult> {
    // Type-safe bid processing with comprehensive validation
    const validation = await this.bidProcessor.validateBidConstraints(bidRequest);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    const auction = await this.auctionRepository.findById(bidRequest.auctionId);
    if (!auction) {
      return { success: false, errors: ['Auction not found'] };
    }

    const strategy = this.strategyFactory.createStrategy(auction.getType());
    const bid = Bid.create(bidRequest);

    const result = await this.bidProcessor.processBid(bidRequest);
    if (result.success) {
      await this.notificationService.notifyBidPlaced(bid);
    }

    return result;
  }
}
```

#### Integration Points
- **Domain Layer**: Interfaces align with domain entities and value objects
- **Service Layer**: Used by application services for business logic orchestration
- **Repository Layer**: Query interfaces for data access abstraction
- **API Layer**: Request/response mapping for external interfaces

## 2. Helper Methods for Auction Lifecycle Management

### Purpose and Usage Scenarios
Helper methods encapsulate common auction lifecycle operations that are shared across multiple auction types, reducing code duplication and ensuring consistent behavior.

### Core Helper Method Categories

#### Time Management Helpers
```typescript
class AuctionTimeHelpers {
  static isAuctionActive(auction: IAuction): boolean {
    const now = new Date();
    return auction.getStartTime() <= now && now <= auction.getEndTime();
  }

  static shouldExtendAuction(
    auction: IAuction,
    lastBidTime: Date,
    extensionConfig: ExtensionConfig
  ): boolean {
    if (!extensionConfig.autoExtend) return false;

    const timeUntilEnd = auction.getEndTime().getTime() - lastBidTime.getTime();
    const thresholdMs = extensionConfig.triggerThresholdSeconds * 1000;

    return timeUntilEnd <= thresholdMs && auction.canExtend();
  }

  static calculateExtensionEndTime(
    currentEndTime: Date,
    extensionDuration: Duration
  ): Date {
    return new Date(currentEndTime.getTime() + extensionDuration.toMilliseconds());
  }
}
```

#### Price Calculation Helpers
```typescript
class AuctionPriceHelpers {
  static calculateNextValidBid(
    currentPrice: Price,
    minIncrement: Price,
    auctionType: AuctionType
  ): Price {
    switch (auctionType) {
      case AuctionType.ENGLISH:
        return currentPrice.add(minIncrement);
      case AuctionType.DUTCH:
        return currentPrice.subtract(minIncrement);
      case AuctionType.JAPANESE:
        return currentPrice.add(minIncrement);
      default:
        return currentPrice.add(minIncrement);
    }
  }

  static isValidBidAmount(
    bidAmount: Price,
    currentPrice: Price,
    minIncrement: Price,
    auctionType: AuctionType
  ): boolean {
    const nextValidAmount = this.calculateNextValidBid(currentPrice, minIncrement, auctionType);

    switch (auctionType) {
      case AuctionType.ENGLISH:
      case AuctionType.JAPANESE:
        return bidAmount.isGreaterThanOrEqualTo(nextValidAmount);
      case AuctionType.DUTCH:
        return bidAmount.isLessThanOrEqualTo(nextValidAmount);
      default:
        return bidAmount.isGreaterThanOrEqualTo(nextValidAmount);
    }
  }
}
```

#### State Transition Helpers
```typescript
class AuctionStateHelpers {
  static canTransitionTo(
    currentStatus: AuctionStatus,
    targetStatus: AuctionStatus
  ): boolean {
    const validTransitions: Record<AuctionStatus, AuctionStatus[]> = {
      [AuctionStatus.DRAFT]: [AuctionStatus.SCHEDULED, AuctionStatus.CANCELLED],
      [AuctionStatus.SCHEDULED]: [AuctionStatus.ACTIVE, AuctionStatus.CANCELLED],
      [AuctionStatus.ACTIVE]: [AuctionStatus.PAUSED, AuctionStatus.COMPLETED, AuctionStatus.CANCELLED],
      [AuctionStatus.PAUSED]: [AuctionStatus.ACTIVE, AuctionStatus.CANCELLED],
      [AuctionStatus.COMPLETED]: [], // Terminal state
      [AuctionStatus.CANCELLED]: [], // Terminal state
      [AuctionStatus.SUSPENDED]: [AuctionStatus.ACTIVE, AuctionStatus.CANCELLED]
    };

    return validTransitions[currentStatus]?.includes(targetStatus) ?? false;
  }

  static validateTransition(
    auction: IAuction,
    targetStatus: AuctionStatus
  ): TransitionValidation {
    if (!this.canTransitionTo(auction.getStatus(), targetStatus)) {
      return {
        isValid: false,
        error: `Invalid transition from ${auction.getStatus()} to ${targetStatus}`
      };
    }

    // Additional business rule validations
    switch (targetStatus) {
      case AuctionStatus.COMPLETED:
        return this.validateCompletion(auction);
      case AuctionStatus.ACTIVE:
        return this.validateActivation(auction);
      default:
        return { isValid: true };
    }
  }
}
```

## 3. Utility Functions for Bid Validation and Processing

### Purpose and Usage Scenarios
Utility functions provide stateless, pure functions for bid validation and processing that can be composed and reused across different auction types and contexts.

### Core Utility Categories

#### Bid Validation Utils
```typescript
class BidValidationUtils {
  static validateBidAmount(
    amount: Price,
    constraints: BidConstraints
  ): ValidationResult {
    const errors: string[] = [];

    if (amount.isLessThan(constraints.minAmount)) {
      errors.push(`Bid amount must be at least ${constraints.minAmount}`);
    }

    if (amount.isGreaterThan(constraints.maxAmount)) {
      errors.push(`Bid amount cannot exceed ${constraints.maxAmount}`);
    }

    if (!Number.isInteger(amount.getCents())) {
      errors.push('Bid amount must be in whole cents');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateBidderEligibility(
    bidder: IUser,
    auction: IAuction,
    bidHistory: ReadonlyArray<Bid>
  ): ValidationResult {
    const errors: string[] = [];

    if (!bidder.canParticipateInAuction(auction)) {
      errors.push('Bidder is not eligible to participate in this auction');
    }

    if (auction.isCompleted()) {
      errors.push('Auction has already ended');
    }

    if (!auction.isActive()) {
      errors.push('Auction is not currently active');
    }

    // Check for auction-specific eligibility rules
    const strategy = AuctionStrategyFactory.getStrategy(auction.getType());
    if (!strategy.canBidderParticipate(bidder, auction, bidHistory)) {
      errors.push('Bidder does not meet auction-specific participation requirements');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateBidTiming(
    bidTime: Date,
    auction: IAuction,
    lastBidTime?: Date
  ): ValidationResult {
    const errors: string[] = [];

    if (bidTime < auction.getStartTime()) {
      errors.push('Bid placed before auction started');
    }

    if (bidTime > auction.getEndTime()) {
      errors.push('Bid placed after auction ended');
    }

    // Check minimum time between bids (anti-sniping)
    if (lastBidTime && auction.getConfig().minBidIntervalMs) {
      const timeSinceLastBid = bidTime.getTime() - lastBidTime.getTime();
      if (timeSinceLastBid < auction.getConfig().minBidIntervalMs) {
        errors.push('Bids placed too quickly');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
```

#### Bid Processing Utils
```typescript
class BidProcessingUtils {
  static calculateBidPriority(
    bid: Bid,
    auctionType: AuctionType,
    existingBids: ReadonlyArray<Bid>
  ): number {
    switch (auctionType) {
      case AuctionType.ENGLISH:
        return bid.getAmount().getCents();
      case AuctionType.VICKREY:
        // Higher bids get higher priority in sealed-bid auctions
        return bid.getAmount().getCents();
      case AuctionType.DUTCH:
        // Earlier bids (lower prices) get higher priority
        return -bid.getTimestamp().getTime();
      case AuctionType.ALL_PAY:
        // All bids are processed equally
        return 0;
      default:
        return bid.getAmount().getCents();
    }
  }

  static determineBidPosition(
    newBid: Bid,
    existingBids: ReadonlyArray<Bid>,
    auctionType: AuctionType
  ): BidPosition {
    const sortedBids = this.sortBidsForAuction([...existingBids, newBid], auctionType);
    const position = sortedBids.findIndex(bid => bid.getId() === newBid.getId());

    return {
      position: position + 1,
      totalBids: sortedBids.length,
      isWinning: position === 0,
      percentile: ((position + 1) / sortedBids.length) * 100
    };
  }

  static sortBidsForAuction(
    bids: Bid[],
    auctionType: AuctionType
  ): Bid[] {
    return bids.sort((a, b) => {
      switch (auctionType) {
        case AuctionType.ENGLISH:
        case AuctionType.JAPANESE:
          return b.getAmount().getCents() - a.getAmount().getCents(); // Descending
        case AuctionType.DUTCH:
        case AuctionType.REVERSE:
          return a.getAmount().getCents() - b.getAmount().getCents(); // Ascending
        case AuctionType.VICKREY:
          return b.getAmount().getCents() - a.getAmount().getCents(); // Descending
        default:
          return b.getAmount().getCents() - a.getAmount().getCents();
      }
    });
  }
}
```

## 4. Reusable Types for Auction Configuration and State

### Purpose and Usage Scenarios
Branded types and value objects provide compile-time safety, prevent primitive obsession, and ensure domain invariants while maintaining zero-copy semantics.

### Core Type Definitions

#### Branded Types for Type Safety
```typescript
// Branded types to prevent primitive obsession
export type AuctionId = string & { readonly __brand: 'AuctionId' };
export type BidId = string & { readonly __brand: 'BidId' };
export type BidderId = string & { readonly __brand: 'BidderId' };
export type ItemId = string & { readonly __brand: 'ItemId' };

export const AuctionId = {
  create(value: string): AuctionId {
    if (!value || value.trim().length === 0) {
      throw new Error('AuctionId cannot be empty');
    }
    return value as AuctionId;
  },

  fromExisting(value: string): AuctionId {
    return value as AuctionId;
  }
} as const;
```

#### Money Value Object
```typescript
class Money {
  private constructor(
    private readonly amount: number,
    private readonly currency: Currency
  ) {}

  static fromCents(cents: number, currency: Currency = Currency.USD): Money {
    return new Money(cents / 100, currency);
  }

  static fromDollars(dollars: number, currency: Currency = Currency.USD): Money {
    return new Money(dollars, currency);
  }

  add(other: Money): Money {
    this.ensureSameCurrency(other);
    return new Money(this.amount + other.amount, this.currency);
  }

  subtract(other: Money): Money {
    this.ensureSameCurrency(other);
    return new Money(this.amount - other.amount, this.currency);
  }

  multiply(factor: number): Money {
    return new Money(this.amount * factor, this.currency);
  }

  isGreaterThan(other: Money): boolean {
    this.ensureSameCurrency(other);
    return this.amount > other.amount;
  }

  isLessThan(other: Money): boolean {
    this.ensureSameCurrency(other);
    return this.amount < other.amount;
  }

  toCents(): number {
    return Math.round(this.amount * 100);
  }

  toDollars(): number {
    return this.amount;
  }

  private ensureSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(`Currency mismatch: ${this.currency} vs ${other.currency}`);
    }
  }
}
```

#### Auction Configuration Types
```typescript
interface BaseAuctionConfig {
  readonly minBidIncrement: Money;
  readonly reservePrice?: Money;
  readonly maxAutoExtensions: number;
  readonly extensionTriggerSeconds: number;
  readonly extensionDurationSeconds: number;
  readonly allowBidRetraction: boolean;
  readonly minBidIntervalMs: number;
}

interface EnglishAuctionConfig extends BaseAuctionConfig {
  readonly type: AuctionType.ENGLISH;
  readonly startingPrice: Money;
  readonly antiSnipingEnabled: boolean;
  readonly proxyBiddingEnabled: boolean;
}

interface DutchAuctionConfig extends BaseAuctionConfig {
  readonly type: AuctionType.DUTCH;
  readonly startingPrice: Money;
  readonly priceDecrement: Money;
  readonly decrementIntervalSeconds: number;
  readonly minimumPrice?: Money;
}

interface SealedBidAuctionConfig extends BaseAuctionConfig {
  readonly type: AuctionType.SEALED_BID;
  readonly bidRevealTime: Date;
  readonly allowLateBids: boolean;
  readonly maxBidsPerBidder: number;
}

// Union type for all auction configurations
type AuctionConfig =
  | EnglishAuctionConfig
  | DutchAuctionConfig
  | SealedBidAuctionConfig
  | ReverseAuctionConfig
  | VickreyAuctionConfig
  | BuyItNowAuctionConfig
  | DoubleAuctionConfig
  | AllPayAuctionConfig
  | JapaneseAuctionConfig
  | ChineseAuctionConfig
  | PennyAuctionConfig
  | MultiUnitAuctionConfig
  | CombinatorialAuctionConfig;
```

## 5. Factory Patterns for Auction Type Creation

### Purpose and Usage Scenarios
Factory patterns encapsulate auction creation logic, ensuring proper initialization and configuration based on auction type while maintaining single responsibility and open/closed principles.

### Factory Interface and Implementation
```typescript
interface IAuctionFactory {
  createAuction(type: AuctionType, config: AuctionConfig): IAuction;
  recreateAuction(id: AuctionId, snapshot: AuctionSnapshot): IAuction;
  getSupportedTypes(): AuctionType[];
}

class AuctionFactory implements IAuctionFactory {
  constructor(
    private strategyFactory: IAuctionStrategyFactory,
    private validatorFactory: IAuctionValidatorFactory,
    private configValidator: IAuctionConfigValidator
  ) {}

  createAuction(type: AuctionType, config: AuctionConfig): IAuction {
    // Validate configuration for specific auction type
    const validation = this.configValidator.validate(type, config);
    if (!validation.isValid) {
      throw new AuctionConfigurationError(validation.errors);
    }

    // Create type-specific auction instance
    switch (type) {
      case AuctionType.ENGLISH:
        return this.createEnglishAuction(config as EnglishAuctionConfig);
      case AuctionType.DUTCH:
        return this.createDutchAuction(config as DutchAuctionConfig);
      case AuctionType.VICKREY:
        return this.createVickreyAuction(config as VickreyAuctionConfig);
      case AuctionType.PENNY:
        return this.createPennyAuction(config as PennyAuctionConfig);
      case AuctionType.COMBINATORIAL:
        return this.createCombinatorialAuction(config as CombinatorialAuctionConfig);
      default:
        throw new UnsupportedAuctionTypeError(type);
    }
  }

  private createEnglishAuction(config: EnglishAuctionConfig): EnglishAuction {
    const strategy = this.strategyFactory.createStrategy(AuctionType.ENGLISH);
    const validator = this.validatorFactory.createValidator(AuctionType.ENGLISH);

    return new EnglishAuction({
      id: AuctionId.create(generateId()),
      config,
      strategy,
      validator,
      createdAt: new Date()
    });
  }

  private createDutchAuction(config: DutchAuctionConfig): DutchAuction {
    const strategy = this.strategyFactory.createStrategy(AuctionType.DUTCH);
    const validator = this.validatorFactory.createValidator(AuctionType.DUTCH);

    return new DutchAuction({
      id: AuctionId.create(generateId()),
      config,
      strategy,
      validator,
      createdAt: new Date()
    });
  }

  private createVickreyAuction(config: VickreyAuctionConfig): VickreyAuction {
    const strategy = this.strategyFactory.createStrategy(AuctionType.VICKREY);
    const validator = this.validatorFactory.createValidator(AuctionType.VICKREY);

    return new VickreyAuction({
      id: AuctionId.create(generateId()),
      config,
      strategy,
      validator,
      createdAt: new Date()
    });
  }

  private createPennyAuction(config: PennyAuctionConfig): PennyAuction {
    const strategy = this.strategyFactory.createStrategy(AuctionType.PENNY);
    const validator = this.validatorFactory.createValidator(AuctionType.PENNY);

    return new PennyAuction({
      id: AuctionId.create(generateId()),
      config,
      strategy,
      validator,
      createdAt: new Date()
    });
  }

  private createCombinatorialAuction(config: CombinatorialAuctionConfig): CombinatorialAuction {
    const strategy = this.strategyFactory.createStrategy(AuctionType.COMBINATORIAL);
    const validator = this.validatorFactory.createValidator(AuctionType.COMBINATORIAL);

    return new CombinatorialAuction({
      id: AuctionId.create(generateId()),
      config,
      strategy,
      validator,
      createdAt: new Date()
    });
  }
}
```

## 6. Strategy Patterns for Auction-Specific Logic

### Purpose and Usage Scenarios
Strategy patterns encapsulate auction-type-specific algorithms for bid processing, winner determination, and price calculation while maintaining consistent interfaces.

### Strategy Interface Definitions
```typescript
interface IBidProcessingStrategy {
  processBid(auction: IAuction, bid: IBid): BidProcessingResult;
  validateBid(auction: IAuction, bid: IBid): BidValidation;
  calculateBidImpact(auction: IAuction, bid: IBid): BidImpact;
}

interface IWinnerDeterminationStrategy {
  determineWinner(auction: IAuction): WinnerDeterminationResult;
  determineWinners(auction: IAuction): WinnersDeterminationResult;
  isAuctionComplete(auction: IAuction): boolean;
}

interface IPriceCalculationStrategy {
  calculateCurrentPrice(auction: IAuction): Price;
  calculateNextPrice(auction: IAuction, lastBid?: IBid): Price;
  shouldUpdatePrice(auction: IAuction, lastBid?: IBid): boolean;
}
```

### Strategy Implementations by Auction Type

#### English Auction Strategy
```typescript
class EnglishAuctionStrategy implements
  IBidProcessingStrategy,
  IWinnerDeterminationStrategy,
  IPriceCalculationStrategy {

  processBid(auction: IAuction, bid: IBid): BidProcessingResult {
    if (!this.validateBid(auction, bid).isValid) {
      return { success: false, errors: ['Invalid bid'] };
    }

    const currentPrice = auction.getCurrentPrice();
    if (!bid.getAmount().isGreaterThan(currentPrice)) {
      return { success: false, errors: ['Bid too low'] };
    }

    return {
      success: true,
      newPrice: bid.getAmount(),
      shouldNotify: true,
      notifications: ['bid_placed', 'price_updated']
    };
  }

  determineWinner(auction: IAuction): WinnerDeterminationResult {
    const bids = auction.getBids();
    if (bids.length === 0) {
      return { hasWinner: false };
    }

    const winningBid = bids.reduce((highest, current) =>
      current.getAmount().isGreaterThan(highest.getAmount()) ? current : highest
    );

    return {
      hasWinner: true,
      winner: winningBid.getBidderId(),
      winningBid: winningBid.getId(),
      winningPrice: winningBid.getAmount()
    };
  }

  calculateCurrentPrice(auction: IAuction): Price {
    const bids = auction.getBids();
    if (bids.length === 0) {
      return auction.getStartingPrice();
    }

    return bids.reduce((highest, current) =>
      current.getAmount().isGreaterThan(highest) ? current.getAmount() : highest
    );
  }
}
```

#### Vickrey Auction Strategy
```typescript
class VickreyAuctionStrategy implements
  IBidProcessingStrategy,
  IWinnerDeterminationStrategy,
  IPriceCalculationStrategy {

  processBid(auction: IAuction, bid: IBid): BidProcessingResult {
    // In Vickrey auctions, all valid bids are accepted
    // Price is only revealed at the end
    return {
      success: true,
      newPrice: auction.getCurrentPrice(), // Price doesn't change during bidding
      shouldNotify: false, // No real-time price updates
      notifications: []
    };
  }

  determineWinner(auction: IAuction): WinnerDeterminationResult {
    const bids = auction.getBids();
    if (bids.length === 0) {
      return { hasWinner: false };
    }

    // Sort bids in descending order
    const sortedBids = [...bids].sort((a, b) =>
      b.getAmount().getCents() - a.getAmount().getCents()
    );

    const winningBid = sortedBids[0];
    const secondPrice = sortedBids.length > 1 ? sortedBids[1].getAmount() : winningBid.getAmount();

    return {
      hasWinner: true,
      winner: winningBid.getBidderId(),
      winningBid: winningBid.getId(),
      winningPrice: secondPrice // Winner pays second-highest price
    };
  }

  calculateCurrentPrice(auction: IAuction): Price {
    // In Vickrey auctions, current price is not revealed during bidding
    return auction.getStartingPrice();
  }
}
```

#### Penny Auction Strategy
```typescript
class PennyAuctionStrategy implements
  IBidProcessingStrategy,
  IWinnerDeterminationStrategy,
  IPriceCalculationStrategy {

  processBid(auction: IAuction, bid: IBid): BidProcessingResult {
    const config = auction.getConfig() as PennyAuctionConfig;

    // Each bid extends the auction time
    const timeExtension = config.bidFeeAmount;
    const newEndTime = auction.getEndTime().getTime() + timeExtension;

    return {
      success: true,
      newPrice: auction.getCurrentPrice().add(config.bidFeeAmount),
      shouldNotify: true,
      notifications: ['bid_placed', 'time_extended'],
      extensions: [{
        reason: 'bid_placed',
        duration: timeExtension,
        newEndTime: new Date(newEndTime)
      }]
    };
  }

  determineWinner(auction: IAuction): WinnerDeterminationResult {
    // Winner is the last bidder when time runs out
    const bids = auction.getBids();
    if (bids.length === 0) {
      return { hasWinner: false };
    }

    const lastBid = bids.reduce((latest, current) =>
      current.getTimestamp() > latest.getTimestamp() ? current : latest
    );

    return {
      hasWinner: true,
      winner: lastBid.getBidderId(),
      winningBid: lastBid.getId(),
      winningPrice: auction.getCurrentPrice()
    };
  }

  calculateCurrentPrice(auction: IAuction): Price {
    const config = auction.getConfig() as PennyAuctionConfig;
    const bidCount = auction.getBids().length;
    return config.bidFeeAmount.multiply(bidCount);
  }
}
```

## 7. Decorator Patterns for Cross-Cutting Concerns

### Purpose and Usage Scenarios
Decorator patterns add cross-cutting concerns like logging, caching, validation, and monitoring to auction operations without modifying core business logic.

### Decorator Interface Definitions
```typescript
interface IAuctionService {
  createAuction(request: CreateAuctionRequest): Promise<IAuction>;
  placeBid(request: PlaceBidRequest): Promise<BidResult>;
  endAuction(auctionId: AuctionId): Promise<AuctionResult>;
}

interface IAuctionServiceDecorator extends IAuctionService {
  setService(service: IAuctionService): void;
}
```

### Decorator Implementations

#### Logging Decorator
```typescript
class LoggingAuctionServiceDecorator implements IAuctionServiceDecorator {
  constructor(private logger: ILogger) {}

  private service!: IAuctionService;

  setService(service: IAuctionService): void {
    this.service = service;
  }

  async createAuction(request: CreateAuctionRequest): Promise<IAuction> {
    const startTime = Date.now();
    this.logger.info('Creating auction', { type: request.type, title: request.title });

    try {
      const auction = await this.service.createAuction(request);
      const duration = Date.now() - startTime;

      this.logger.info('Auction created successfully', {
        auctionId: auction.getId(),
        duration: `${duration}ms`
      });

      return auction;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Failed to create auction', error as Error, {
        duration: `${duration}ms`,
        type: request.type
      });
      throw error;
    }
  }

  async placeBid(request: PlaceBidRequest): Promise<BidResult> {
    const startTime = Date.now();
    this.logger.debug('Processing bid', {
      auctionId: request.auctionId,
      bidderId: request.bidderId,
      amount: request.amount.toDollars()
    });

    try {
      const result = await this.service.placeBid(request);
      const duration = Date.now() - startTime;

      if (result.success) {
        this.logger.info('Bid placed successfully', {
          bidId: result.bidId,
          duration: `${duration}ms`
        });
      } else {
        this.logger.warn('Bid placement failed', {
          duration: `${duration}ms`,
          errors: result.errors
        });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Bid placement error', error as Error, {
        duration: `${duration}ms`
      });
      throw error;
    }
  }

  async endAuction(auctionId: AuctionId): Promise<AuctionResult> {
    const startTime = Date.now();
    this.logger.info('Ending auction', { auctionId });

    try {
      const result = await this.service.endAuction(auctionId);
      const duration = Date.now() - startTime;

      this.logger.info('Auction ended successfully', {
        auctionId,
        winner: result.winnerId,
        finalPrice: result.finalPrice?.toDollars(),
        duration: `${duration}ms`
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Failed to end auction', error as Error, {
        auctionId,
        duration: `${duration}ms`
      });
      throw error;
    }
  }
}
```

#### Caching Decorator
```typescript
class CachingAuctionServiceDecorator implements IAuctionServiceDecorator {
  constructor(
    private cache: ICache,
    private ttlSeconds: number = 300
  ) {}

  private service!: IAuctionService;

  setService(service: IAuctionService): void {
    this.service = service;
  }

  async createAuction(request: CreateAuctionRequest): Promise<IAuction> {
    // Auction creation is not cached (write operation)
    return this.service.createAuction(request);
  }

  async placeBid(request: PlaceBidRequest): Promise<BidResult> {
    // Bid placement is not cached (write operation)
    return this.service.placeBid(request);
  }

  async endAuction(auctionId: AuctionId): Promise<AuctionResult> {
    const cacheKey = `auction:result:${auctionId}`;

    // Try to get from cache first
    const cached = await this.cache.get<AuctionResult>(cacheKey);
    if (cached) {
      return cached;
    }

    // Not in cache, call service
    const result = await this.service.endAuction(auctionId);

    // Cache the result
    await this.cache.set(cacheKey, result, this.ttlSeconds);

    return result;
  }
}
```

#### Validation Decorator
```typescript
class ValidationAuctionServiceDecorator implements IAuctionServiceDecorator {
  constructor(private validator: IAuctionValidator) {}

  private service!: IAuctionService;

  setService(service: IAuctionService): void {
    this.service = service;
  }

  async createAuction(request: CreateAuctionRequest): Promise<IAuction> {
    const validation = await this.validator.validateCreateAuctionRequest(request);
    if (!validation.isValid) {
      throw new ValidationError('Invalid auction creation request', validation.errors);
    }

    return this.service.createAuction(request);
  }

  async placeBid(request: PlaceBidRequest): Promise<BidResult> {
    const validation = await this.validator.validatePlaceBidRequest(request);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    return this.service.placeBid(request);
  }

  async endAuction(auctionId: AuctionId): Promise<AuctionResult> {
    const validation = await this.validator.validateEndAuctionRequest(auctionId);
    if (!validation.isValid) {
      throw new ValidationError('Invalid auction end request', validation.errors);
    }

    return this.service.endAuction(auctionId);
  }
}
```

#### Metrics Decorator
```typescript
class MetricsAuctionServiceDecorator implements IAuctionServiceDecorator {
  constructor(private metrics: IMetricsCollector) {}

  private service!: IAuctionService;

  setService(service: IAuctionService): void {
    this.service = service;
  }

  async createAuction(request: CreateAuctionRequest): Promise<IAuction> {
    const startTime = Date.now();
    const timer = this.metrics.startTimer('auction_create_duration');

    try {
      const auction = await this.service.createAuction(request);

      timer.end({
        auction_type: request.type,
        success: 'true'
      });

      this.metrics.increment('auction_created_total', 1, {
        auction_type: request.type
      });

      return auction;
    } catch (error) {
      timer.end({
        auction_type: request.type,
        success: 'false'
      });

      this.metrics.increment('auction_create_errors_total', 1, {
        auction_type: request.type,
        error_type: error.name
      });

      throw error;
    }
  }

  async placeBid(request: PlaceBidRequest): Promise<BidResult> {
    const startTime = Date.now();
    const timer = this.metrics.startTimer('bid_place_duration');

    try {
      const result = await this.service.placeBid(request);

      timer.end({
        auction_id: request.auctionId,
        success: result.success ? 'true' : 'false'
      });

      this.metrics.increment('bid_placed_total', 1, {
        auction_id: request.auctionId,
        success: result.success ? 'true' : 'false'
      });

      return result;
    } catch (error) {
      timer.end({
        auction_id: request.auctionId,
        success: 'false'
      });

      this.metrics.increment('bid_place_errors_total', 1, {
        auction_id: request.auctionId,
        error_type: error.name
      });

      throw error;
    }
  }

  async endAuction(auctionId: AuctionId): Promise<AuctionResult> {
    const startTime = Date.now();
    const timer = this.metrics.startTimer('auction_end_duration');

    try {
      const result = await this.service.endAuction(auctionId);

      timer.end({
        auction_id: auctionId,
        success: 'true'
      });

      this.metrics.increment('auction_ended_total', 1, {
        auction_id: auctionId
      });

      return result;
    } catch (error) {
      timer.end({
        auction_id: auctionId,
        success: 'false'
      });

      this.metrics.increment('auction_end_errors_total', 1, {
        auction_id: auctionId,
        error_type: error.name
      });

      throw error;
    }
  }
}
```

## 8. Integration Points with Architectural Layers

### Domain Layer Integration
- **Value Objects**: Money, AuctionType, BidAmount used throughout domain entities
- **Domain Services**: Strategy patterns implement domain services for winner determination
- **Entities**: Common interfaces implemented by domain entities

### Repository Layer Integration
- **Query Specifications**: Reusable query builders for common auction queries
- **Repository Interfaces**: Common repository patterns for all auction types
- **Data Mappers**: Type-safe mapping between domain objects and database records

### Service Layer Integration
- **Application Services**: Use helper methods for common operations
- **Domain Services**: Implement strategy interfaces for auction-specific logic
- **Decorator Chain**: Cross-cutting concerns applied via decorator pattern

### API Layer Integration
- **Request/Response Types**: Branded types ensure type safety across API boundaries
- **Validation**: Utility functions used for API request validation
- **Error Handling**: Consistent error types across all API endpoints

### Infrastructure Layer Integration
- **Caching**: Decorator pattern integrates with caching infrastructure
- **Logging**: Structured logging with consistent context across all operations
- **Metrics**: Performance monitoring integrated via decorator pattern

## 9. Performance Considerations and Optimizations

### Zero-Copy Operations
```typescript
class ZeroCopyBidProcessor {
  // Use readonly arrays to prevent unnecessary copying
  processBids(bids: ReadonlyArray<Bid>): BidProcessingResult {
    // Process bids without creating intermediate arrays
    let highestBid = bids[0];
    for (let i = 1; i < bids.length; i++) {
      if (bids[i].getAmount().isGreaterThan(highestBid.getAmount())) {
        highestBid = bids[i];
      }
    }
    return { winningBid: highestBid };
  }
}
```

### Memory Efficiency
```typescript
class MemoryEfficientAuctionStorage {
  // Use object pooling for frequently created objects
  private bidPool: Bid[] = [];

  createBid(data: BidData): Bid {
    const bid = this.bidPool.pop() || new Bid();
    return bid.initialize(data);
  }

  releaseBid(bid: Bid): void {
    bid.reset();
    this.bidPool.push(bid);
  }
}
```

### Real-Time Performance Optimizations
```typescript
class RealTimeAuctionEngine {
  // Pre-allocate and reuse notification objects
  private notificationBuffer: NotificationMessage[] = [];

  async processHighFrequencyBids(bidStream: AsyncIterable<Bid>): Promise<void> {
    // Batch bid processing for high-frequency scenarios
    const batchSize = 100;
    let batch: Bid[] = [];

    for await (const bid of bidStream) {
      batch.push(bid);

      if (batch.length >= batchSize) {
        await this.processBidBatch(batch);
        batch = [];
      }
    }

    // Process remaining bids
    if (batch.length > 0) {
      await this.processBidBatch(batch);
    }
  }
}
```

## 10. Testing Strategies for Reusability

### Unit Testing Patterns
```typescript
describe('AuctionStrategyFactory', () => {
  it('should create correct strategy for each auction type', () => {
    const factory = new AuctionStrategyFactory();

    Object.values(AuctionType).forEach(type => {
      const strategy = factory.createStrategy(type);
      expect(strategy).toBeDefined();
      expect(strategy.strategyType).toBe(type);
    });
  });
});

describe('BidValidationUtils', () => {
  it('should validate bid amounts consistently across auction types', () => {
    const constraints = { minAmount: Money.fromDollars(10), maxAmount: Money.fromDollars(1000) };

    // Test with various amounts
    expect(BidValidationUtils.validateBidAmount(Money.fromDollars(5), constraints).isValid).toBe(false);
    expect(BidValidationUtils.validateBidAmount(Money.fromDollars(50), constraints).isValid).toBe(true);
    expect(BidValidationUtils.validateBidAmount(Money.fromDollars(2000), constraints).isValid).toBe(false);
  });
});
```

### Integration Testing Patterns
```typescript
describe('AuctionEngine Integration', () => {
  it('should handle complete auction lifecycle across all types', async () => {
    const engine = createAuctionEngine();

    for (const auctionType of Object.values(AuctionType)) {
      const auction = await engine.createAuction(createAuctionRequest(auctionType));
      await engine.startAuction(auction.getId());

      // Place multiple bids
      for (const bidder of testBidders) {
        await engine.placeBid(createBidRequest(auction.getId(), bidder));
      }

      const result = await engine.endAuction(auction.getId());
      expect(result).toBeDefined();
      expect(result.winnerId).toBeDefined();
    }
  });
});
```

### Performance Testing Patterns
```typescript
describe('AuctionEngine Performance', () => {
  it('should handle high-frequency bidding', async () => {
    const engine = createAuctionEngine();
    const auction = await engine.createAuction(createEnglishAuctionRequest());

    // Simulate 1000 concurrent bidders
    const bidPromises = Array.from({ length: 1000 }, (_, i) =>
      engine.placeBid(createBidRequest(auction.getId(), `bidder_${i}`))
    );

    const startTime = Date.now();
    const results = await Promise.all(bidPromises);
    const duration = Date.now() - startTime;

    expect(results.every(r => r.success)).toBe(true);
    expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
  });
});
```

## Summary

This comprehensive reusable patterns design provides:

1. **Type Safety**: Branded types and interfaces prevent runtime errors and improve developer experience
2. **Performance**: Zero-copy operations, memory efficiency, and real-time optimizations
3. **Maintainability**: Clear separation of concerns, single responsibility principle, and consistent patterns
4. **Extensibility**: Factory and strategy patterns allow easy addition of new auction types
5. **Testability**: Comprehensive testing strategies ensure reliability and reusability
6. **Integration**: Seamless integration with existing layered architecture

The patterns support all 13 auction types while maintaining clean, maintainable code that can handle real-time bidding scenarios with fault tolerance and crash resilience.