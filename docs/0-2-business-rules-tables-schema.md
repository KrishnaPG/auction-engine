# Business Rules Tables Schema Design

## Overview
This document defines the database schema for comprehensive business rules management, supporting complex validation logic, auction-type specific rules, and real-time rule evaluation across all 13 auction types.

## 1. rules

**Purpose**: Core business rules catalog with flexible condition definitions and validation logic for all auction types.

**Key Columns**:
- `rule_id` (UUID, PRIMARY KEY) - Unique rule identifier
- `rule_code` (VARCHAR(100), UNIQUE, NOT NULL) - Machine-readable rule identifier
- `rule_name` (VARCHAR(255), NOT NULL) - Human-readable rule name
- `description` (TEXT, NOT NULL) - Detailed rule description
- `rule_category` (ENUM, NOT NULL) - Category: bidding, timing, eligibility, payment, compliance, security
- `auction_types` (JSON, NOT NULL) - Array of applicable auction types
- `severity` (ENUM, NOT NULL) - Severity: info, warning, error, critical
- `is_active` (BOOLEAN, DEFAULT TRUE) - Whether rule is currently active
- `is_system_rule` (BOOLEAN, DEFAULT FALSE) - Whether this is a system-defined rule
- `is_customizable` (BOOLEAN, DEFAULT TRUE) - Whether users can customize this rule
- `condition_logic` (JSON, NOT NULL) - Rule condition definition (JSON logic structure)
- `validation_expression` (TEXT, NOT NULL) - Validation expression/script
- `error_message` (TEXT, NOT NULL) - Message displayed when rule fails
- `remediation_actions` (JSON, NULLABLE) - Actions to take when rule fails
- `dependencies` (JSON, NULLABLE) - Other rules this rule depends on
- `performance_impact` (ENUM, DEFAULT 'low') - Performance impact: low, medium, high
- `cache_duration` (INTEGER, DEFAULT 300) - Cache duration in seconds
- `created_by` (UUID, NULLABLE) - User who created the rule
- `approved_by` (UUID, NULLABLE) - User who approved the rule
- `version` (INTEGER, DEFAULT 1) - Rule version number
- `created_at` (TIMESTAMP, NOT NULL) - Rule creation timestamp
- `updated_at` (TIMESTAMP, NOT NULL) - Last update timestamp
- `effective_from` (TIMESTAMP, NULLABLE) - When rule becomes effective
- `effective_until` (TIMESTAMP, NULLABLE) - When rule expires

**Primary Key**: `rule_id`

**Foreign Keys**:
- `created_by` → `users.user_id` (nullable)
- `approved_by` → `users.user_id` (nullable)

**Indexes**:
- `idx_rules_code` (rule_code) - For rule code lookups
- `idx_rules_category` (rule_category) - For category-based queries
- `idx_rules_auction_types` (auction_types) - For auction type filtering (GIN index)
- `idx_rules_active` (is_active) - For active rule filtering
- `idx_rules_severity` (severity) - For severity-based queries
- `idx_rules_performance` (performance_impact) - For performance analysis
- `idx_rules_effective` (effective_from, effective_until) - For time-based rule filtering

**Special Considerations**:
- **Flexible Logic**: JSON condition structures support complex nested rules
- **Performance Optimization**: Caching support for frequently evaluated rules
- **Version Control**: Complete version history for audit and rollback
- **Multi-type Support**: Single rule can apply to multiple auction types
- **Dependency Management**: Rule dependencies prevent conflicts and ensure order

## 2. rule_configurations

**Purpose**: Auction-specific rule configurations that customize rule behavior for individual auctions or auction types.

