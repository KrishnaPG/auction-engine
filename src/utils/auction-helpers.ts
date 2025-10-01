// Auction Lifecycle Management Helpers

import {
	createAuctionDuration,
	createBidAmount,
	createMinimumIncrement,
	createTimeExtension,
	createTimestamp,
} from "../types/branded-constructors";
import type {
	TAuctionDuration,
	TAuctionEndTime,
	TAuctionStartTime,
	TBidAmount,
	TCurrentPrice,
	TMinimumIncrement,
	TTimeExtension,
	TTimestamp,
} from "../types/branded-types";
import type {
	AuctionExtension,
	Duration,
	IAuction,
	Money,
	TransitionValidation,
} from "../types/core-interfaces";
import { AuctionStatus, AuctionType } from "../types/core-interfaces";

/**
 * Time Management Helpers for Auction Lifecycle
 */
export class AuctionTimeHelpers {
	/**
	 * Check if an auction is currently active
	 */
	static isAuctionActive(auction: IAuction): boolean {
		const now = createTimestamp(Date.now());
		const startTime = auction.getStartTime();
		const endTime = auction.getEndTime();

		return startTime <= now && now <= endTime;
	}

	/**
	 * Check if an auction has ended
	 */
	static isAuctionEnded(auction: IAuction): boolean {
		const now = createTimestamp(Date.now());
		return now > auction.getEndTime();
	}

	/**
	 * Check if an auction should start
	 */
	static shouldStartAuction(auction: IAuction): boolean {
		const now = createTimestamp(Date.now());
		return (
			auction.getStatus() === AuctionStatus.SCHEDULED &&
			now >= auction.getStartTime()
		);
	}

	/**
	 * Check if an auction should end
	 */
	static shouldEndAuction(auction: IAuction): boolean {
		const now = createTimestamp(Date.now());
		return (
			auction.getStatus() === AuctionStatus.ACTIVE &&
			now >= auction.getEndTime()
		);
	}

	/**
	 * Check if an auction should be extended based on last bid time
	 */
	static shouldExtendAuction(
		auction: IAuction,
		lastBidTime: TTimestamp,
		extensionConfig: ExtensionConfig,
	): boolean {
		if (!extensionConfig.autoExtend) return false;

		const timeUntilEnd = Number(auction.getEndTime()) - Number(lastBidTime);
		const thresholdMs = extensionConfig.triggerThresholdSeconds * 1000;

		return timeUntilEnd <= thresholdMs && auction.canExtend();
	}

	/**
	 * Calculate new end time after extension
	 */
	static calculateExtensionEndTime(
		currentEndTime: TAuctionEndTime,
		extensionDuration: TTimeExtension,
	): TAuctionEndTime {
		const newEndTime = Number(currentEndTime) + Number(extensionDuration);
		return createTimestamp(newEndTime) as TAuctionEndTime;
	}

	/**
	 * Get time remaining until auction ends
	 */
	static getTimeRemaining(auction: IAuction): TAuctionDuration {
		const now = createTimestamp(Date.now());
		const endTime = auction.getEndTime();

		if (now >= endTime) {
			return createAuctionDuration(0);
		}

		return createAuctionDuration(Number(endTime) - Number(now));
	}

	/**
	 * Get time until auction starts
	 */
	static getTimeUntilStart(auction: IAuction): TAuctionDuration {
		const now = createTimestamp(Date.now());
		const startTime = auction.getStartTime();

		if (now >= startTime) {
			return createAuctionDuration(0);
		}

		return createAuctionDuration(Number(startTime) - Number(now));
	}

	/**
	 * Format duration for display
	 */
	static formatDuration(duration: TAuctionDuration): string {
		const ms = Number(duration);
		const seconds = Math.floor(ms / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);

		if (days > 0) {
			return `${days}d ${hours % 24}h ${minutes % 60}m`;
		} else if (hours > 0) {
			return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
		} else if (minutes > 0) {
			return `${minutes}m ${seconds % 60}s`;
		} else {
			return `${seconds}s`;
		}
	}
}

/**
 * Price Calculation Helpers
 */
