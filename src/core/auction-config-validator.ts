import {
	AuctionType,
	IAuctionConfig,
	type ValidationResult,
} from "../types/core-interfaces";

/**
 * Validates auction configurations for different auction types.
 * Ensures that all required configuration parameters are present and valid.
 */
export class AuctionConfigValidator {
	/**
	 * Validates configuration for a specific auction type.
	 */
	validate(
		type: AuctionType,
		configurations: ReadonlyMap<string, any>,
	): ValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];

		// Validate common configuration parameters
		this.validateCommonConfig(configurations, errors, warnings);

		// Validate auction-type-specific configuration
		switch (type) {
			case AuctionType.ENGLISH:
				this.validateEnglishAuctionConfig(configurations, errors, warnings);
				break;
			case AuctionType.DUTCH:
				this.validateDutchAuctionConfig(configurations, errors, warnings);
				break;
			case AuctionType.SEALED_BID:
				this.validateSealedBidAuctionConfig(configurations, errors, warnings);
				break;
			case AuctionType.REVERSE:
				this.validateReverseAuctionConfig(configurations, errors, warnings);
				break;
			case AuctionType.VICKREY:
				this.validateVickreyAuctionConfig(configurations, errors, warnings);
				break;
			case AuctionType.BUY_IT_NOW:
				this.validateBuyItNowAuctionConfig(configurations, errors, warnings);
				break;
			case AuctionType.DOUBLE:
				this.validateDoubleAuctionConfig(configurations, errors, warnings);
				break;
			case AuctionType.ALL_PAY:
				this.validateAllPayAuctionConfig(configurations, errors, warnings);
				break;
			case AuctionType.JAPANESE:
				this.validateJapaneseAuctionConfig(configurations, errors, warnings);
				break;
			case AuctionType.CHINESE:
				this.validateChineseAuctionConfig(configurations, errors, warnings);
				break;
			case AuctionType.PENNY:
				this.validatePennyAuctionConfig(configurations, errors, warnings);
				break;
			case AuctionType.MULTI_UNIT:
				this.validateMultiUnitAuctionConfig(configurations, errors, warnings);
				break;
			case AuctionType.COMBINATORIAL:
				this.validateCombinatorialAuctionConfig(
					configurations,
					errors,
					warnings,
				);
				break;
			default:
				errors.push(`Unsupported auction type: ${type}`);
		}

		return {
			isValid: errors.length === 0,
			errors,
			warnings,
		};
	}

	/**
	 * Validates common configuration parameters that apply to all auction types.
	 */
	private validateCommonConfig(
		configurations: ReadonlyMap<string, any>,
		errors: string[],
		warnings: string[],
	): void {
		// Validate minimum bid increment
		const minBidIncrement = configurations.get("minBidIncrement");
		if (minBidIncrement === undefined || minBidIncrement === null) {
			errors.push("minBidIncrement is required");
		} else if (typeof minBidIncrement !== "number" || minBidIncrement <= 0) {
			errors.push("minBidIncrement must be a positive number");
		}

		// Validate reserve price if provided
		const reservePrice = configurations.get("reservePrice");
		if (reservePrice !== undefined && reservePrice !== null) {
			if (typeof reservePrice !== "number" || reservePrice < 0) {
				errors.push("reservePrice must be a non-negative number");
			}
		}

		// Validate auto extension settings
		const maxAutoExtensions = configurations.get("maxAutoExtensions");
		if (maxAutoExtensions !== undefined && maxAutoExtensions !== null) {
			if (typeof maxAutoExtensions !== "number" || maxAutoExtensions < 0) {
				errors.push("maxAutoExtensions must be a non-negative integer");
			}
		}

		const extensionTriggerSeconds = configurations.get(
			"extensionTriggerSeconds",
		);
		if (
			extensionTriggerSeconds !== undefined &&
			extensionTriggerSeconds !== null
		) {
			if (
				typeof extensionTriggerSeconds !== "number" ||
				extensionTriggerSeconds <= 0
			) {
				errors.push("extensionTriggerSeconds must be a positive number");
			}
		}

		const extensionDurationSeconds = configurations.get(
			"extensionDurationSeconds",
		);
		if (
			extensionDurationSeconds !== undefined &&
			extensionDurationSeconds !== null
		) {
			if (
				typeof extensionDurationSeconds !== "number" ||
				extensionDurationSeconds <= 0
			) {
				errors.push("extensionDurationSeconds must be a positive number");
			}
		}

		// Validate bid retraction setting
		const allowBidRetraction = configurations.get("allowBidRetraction");
		if (allowBidRetraction !== undefined && allowBidRetraction !== null) {
			if (typeof allowBidRetraction !== "boolean") {
				errors.push("allowBidRetraction must be a boolean");
			}
		}

		// Validate minimum bid interval
		const minBidIntervalMs = configurations.get("minBidIntervalMs");
		if (minBidIntervalMs !== undefined && minBidIntervalMs !== null) {
			if (typeof minBidIntervalMs !== "number" || minBidIntervalMs < 0) {
				errors.push("minBidIntervalMs must be a non-negative number");
			}
		}
	}

	/**
	 * Validates English auction specific configuration.
	 */
	private validateEnglishAuctionConfig(
		configurations: ReadonlyMap<string, any>,
		errors: string[],
		warnings: string[],
	): void {
		// English auctions benefit from anti-sniping protection
		const antiSnipingEnabled = configurations.get("antiSnipingEnabled");
		if (antiSnipingEnabled === undefined) {
			warnings.push("antiSnipingEnabled not specified, defaulting to true");
		}

		// Proxy bidding is commonly used in English auctions
		const proxyBiddingEnabled = configurations.get("proxyBiddingEnabled");
		if (proxyBiddingEnabled === undefined) {
			warnings.push("proxyBiddingEnabled not specified, defaulting to true");
		}
	}

	/**
	 * Validates Dutch auction specific configuration.
	 */
	private validateDutchAuctionConfig(
		configurations: ReadonlyMap<string, any>,
		errors: string[],
		warnings: string[],
	): void {
		// Dutch auctions require price decrement configuration
		const priceDecrementAmount = configurations.get("priceDecrementAmount");
		if (priceDecrementAmount === undefined || priceDecrementAmount === null) {
			errors.push("priceDecrementAmount is required for Dutch auctions");
		} else if (
			typeof priceDecrementAmount !== "number" ||
			priceDecrementAmount <= 0
		) {
			errors.push("priceDecrementAmount must be a positive number");
		}

		// Decrement interval is important for Dutch auctions
		const decrementIntervalSeconds = configurations.get(
			"decrementIntervalSeconds",
		);
		if (
			decrementIntervalSeconds === undefined ||
			decrementIntervalSeconds === null
		) {
			warnings.push(
				"decrementIntervalSeconds not specified, defaulting to 30 seconds",
			);
		} else if (
			typeof decrementIntervalSeconds !== "number" ||
			decrementIntervalSeconds <= 0
		) {
			errors.push("decrementIntervalSeconds must be a positive number");
		}

		// Minimum price is optional but recommended
		const minimumPrice = configurations.get("minimumPrice");
		if (minimumPrice !== undefined && minimumPrice !== null) {
			if (typeof minimumPrice !== "number" || minimumPrice < 0) {
				errors.push("minimumPrice must be a non-negative number");
			}
		}
	}

	/**
	 * Validates sealed-bid auction specific configuration.
	 */
	private validateSealedBidAuctionConfig(
		configurations: ReadonlyMap<string, any>,
		errors: string[],
		warnings: string[],
	): void {
		// Sealed-bid auctions typically allow only one bid per bidder
		const maxBidsPerBidder = configurations.get("maxBidsPerBidder");
		if (maxBidsPerBidder === undefined) {
			warnings.push("maxBidsPerBidder not specified, defaulting to 1");
		} else if (typeof maxBidsPerBidder !== "number" || maxBidsPerBidder <= 0) {
			errors.push("maxBidsPerBidder must be a positive integer");
		}

		// Bid reveal time is important for sealed-bid auctions
		const bidRevealTime = configurations.get("bidRevealTime");
		if (bidRevealTime === undefined || bidRevealTime === null) {
			warnings.push("bidRevealTime not specified");
		}

		// Late bids are typically not allowed in sealed-bid auctions
		const allowLateBids = configurations.get("allowLateBids");
		if (allowLateBids === undefined) {
			warnings.push("allowLateBids not specified, defaulting to false");
		}
	}

	/**
	 * Validates penny auction specific configuration.
	 */
	private validatePennyAuctionConfig(
		configurations: ReadonlyMap<string, any>,
		errors: string[],
		warnings: string[],
	): void {
		// Penny auctions require bid fee configuration
		const bidFeeAmount = configurations.get("bidFeeAmount");
		if (bidFeeAmount === undefined || bidFeeAmount === null) {
			errors.push("bidFeeAmount is required for penny auctions");
		} else if (typeof bidFeeAmount !== "number" || bidFeeAmount <= 0) {
			errors.push("bidFeeAmount must be a positive number");
		}

		// Time extension per bid is crucial for penny auctions
		const timeExtensionSeconds = configurations.get("timeExtensionSeconds");
		if (timeExtensionSeconds === undefined || timeExtensionSeconds === null) {
			warnings.push(
				"timeExtensionSeconds not specified, defaulting to 10 seconds",
			);
		} else if (
			typeof timeExtensionSeconds !== "number" ||
			timeExtensionSeconds <= 0
		) {
			errors.push("timeExtensionSeconds must be a positive number");
		}

		// Maximum extensions prevent infinite auctions
		const maxExtensions = configurations.get("maxExtensions");
		if (maxExtensions === undefined || maxExtensions === null) {
			warnings.push("maxExtensions not specified, defaulting to 100");
		} else if (typeof maxExtensions !== "number" || maxExtensions <= 0) {
			errors.push("maxExtensions must be a positive integer");
		}
	}

	/**
	 * Validates combinatorial auction specific configuration.
	 */
	private validateCombinatorialAuctionConfig(
		configurations: ReadonlyMap<string, any>,
		errors: string[],
		warnings: string[],
	): void {
		// Combinatorial auctions typically allow package bidding
		const allowPackageBidding = configurations.get("allowPackageBidding");
		if (allowPackageBidding === undefined) {
			warnings.push("allowPackageBidding not specified, defaulting to true");
		}

		// Package size limits are important for performance
		const maxPackageSize = configurations.get("maxPackageSize");
		if (maxPackageSize === undefined) {
			warnings.push("maxPackageSize not specified, defaulting to 10");
		} else if (typeof maxPackageSize !== "number" || maxPackageSize <= 0) {
			errors.push("maxPackageSize must be a positive integer");
		}

		// Package valuation method affects winner determination
		const packageValuationMethod = configurations.get("packageValuationMethod");
		if (packageValuationMethod === undefined) {
			warnings.push(
				"packageValuationMethod not specified, defaulting to 'additive'",
			);
		} else {
			const validMethods = ["additive", "multiplicative", "custom"];
			if (!validMethods.includes(packageValuationMethod)) {
				errors.push(
					`packageValuationMethod must be one of: ${validMethods.join(", ")}`,
				);
			}
		}
	}

	// Placeholder methods for other auction types
	// These would contain specific validation logic for each auction type

	private validateReverseAuctionConfig(
		configurations: ReadonlyMap<string, any>,
		errors: string[],
		warnings: string[],
	): void {
		// Reverse auction specific validation would go here
	}

	private validateVickreyAuctionConfig(
		configurations: ReadonlyMap<string, any>,
		errors: string[],
		warnings: string[],
	): void {
		// Vickrey auction specific validation would go here
	}

	private validateBuyItNowAuctionConfig(
		configurations: ReadonlyMap<string, any>,
		errors: string[],
		warnings: string[],
	): void {
		// Buy-it-now auction specific validation would go here
	}

	private validateDoubleAuctionConfig(
		configurations: ReadonlyMap<string, any>,
		errors: string[],
		warnings: string[],
	): void {
		// Double auction specific validation would go here
	}

	private validateAllPayAuctionConfig(
		configurations: ReadonlyMap<string, any>,
		errors: string[],
		warnings: string[],
	): void {
		// All-pay auction specific validation would go here
	}

	private validateJapaneseAuctionConfig(
		configurations: ReadonlyMap<string, any>,
		errors: string[],
		warnings: string[],
	): void {
		// Japanese auction specific validation would go here
	}

	private validateChineseAuctionConfig(
		configurations: ReadonlyMap<string, any>,
		errors: string[],
		warnings: string[],
	): void {
		// Chinese auction specific validation would go here
	}

	private validateMultiUnitAuctionConfig(
		configurations: ReadonlyMap<string, any>,
		errors: string[],
		warnings: string[],
	): void {
		// Multi-unit auction specific validation would go here
	}
}
