import { AllPayAuctionStrategy } from "../auction-types/all-pay-auction";
import { BuyItNowAuctionStrategy } from "../auction-types/buy-it-now-auction";
import { ChineseAuctionStrategy } from "../auction-types/chinese-auction";
import { CombinatorialAuctionStrategy } from "../auction-types/combinatorial-auction";
import { DoubleAuctionStrategy } from "../auction-types/double-auction";
import { DutchAuctionStrategy } from "../auction-types/dutch-auction";
import { EnglishAuctionStrategy } from "../auction-types/english-auction";
import { JapaneseAuctionStrategy } from "../auction-types/japanese-auction";
import { MultiUnitAuctionStrategy } from "../auction-types/multi-unit-auction";
import { PennyAuctionStrategy } from "../auction-types/penny-auction";
import { ReverseAuctionStrategy } from "../auction-types/reverse-auction";
import { SealedBidAuctionStrategy } from "../auction-types/sealed-bid-auction";
import { VickreyAuctionStrategy } from "../auction-types/vickrey-auction";
import { AuctionType, type IAuctionStrategy } from "../types/core-interfaces";

/**
 * Factory for creating auction strategies based on auction type.
 * Implements the Factory pattern to encapsulate strategy creation logic
 * and ensure proper strategy assignment for each auction type.
 */
export class AuctionStrategyFactory {
	private strategies: Map<AuctionType, IAuctionStrategy> = new Map();

	constructor() {
		this.initializeStrategies();
	}

	/**
	 * Creates and returns the appropriate strategy for the given auction type.
	 */
	createStrategy(type: AuctionType): IAuctionStrategy {
		const strategy = this.strategies.get(type);
		if (!strategy) {
			throw new Error(`Unsupported auction type: ${type}`);
		}
		return strategy;
	}

	/**
	 * Returns all supported auction types that have strategies available.
	 */
	getSupportedTypes(): AuctionType[] {
		return Array.from(this.strategies.keys());
	}

	/**
	 * Checks if a strategy is available for the given auction type.
	 */
	hasStrategy(type: AuctionType): boolean {
		return this.strategies.has(type);
	}

	/**
	 * Registers a new strategy for an auction type.
	 * Useful for adding custom auction types or overriding default strategies.
	 */
	registerStrategy(type: AuctionType, strategy: IAuctionStrategy): void {
		this.strategies.set(type, strategy);
	}

	/**
	 * Initializes all default strategies for supported auction types.
	 */
	private initializeStrategies(): void {
		// Register all supported auction type strategies
		this.strategies.set(AuctionType.ENGLISH, new EnglishAuctionStrategy());
		this.strategies.set(AuctionType.DUTCH, new DutchAuctionStrategy());
		this.strategies.set(AuctionType.SEALED_BID, new SealedBidAuctionStrategy());
		this.strategies.set(AuctionType.REVERSE, new ReverseAuctionStrategy());
		this.strategies.set(AuctionType.VICKREY, new VickreyAuctionStrategy());
		this.strategies.set(AuctionType.BUY_IT_NOW, new BuyItNowAuctionStrategy());
		this.strategies.set(AuctionType.DOUBLE, new DoubleAuctionStrategy());
		this.strategies.set(AuctionType.ALL_PAY, new AllPayAuctionStrategy());
		this.strategies.set(AuctionType.JAPANESE, new JapaneseAuctionStrategy());
		this.strategies.set(AuctionType.CHINESE, new ChineseAuctionStrategy());
		this.strategies.set(AuctionType.PENNY, new PennyAuctionStrategy());
		this.strategies.set(AuctionType.MULTI_UNIT, new MultiUnitAuctionStrategy());
		this.strategies.set(
			AuctionType.COMBINATORIAL,
			new CombinatorialAuctionStrategy(),
		);
	}
}