export class AuctionPriceHelpers {
	/**
	 * Calculate next valid bid amount for English auction
	 */
	static calculateNextValidBid(
		currentPrice: TCurrentPrice,
		minIncrement: TMinimumIncrement,
		auctionType: AuctionType,
	): TBidAmount {
		const current = Number(currentPrice);
		const increment = Number(minIncrement);

		switch (auctionType) {
			case AuctionType.ENGLISH:
			case AuctionType.JAPANESE:
				return createBidAmount(current + increment);
			case AuctionType.DUTCH:
			case AuctionType.REVERSE:
				return createBidAmount(current - increment);
			case AuctionType.VICKREY:
				return createBidAmount(current + increment);
			default:
				return createBidAmount(current + increment);
		}
	}

	/**
	 * Validate if bid amount is valid for auction type
	 */
	static isValidBidAmount(
		bidAmount: TBidAmount,
		currentPrice: TCurrentPrice,
		minIncrement: TMinimumIncrement,
		auctionType: AuctionType,
	): boolean {
		const nextValidAmount = AuctionPriceHelpers.calculateNextValidBid(
			currentPrice,
			minIncrement,
			auctionType,
		);
		const bid = Number(bidAmount);
		const nextValid = Number(nextValidAmount);

		switch (auctionType) {
			case AuctionType.ENGLISH:
			case AuctionType.JAPANESE:
			case AuctionType.VICKREY:
				return bid >= nextValid;
			case AuctionType.DUTCH:
			case AuctionType.REVERSE:
				return bid <= nextValid;
			default:
				return bid >= nextValid;
		}
	}

	/**
	 * Calculate price increment based on current price
	 */
	static calculateDynamicIncrement(
		currentPrice: TCurrentPrice,
		baseIncrement: TMinimumIncrement,
		incrementPercentage?: number,
	): TMinimumIncrement {
		if (!incrementPercentage) {
			return baseIncrement;
		}

		const current = Number(currentPrice);
		const base = Number(baseIncrement);
		const dynamicIncrement = Math.max(base, current * incrementPercentage);

		return createMinimumIncrement(Math.ceil(dynamicIncrement));
	}

	/**
	 * Calculate fair market value adjustment
	 */
	static calculateMarketAdjustment(
		estimatedValue: Money,
		bidHistory: readonly TBidAmount[],
	): number {
		if (bidHistory.length === 0) {
			return 1.0;
		}

		const avgBid =
			bidHistory.reduce((sum, bid) => sum + Number(bid), 0) / bidHistory.length;
		const estimated = Number(estimatedValue.amount);

		return avgBid / estimated;
	}
}

/**
 * State Transition Helpers
 */
export class AuctionStateHelpers {
	/**
	 * Check if transition between statuses is valid
	 */
	static canTransitionTo(
		currentStatus: AuctionStatus,
		targetStatus: AuctionStatus,
	): boolean {
		const validTransitions: Record<AuctionStatus, AuctionStatus[]> = {
			[AuctionStatus.DRAFT]: [AuctionStatus.SCHEDULED, AuctionStatus.CANCELLED],
			[AuctionStatus.SCHEDULED]: [
				AuctionStatus.ACTIVE,
				AuctionStatus.CANCELLED,
			],
			[AuctionStatus.ACTIVE]: [
				AuctionStatus.PAUSED,
				AuctionStatus.COMPLETED,
				AuctionStatus.CANCELLED,
			],
			[AuctionStatus.PAUSED]: [AuctionStatus.ACTIVE, AuctionStatus.CANCELLED],
			[AuctionStatus.COMPLETED]: [], // Terminal state
			[AuctionStatus.CANCELLED]: [], // Terminal state
			[AuctionStatus.SUSPENDED]: [
				AuctionStatus.ACTIVE,
				AuctionStatus.CANCELLED,
			],
		};

		return validTransitions[currentStatus]?.includes(targetStatus) ?? false;
	}