**Key Columns**:
- `config_id` (UUID, PRIMARY KEY) - Unique configuration identifier
- `rule_id` (UUID, NOT NULL) - Associated rule
- `auction_id` (UUID, NULLABLE) - Associated auction (NULL for global configs)
- `auction_type` (VARCHAR(50), NULLABLE) - Associated auction type (NULL for auction-specific)
- `scope` (ENUM, NOT NULL) - Scope: global, auction_type, auction, user_group
- `scope_value` (VARCHAR(255), NULLABLE) - Value identifying the scope (e.g., user_group_id)
- `config_values` (JSON, NOT NULL) - Rule configuration parameters
- `is_override` (BOOLEAN, DEFAULT FALSE) - Whether this overrides default rule behavior
- `priority` (INTEGER, DEFAULT 0) - Configuration priority (higher = takes precedence)
- `is_active` (BOOLEAN, DEFAULT TRUE) - Whether this configuration is active
- `condition_expression` (TEXT, NULLABLE) - Condition for when this config applies
- `created_by` (UUID, NOT NULL) - User who created the configuration
- `approved_by` (UUID, NULLABLE) - User who approved the configuration
- `effective_from` (TIMESTAMP, NULLABLE) - When configuration becomes effective
- `effective_until` (TIMESTAMP, NULLABLE) - When configuration expires
- `created_at` (TIMESTAMP, NOT NULL) - Configuration creation timestamp
- `updated_at` (TIMESTAMP, NOT NULL) - Last update timestamp

**Primary Key**: `config_id`

**Foreign Keys**:
- `rule_id` → `rules.rule_id`
- `auction_id` → `auctions.auction_id` (nullable)
- `created_by` → `users.user_id`
- `approved_by` → `users.user_id` (nullable)

**Indexes**:
- `idx_rule_configs_rule` (rule_id) - For rule configuration queries
- `idx_rule_configs_auction` (auction_id) - For auction-specific configurations
- `idx_rule_configs_type` (auction_type) - For auction type configurations
- `idx_rule_configs_scope` (scope) - For scope-based queries
- `idx_rule_configs_active` (is_active) - For active configuration filtering
- `idx_rule_configs_priority` (priority) - For priority-based resolution

**Special Considerations**:
- **Hierarchical Configuration**: Support for global → type → auction → user_group hierarchy
- **Priority Resolution**: Higher priority configurations override lower ones
- **Conditional Application**: Rules can have conditions for when they apply
- **Approval Workflow**: Configuration changes may require approval
- **Time-bounded**: Configurations can have effective date ranges

## 3. rule_violations

**Purpose**: Tracking and managing rule violations with complete context for audit, compliance, and remediation.

**Key Columns**:
- `violation_id` (UUID, PRIMARY KEY) - Unique violation identifier
- `rule_id` (UUID, NOT NULL) - Rule that was violated
- `config_id` (UUID, NULLABLE) - Specific configuration that was violated
- `auction_id` (UUID, NOT NULL) - Associated auction
- `user_id` (UUID, NOT NULL) - User who triggered the violation
- `bid_id` (UUID, NULLABLE) - Associated bid (if applicable)
- `item_id` (UUID, NULLABLE) - Associated item (if applicable)
- `violation_type` (ENUM, NOT NULL) - Type: hard_violation, soft_violation, warning
- `severity` (ENUM, NOT NULL) - Severity: low, medium, high, critical
- `violation_message` (TEXT, NOT NULL) - Human-readable violation description
- `violation_data` (JSON, NOT NULL) - Complete context data that triggered violation
- `expected_values` (JSON, NULLABLE) - What values were expected
- `actual_values` (JSON, NOT NULL) - What values were provided
- `validation_details` (JSON, NULLABLE) - Detailed validation failure information
- `remediation_actions` (JSON, NULLABLE) - Actions taken or recommended
- `user_notification_sent` (BOOLEAN, DEFAULT FALSE) - Whether user was notified
- `admin_alert_sent` (BOOLEAN, DEFAULT FALSE) - Whether admin was alerted
- `status` (ENUM, NOT NULL) - Status: detected, acknowledged, resolved, dismissed, escalated
- `resolution` (TEXT, NULLABLE) - How the violation was resolved
- `resolved_by` (UUID, NULLABLE) - User who resolved the violation
- `resolved_at` (TIMESTAMP, NULLABLE) - When violation was resolved
- `escalation_level` (INTEGER, DEFAULT 0) - Current escalation level
- `next_escalation_at` (TIMESTAMP, NULLABLE) - When next escalation occurs
- `occurred_at` (TIMESTAMP, NOT NULL) - When the violation occurred
- `created_at` (TIMESTAMP, NOT NULL) - Violation record creation timestamp
- `updated_at` (TIMESTAMP, NOT NULL) - Last update timestamp

**Primary Key**: `violation_id`

