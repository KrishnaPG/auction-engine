import { and, desc, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import type {
	TAuctionId,
	TBidId,
	TRuleCategory,
	TRuleCode,
	TRuleId,
	TRuleSeverity,
	TUserId,
	TValidationStatus,
} from "../../types/branded-types";
import { db } from "../drizzle-adapter";
import {
	auctionConfigurations,
	auctions,
	ruleConfigurations,
	rules,
	ruleViolations,
} from "../schema";

export interface CreateRuleRequest {
	ruleCode: TRuleCode;
	ruleName: string;
	description: string;
	ruleCategory: TRuleCategory;
	auctionTypes: string[]; // Array of auction type strings
	severity: TRuleSeverity;
	conditionLogic: any; // JSON logic structure
	validationExpression: string;
	errorMessage: string;
	remediationActions?: any; // JSON actions
	dependencies?: string[]; // Array of rule codes
	performanceImpact?: "low" | "medium" | "high";
	cacheDuration?: number;
	createdBy?: TUserId;
	effectiveFrom?: Date;
	effectiveUntil?: Date;
}

export interface RuleConfigurationRequest {
	ruleId: TRuleId;
	auctionId?: TAuctionId;
	auctionType?: string;
	scope: "global" | "auction_type" | "auction" | "user_group";
	scopeValue?: string;
	configValues: any; // JSON configuration values
	isOverride?: boolean;
	priority?: number;
	conditionExpression?: string;
	createdBy: TUserId;
	effectiveFrom?: Date;
	effectiveUntil?: Date;
}

export interface RuleViolationRequest {
	ruleId: TRuleId;
	configId?: string;
	auctionId: TAuctionId;
	userId: TUserId;
	bidId?: TBidId;
	itemId?: string;
	violationType: "hard_violation" | "soft_violation" | "warning";
	severity: "low" | "medium" | "high" | "critical";
	violationMessage: string;
	violationData: any; // JSON context data
	expectedValues?: any; // JSON expected values
	actualValues: any; // JSON actual values
	validationDetails?: any; // JSON validation details
	remediationActions?: any; // JSON remediation actions
}

// Query class for business rules operations
export class BusinessRulesQueries {
	// INSERT into rules table with JSON validation_rules
	async createRule(request: CreateRuleRequest): Promise<TRuleId|undefined> {
		const [result] = await db
			.insert(rules)
			.values({
				ruleCode: request.ruleCode,
				ruleName: request.ruleName,
				description: request.description,
				ruleCategory: request.ruleCategory,
				auctionTypes: request.auctionTypes,
				severity: request.severity,
				conditionLogic: request.conditionLogic,
				validationExpression: request.validationExpression,
				errorMessage: request.errorMessage,
				remediationActions: request.remediationActions,
				dependencies: request.dependencies || [],
				performanceImpact: request.performanceImpact || "low",
				cacheDuration: request.cacheDuration || 300,
				createdBy: request.createdBy,
				effectiveFrom: request.effectiveFrom,
				effectiveUntil: request.effectiveUntil,
			})
			.returning({ ruleId: rules.ruleId });
		return result?.ruleId as TRuleId;
	}

	// SELECT config_value FROM auction_configurations WHERE auction_id=? AND config_key='rules'
	async getAuctionRules(auctionId: TAuctionId): Promise<any> {
		const result = await db
			.select({
				configValue: auctionConfigurations.typeSpecificParams,
			})
			.from(auctionConfigurations)
			.where(eq(auctionConfigurations.auctionId, auctionId));

		return result[0]?.configValue || null;
	}

	// Get all active rules for an auction type
	async getActiveRulesByAuctionType(auctionType: string): Promise<any[]> {
		return await db
			.select()
			.from(rules)
			.where(
				and(
					eq(rules.isActive, true),
					sql`${rules.auctionTypes} @> ${sql`jsonb_build_array(${auctionType})`}`,
					or(isNull(rules.effectiveFrom), lte(rules.effectiveFrom, sql`NOW()`)),
					or(
						isNull(rules.effectiveUntil),
						gte(rules.effectiveUntil, sql`NOW()`),
					),
				),
			);
	}

	// Get rule by ID
	async getRuleById(ruleId: TRuleId): Promise<any> {
		const result = await db
			.select()
			.from(rules)
			.where(eq(rules.ruleId, ruleId))
			.limit(1);

		return result[0] || null;
	}

	// Get rule by code
	async getRuleByCode(ruleCode: TRuleCode): Promise<any> {
		const result = await db
			.select()
			.from(rules)
			.where(eq(rules.ruleCode, ruleCode))
			.limit(1);

		return result[0] || null;
	}

	// Create rule configuration
	async createRuleConfiguration(
		request: RuleConfigurationRequest,
	): Promise<string | undefined> {
		const [newConfig] = await db
			.insert(ruleConfigurations)
			.values({
				ruleId: request.ruleId,
				auctionId: request.auctionId,
				auctionType: request.auctionType,
				scope: request.scope,
				scopeValue: request.scopeValue,
				configValues: request.configValues,
				isOverride: request.isOverride || false,
				priority: request.priority || 0,
				conditionExpression: request.conditionExpression,
				createdBy: request.createdBy,
				effectiveFrom: request.effectiveFrom,
				effectiveUntil: request.effectiveUntil,
			})
			.returning({ configId: ruleConfigurations.configId });

		return newConfig?.configId;
	}

	// Get rule configurations for an auction
	async getRuleConfigurationsByAuction(auctionId: TAuctionId): Promise<any[]> {
		return await db
			.select()
			.from(ruleConfigurations)
			.where(eq(ruleConfigurations.auctionId, auctionId));
	}

	// Get rule configurations by type and scope
	async getRuleConfigurationsByTypeAndScope(
		auctionType: string,
		scope: string,
		scopeValue?: string,
	): Promise<any[]> {
		const conditions = [
			eq(ruleConfigurations.auctionType, auctionType),
			eq(ruleConfigurations.scope, scope)
		];

		if (scopeValue) {
			conditions.push(eq(ruleConfigurations.scopeValue, scopeValue));
		}

		return await db
			.select()
			.from(ruleConfigurations)
			.where(and(...conditions));
	}

	// Record rule violation
	async recordRuleViolation(request: RuleViolationRequest): Promise<string|undefined> {
		const [newViolation] = await db
			.insert(ruleViolations)
			.values({
				ruleId: request.ruleId,
				configId: request.configId,
				auctionId: request.auctionId,
				userId: request.userId,
				bidId: request.bidId,
				itemId: request.itemId,
				violationType: request.violationType,
				severity: request.severity,
				violationMessage: request.violationMessage,
				violationData: request.violationData,
				expectedValues: request.expectedValues,
				actualValues: request.actualValues,
				validationDetails: request.validationDetails,
				remediationActions: request.remediationActions,
				status: "detected",
				occurredAt: new Date(),
			})
			.returning({ violationId: ruleViolations.violationId });

		return newViolation?.violationId;
	}

	// Get rule violations for an auction
	async getRuleViolationsByAuction(auctionId: TAuctionId): Promise<any[]> {
		return await db
			.select()
			.from(ruleViolations)
			.where(eq(ruleViolations.auctionId, auctionId))
			.orderBy(desc(ruleViolations.occurredAt));
	}

	// Get rule violations by user
	async getRuleViolationsByUser(userId: TUserId): Promise<any[]> {
		return await db
			.select()
			.from(ruleViolations)
			.where(eq(ruleViolations.userId, userId))
			.orderBy(desc(ruleViolations.occurredAt));
	}

	// Update rule violation status
	async updateRuleViolationStatus(
		violationId: string,
		status: TValidationStatus,
		resolution?: string,
		resolvedBy?: TUserId,
	): Promise<void> {
		await db
			.update(ruleViolations)
			.set({
				status: status,
				resolution: resolution,
				resolvedBy: resolvedBy,
				resolvedAt: new Date(),
			})
			.where(eq(ruleViolations.violationId, violationId));
	}

	// Get rules by category
	async getRulesByCategory(category: TRuleCategory): Promise<any[]> {
		return await db
			.select()
			.from(rules)
			.where(and(eq(rules.ruleCategory, category), eq(rules.isActive, true)));
	}

	// Get rules by severity
	async getRulesBySeverity(severity: TRuleSeverity): Promise<any[]> {
		return await db
			.select()
			.from(rules)
			.where(and(eq(rules.severity, severity), eq(rules.isActive, true)));
	}

	// Validate rule configuration hierarchy
	async validateRuleConfigurationHierarchy(
		ruleId: TRuleId,
		auctionId: TAuctionId,
		scope: string,
	): Promise<boolean> {
		const existingConfigs = await db
			.select()
			.from(ruleConfigurations)
			.where(
				and(
					eq(ruleConfigurations.ruleId, ruleId),
					eq(ruleConfigurations.auctionId, auctionId),
					eq(ruleConfigurations.isActive, true),
				),
			);

		// Check priority hierarchy: auction > auction_type > global
		const scopePriority = { global: 0, auction_type: 1, auction: 2 };
		const currentPriority =
			scopePriority[scope as keyof typeof scopePriority] || 0;

		return existingConfigs.every((config: any) => {
			const configScopePriority =
				scopePriority[config.scope as keyof typeof scopePriority] || 0;
			return configScopePriority <= currentPriority;
		});
	}

	// Get effective rule configuration for an auction
	async getEffectiveRuleConfiguration(
		ruleId: TRuleId,
		auctionId: TAuctionId,
	): Promise<any> {
		// Get auction type first
		const auction = await db
			.select({ type: auctions.type })
			.from(auctions)
			.where(eq(auctions.id, auctionId))
			.limit(1);

		if (!auction[0]) return null;

		const auctionType = auction[0].type;

		// Find the most specific configuration using priority hierarchy
		const configs = await db
			.select()
			.from(ruleConfigurations)
			.where(
				and(
					eq(ruleConfigurations.ruleId, ruleId),
					eq(ruleConfigurations.isActive, true),
					or(
						isNull(ruleConfigurations.effectiveFrom),
						lte(ruleConfigurations.effectiveFrom, sql`NOW()`),
					),
					or(
						isNull(ruleConfigurations.effectiveUntil),
						gte(ruleConfigurations.effectiveUntil, sql`NOW()`),
					),
				),
			)
			.orderBy(desc(ruleConfigurations.priority));

		// Priority order: auction-specific > auction-type-specific > global
		let effectiveConfig = null;

		for (const config of configs) {
			if (config.auctionId === auctionId) {
				// Auction-specific configuration
				effectiveConfig = config;
				break;
			} else if (config.auctionType === auctionType && !effectiveConfig) {
				// Auction-type-specific configuration
				effectiveConfig = config;
			} else if (config.scope === "global" && !effectiveConfig) {
				// Global configuration
				effectiveConfig = config;
			}
		}

		return effectiveConfig;
	}
}

// Export singleton instance
export const businessRulesQueries = new BusinessRulesQueries();