	/**
	 * Validate auction state transition
	 */
	static validateTransition(
		auction: IAuction,
		targetStatus: AuctionStatus,
	): TransitionValidation {
		if (
			!AuctionStateHelpers.canTransitionTo(auction.getStatus(), targetStatus)
		) {
			return {
				isValid: false,
				error: `Invalid transition from ${auction.getStatus()} to ${targetStatus}`,
			};
		}

		// Additional business rule validations
		switch (targetStatus) {
			case AuctionStatus.COMPLETED:
				return AuctionStateHelpers.validateCompletion(auction);
			case AuctionStatus.ACTIVE:
				return AuctionStateHelpers.validateActivation(auction);
			case AuctionStatus.PAUSED:
				return AuctionStateHelpers.validatePause(auction);
			default:
				return { isValid: true };
		}
	}

	/**
	 * Get valid next statuses for current auction state
	 */
	static getValidNextStatuses(currentStatus: AuctionStatus): AuctionStatus[] {
		const transitions: Record<AuctionStatus, AuctionStatus[]> = {
			[AuctionStatus.DRAFT]: [AuctionStatus.SCHEDULED, AuctionStatus.CANCELLED],
			[AuctionStatus.SCHEDULED]: [
				AuctionStatus.ACTIVE,
				AuctionStatus.CANCELLED,
			],
			[AuctionStatus.ACTIVE]: [
				AuctionStatus.PAUSED,
				AuctionStatus.COMPLETED,
				AuctionStatus.CANCELLED,
			],
			[AuctionStatus.PAUSED]: [AuctionStatus.ACTIVE, AuctionStatus.CANCELLED],
			[AuctionStatus.COMPLETED]: [],
			[AuctionStatus.CANCELLED]: [],
			[AuctionStatus.SUSPENDED]: [
				AuctionStatus.ACTIVE,
				AuctionStatus.CANCELLED,
			],
		};

		return transitions[currentStatus] || [];
	}

	private static validateCompletion(auction: IAuction): TransitionValidation {
		// Check if auction has minimum required bids
		const bids = auction.getBids();
		if (bids.length === 0) {
			return {
				isValid: false,
				error: "Cannot complete auction with no bids",
			};
		}

		// Check if reserve price is met (if set)
		const reservePrice = auction.getReservePrice();
		if (reservePrice) {
			const currentPrice = auction.getCurrentPrice();
			if (currentPrice.amount < reservePrice.amount) {
				return {
					isValid: false,
					error: "Reserve price not met",
				};
			}
		}

		return { isValid: true };
	}

	private static validateActivation(auction: IAuction): TransitionValidation {
		const now = createTimestamp(Date.now());

		if (now < auction.getStartTime()) {
			return {
				isValid: false,
				error: "Cannot activate auction before start time",
			};
		}

		if (auction.getBids().length > 0) {
			return {
				isValid: false,
				error: "Cannot activate auction that already has bids",
			};
		}

		return { isValid: true };
	}

	private static validatePause(auction: IAuction): TransitionValidation {
		if (!auction.canPause()) {
			return {
				isValid: false,
				error: "Auction cannot be paused in current state",
			};
		}

		return { isValid: true };
	}
}

/**
 * Configuration Interfaces
 */
export interface ExtensionConfig {
	autoExtend: boolean;
	triggerThresholdSeconds: number;
	extensionDurationSeconds: number;
	maxExtensions: number;
}

export interface AuctionTimingConfig {
	startTime: TAuctionStartTime;
	endTime: TAuctionEndTime;
	extensionConfig: ExtensionConfig;
	timeZone?: string;
}

export interface PriceConfig {
	startingPrice: Money;
	reservePrice?: Money;
	minIncrement: Money;
	maxIncrement?: Money;
	dynamicIncrementPercentage?: number;
}

/**
 * Utility Functions for Common Operations
 */