**Foreign Keys**:
- `rule_id` → `rules.rule_id`
- `config_id` → `rule_configurations.config_id` (nullable)
- `auction_id` → `auctions.auction_id`
- `user_id` → `users.user_id`
- `bid_id` → `bids.bid_id` (nullable)
- `item_id` → `auction_items.item_id` (nullable)
- `resolved_by` → `users.user_id` (nullable)

**Indexes**:
- `idx_rule_violations_rule` (rule_id) - For rule violation queries
- `idx_rule_violations_auction` (auction_id) - For auction violation analysis
- `idx_rule_violations_user` (user_id) - For user violation history
- `idx_rule_violations_type` (violation_type) - For violation type filtering
- `idx_rule_violations_severity` (severity) - For severity-based queries
- `idx_rule_violations_status` (status) - For status-based filtering
- `idx_rule_violations_time` (occurred_at) - For time-based analysis
- `idx_rule_violations_escalation` (escalation_level, next_escalation_at) - For escalation management

**Special Considerations**:
- **Complete Context**: Full violation context for proper investigation
- **Escalation Management**: Automated escalation for unresolved violations
- **Resolution Tracking**: Complete lifecycle management of violations
- **User Communication**: Notification and alert management
- **Compliance Reporting**: Data for regulatory and audit reporting

## Rule Definition Examples by Auction Type

### English Auction - Minimum Bid Increment
```json
{
  "rule_code": "MIN_BID_INCREMENT",
  "condition_logic": {
    "type": "comparison",
    "field": "bid_amount",
    "operator": "greater_than_or_equal",
    "value": "current_price + min_increment"
  },
  "validation_expression": "bid_amount >= current_price + min_increment",
  "error_message": "Bid must be at least {min_increment} higher than current price",
  "auction_types": ["english", "vickrey"]
}
```

### Penny Auction - Bid Fee Validation
```json
{
  "rule_code": "PENNY_BID_FEE",
  "condition_logic": {
    "type": "fee_calculation",
    "fee_amount": 0.50,
    "currency": "USD"
  },
  "validation_expression": "user_balance >= bid_fee_amount",
  "error_message": "Insufficient balance to place bid (fee: ${bid_fee_amount})",
  "auction_types": ["penny"]
}
```

### Multi-Unit Auction - Quantity Limits
```json
{
  "rule_code": "QUANTITY_LIMITS",
  "condition_logic": {
    "type": "range_check",
    "field": "quantity",
    "min": "min_quantity",
    "max": "max_quantity"
  },
  "validation_expression": "quantity >= min_quantity AND quantity <= max_quantity",
  "error_message": "Bid quantity must be between {min_quantity} and {max_quantity}",
  "auction_types": ["multi_unit"]
}
```

### Combinatorial Auction - Package Validation
```json
{
  "rule_code": "PACKAGE_COMPLETENESS",
  "condition_logic": {
    "type": "package_validation",
    "require_all_items": true,
    "allow_substitutes": false
  },
  "validation_expression": "package_contains_all_required_items()",
  "error_message": "Package bid must include all required items",
  "auction_types": ["combinatorial"]
}
```

## Configuration Examples

### Global Configuration
```json
{
  "scope": "global",
  "config_values": {
    "max_bid_retraction_time": 300,
    "require_bid_confirmation": false,
    "auto_extend_auction": true
  }
}
```

### Auction-Type Specific Configuration
```json
{
  "scope": "auction_type",
  "auction_type": "penny",
  "config_values": {
    "bid_fee_amount": 0.75,
    "time_extension_seconds": 15,
    "max_extensions": 100
  }
}
```

## Design Principles

1. **Flexibility**: JSON-based rule definitions support complex logic without code changes
2. **Performance**: Optimized for real-time rule evaluation during bidding
3. **Auditability**: Complete tracking of rule violations and resolutions
4. **Configurability**: Easy customization of rules for different auctions
5. **Scalability**: Efficient rule storage and retrieval for high-volume scenarios
6. **Compliance**: Built-in violation tracking and reporting capabilities

## Relationships

```
rules (1) ──── (M) rule_configurations
   │                    │
   │                    └─── (M) rule_violations
   │
   └─── (M) rule_violations

auctions (1) ──── (M) rule_configurations
users (1) ──── (M) rule_violations
bids (1) ──── (M) rule_violations
```

This business rules schema provides comprehensive support for complex validation logic across all 13 auction types while maintaining high performance, complete audit trails, and flexible configuration capabilities.