export class AuctionUtils {
	/**
	 * Generate unique auction identifier
	 */
	static generateAuctionId(): string {
		return `auction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Generate unique bid identifier
	 */
	static generateBidId(): string {
		return `bid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Calculate auction progress percentage
	 */
	static calculateProgress(auction: IAuction): number {
		const startTime = auction.getStartTime();
		const endTime = auction.getEndTime();
		const now = createTimestamp(Date.now());

		if (now <= startTime) return 0;
		if (now >= endTime) return 100;

		const totalDuration = Number(endTime) - Number(startTime);
		const elapsed = Number(now) - Number(startTime);

		return Math.round((elapsed / totalDuration) * 100);
	}

	/**
	 * Check if auction is in terminal state
	 */
	static isTerminalState(status: AuctionStatus): boolean {
		return [AuctionStatus.COMPLETED, AuctionStatus.CANCELLED].includes(status);
	}

	/**
	 * Check if auction allows bidding
	 */
	static allowsBidding(status: AuctionStatus): boolean {
		return status === AuctionStatus.ACTIVE;
	}

	/**
	 * Format auction type for display
	 */
	static formatAuctionType(type: AuctionType): string {
		const typeNames: Record<AuctionType, string> = {
			[AuctionType.ENGLISH]: "English Auction",
			[AuctionType.DUTCH]: "Dutch Auction",
			[AuctionType.SEALED_BID]: "Sealed-Bid Auction",
			[AuctionType.REVERSE]: "Reverse Auction",
			[AuctionType.VICKREY]: "Vickrey Auction",
			[AuctionType.BUY_IT_NOW]: "Buy It Now",
			[AuctionType.DOUBLE]: "Double Auction",
			[AuctionType.ALL_PAY]: "All-Pay Auction",
			[AuctionType.JAPANESE]: "Japanese Auction",
			[AuctionType.CHINESE]: "Chinese Auction",
			[AuctionType.PENNY]: "Penny Auction",
			[AuctionType.MULTI_UNIT]: "Multi-Unit Auction",
			[AuctionType.COMBINATORIAL]: "Combinatorial Auction",
		};

		return typeNames[type] || type;
	}

	/**
	 * Format auction status for display
	 */
	static formatAuctionStatus(status: AuctionStatus): string {
		const statusNames: Record<AuctionStatus, string> = {
			[AuctionStatus.DRAFT]: "Draft",
			[AuctionStatus.SCHEDULED]: "Scheduled",
			[AuctionStatus.ACTIVE]: "Live",
			[AuctionStatus.PAUSED]: "Paused",
			[AuctionStatus.COMPLETED]: "Completed",
			[AuctionStatus.CANCELLED]: "Cancelled",
			[AuctionStatus.SUSPENDED]: "Suspended",
		};

		return statusNames[status] || status;
	}

	/**
	 * Calculate bid ranking for auction
	 */
	static calculateBidRanking(
		bids: readonly TBidAmount[],
		auctionType: AuctionType,
	): Array<{ amount: TBidAmount; rank: number }> {
		if (bids.length === 0) return [];

		const sortedBids = [...bids].sort((a, b) => {
			switch (auctionType) {
				case AuctionType.ENGLISH:
				case AuctionType.JAPANESE:
				case AuctionType.VICKREY:
					return Number(b) - Number(a); // Descending
				case AuctionType.DUTCH:
				case AuctionType.REVERSE:
					return Number(a) - Number(b); // Ascending
				default:
					return Number(b) - Number(a);
			}
		});

		return sortedBids.map((amount, index) => ({
			amount,
			rank: index + 1,
		}));
	}

	/**
	 * Validate auction configuration
	 */
	static validateAuctionConfig(config: any): {
		isValid: boolean;
		errors: string[];
	} {
		const errors: string[] = [];

		if (!config.title || config.title.trim().length === 0) {
			errors.push("Auction title is required");
		}

		if (!config.startTime || !config.endTime) {
			errors.push("Start time and end time are required");
		}

		if (
			config.startTime &&
			config.endTime &&
			config.startTime >= config.endTime
		) {
			errors.push("End time must be after start time");
		}

		if (!config.startingPrice || config.startingPrice <= 0) {
			errors.push("Starting price must be greater than 0");
		}

		if (config.reservePrice && config.reservePrice <= config.startingPrice) {
			errors.push("Reserve price must be greater than starting price");
		}

		if (!config.minBidIncrement || config.minBidIncrement <= 0) {
			errors.push("Minimum bid increment must be greater than 0");
		}

		return {
			isValid: errors.length === 0,
			errors,
		};
	}
}
