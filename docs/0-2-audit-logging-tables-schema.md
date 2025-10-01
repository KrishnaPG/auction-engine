# Audit and Logging Tables Schema Design

## Overview
This document defines the database schema for comprehensive audit trails and immutable logging, supporting regulatory compliance, security monitoring, and system debugging across all 13 auction types.

## 1. audit_trail

**Purpose**: Comprehensive audit trail capturing all user and system activities with full context and immutability.

**Key Columns**:
- `audit_id` (UUID, PRIMARY KEY) - Unique audit record identifier
- `table_name` (VARCHAR(100), NOT NULL) - Target table being audited
- `record_id` (UUID, NOT NULL) - ID of the record being modified
- `operation` (ENUM, NOT NULL) - Operation: INSERT, UPDATE, DELETE, SELECT
- `user_id` (UUID, NULLABLE) - User who performed the action
- `session_id` (VARCHAR(255), NULLABLE) - User session identifier
- `ip_address` (INET, NULLABLE) - Client IP address
- `user_agent` (TEXT, NULLABLE) - Client application information
- `auction_id` (UUID, NULLABLE) - Associated auction (if applicable)
- `old_values` (JSON, NULLABLE) - Previous record values (for UPDATE/DELETE)
- `new_values` (JSON, NOT NULL) - New record values (for INSERT/UPDATE)
- `changed_fields` (JSON, NULLABLE) - List of fields that were changed
- `change_reason` (TEXT, NULLABLE) - Reason for change (if provided)
- `business_context` (JSON, NULLABLE) - Auction/business context data
- `risk_score` (DECIMAL(3,2), NULLABLE) - Risk assessment of the operation
- `severity` (ENUM, NOT NULL) - Severity: low, medium, high, critical
- `category` (ENUM, NOT NULL) - Category: authentication, bidding, auction, payment, admin, system
- `tags` (JSON, NULLABLE) - Additional classification tags
- `occurred_at` (TIMESTAMP, NOT NULL) - When the audited event occurred
- `created_at` (TIMESTAMP, NOT NULL) - Audit record creation timestamp
- `hash_chain` (VARCHAR(64), NULLABLE) - Cryptographic hash linking to previous record
- `digital_signature` (TEXT, NULLABLE) - Cryptographic signature for integrity verification

**Primary Key**: `audit_id`

**Foreign Keys**:
- `user_id` → `users.user_id` (nullable for system operations)
- `auction_id` → `auctions.auction_id` (nullable)

**Indexes**:
- `idx_audit_trail_table` (table_name) - For table-specific audit queries
- `idx_audit_trail_record` (record_id) - For record-specific audit history
- `idx_audit_trail_user` (user_id) - For user activity auditing
- `idx_audit_trail_auction` (auction_id) - For auction-specific auditing
- `idx_audit_trail_time` (occurred_at) - For time-based audit analysis
- `idx_audit_trail_operation` (operation) - For operation type filtering
- `idx_audit_trail_severity` (severity) - For severity-based filtering
- `idx_audit_trail_category` (category) - For category-based queries
- `idx_audit_trail_composite` (table_name, record_id, occurred_at) - For comprehensive audit trails
- `idx_audit_trail_risk` (risk_score) - For risk-based analysis

**Special Considerations**:
- **Immutability**: Append-only table with cryptographic chaining
- **Performance**: Partitioned by date for efficient historical queries
- **Compliance**: Supports GDPR, SOX, PCI-DSS, and other regulatory requirements
- **Context Preservation**: Full business context for audit understanding
- **Integrity Verification**: Cryptographic signatures for tamper detection

## 2. system_events

**Purpose**: System-level event logging for monitoring, debugging, and operational intelligence.

**Key Columns**:
- `event_id` (UUID, PRIMARY KEY) - Unique event identifier
- `event_type` (VARCHAR(100), NOT NULL) - Type of system event
- `event_category` (ENUM, NOT NULL) - Category: performance, error, security, business, integration
- `severity` (ENUM, NOT NULL) - Severity: trace, debug, info, warn, error, fatal
- `source` (VARCHAR(255), NOT NULL) - Component/system that generated the event
- `message` (TEXT, NOT NULL) - Human-readable event description
- `details` (JSON, NULLABLE) - Structured event data and context
- `error_code` (VARCHAR(50), NULLABLE) - Standardized error code (if applicable)
- `stack_trace` (TEXT, NULLABLE) - Stack trace for exceptions/errors
- `request_id` (VARCHAR(255), NULLABLE) - Associated request identifier
- `session_id` (VARCHAR(255), NULLABLE) - Associated user session
- `user_id` (UUID, NULLABLE) - Associated user (if applicable)
- `auction_id` (UUID, NULLABLE) - Associated auction (if applicable)
- `item_id` (UUID, NULLABLE) - Associated item (if applicable)
- `bid_id` (UUID, NULLABLE) - Associated bid (if applicable)
- `duration_ms` (INTEGER, NULLABLE) - Operation duration in milliseconds
- `cpu_usage` (DECIMAL(5,2), NULLABLE) - CPU usage percentage
- `memory_usage` (BIGINT, NULLABLE) - Memory usage in bytes
- `network_latency` (INTEGER, NULLABLE) - Network latency in milliseconds
- `custom_metrics` (JSON, NULLABLE) - Custom performance metrics
- `tags` (JSON, NULLABLE) - Additional classification and search tags
- `occurred_at` (TIMESTAMP, NOT NULL) - When the event occurred
- `created_at` (TIMESTAMP, NOT NULL) - Event record creation timestamp
- `retention_policy` (VARCHAR(50), DEFAULT 'standard') - Data retention classification

**Primary Key**: `event_id`

**Foreign Keys**:
- `user_id` → `users.user_id` (nullable)
- `auction_id` → `auctions.auction_id` (nullable)
- `item_id` → `auction_items.item_id` (nullable)
- `bid_id` → `bids.bid_id` (nullable)

**Indexes**:
- `idx_system_events_type` (event_type) - For event type filtering
- `idx_system_events_category` (event_category) - For category-based queries
- `idx_system_events_severity` (severity) - For severity-based filtering
- `idx_system_events_source` (source) - For component-specific queries
- `idx_system_events_time` (occurred_at) - For time-based analysis
- `idx_system_events_user` (user_id) - For user-specific event tracking
- `idx_system_events_auction` (auction_id) - For auction-specific events
- `idx_system_events_error` (error_code) - For error code filtering
- `idx_system_events_performance` (duration_ms, cpu_usage, memory_usage) - For performance analysis

**Special Considerations**:
- **Performance Monitoring**: Detailed metrics for system performance analysis
- **Error Tracking**: Comprehensive error context for debugging
- **Operational Intelligence**: Business metrics and operational data
- **Real-time Monitoring**: Efficient queries for live system monitoring
- **Troubleshooting**: Rich context for issue diagnosis and resolution

## 3. immutable_logs

**Purpose**: Tamper-proof logging system for regulatory compliance and legal admissibility with cryptographic integrity guarantees.

**Key Columns**:
- `log_id` (UUID, PRIMARY KEY) - Unique log entry identifier
- `log_sequence` (BIGINT, NOT NULL) - Monotonically increasing sequence number
- `log_type` (ENUM, NOT NULL) - Type: audit, security, compliance, legal, financial
- `retention_period` (VARCHAR(50), NOT NULL) - Retention: 1_year, 3_years, 7_years, permanent
- `compliance_framework` (VARCHAR(100), NULLABLE) - Regulation: GDPR, SOX, PCI-DSS, HIPAA
- `jurisdiction` (VARCHAR(100), NULLABLE) - Legal jurisdiction for compliance
- `data_classification` (ENUM, NOT NULL) - Classification: public, internal, confidential, restricted
- `content` (JSON, NOT NULL) - The actual log data and context
- `content_hash` (VARCHAR(64), NOT NULL) - SHA-256 hash of content for integrity
- `previous_hash` (VARCHAR(64), NOT NULL) - Hash of previous log entry (blockchain-like)
- `merkle_root` (VARCHAR(64), NULLABLE) - Merkle tree root for batch integrity
- `digital_signature` (TEXT, NOT NULL) - Cryptographic signature of the entire entry
- `signature_algorithm` (VARCHAR(50), NOT NULL) - Algorithm used for signing
- `certificate_thumbprint` (VARCHAR(64), NULLABLE) - Certificate used for signing
- `witness_signatures` (JSON, NULLABLE) - Third-party witness signatures
- `timestamp` (TIMESTAMP, NOT NULL) - Log entry timestamp
- `created_at` (TIMESTAMP, NOT NULL) - Record creation timestamp
- `expires_at` (TIMESTAMP, NULLABLE) - When this log entry can be archived/deleted
- `archive_status` (ENUM, DEFAULT 'active') - Status: active, archived, deleted
- `archive_location` (VARCHAR(500), NULLABLE) - Storage location if archived

**Primary Key**: `log_id`

**Unique Constraint**:
- `uq_immutable_logs_sequence` (log_sequence) - Ensures sequence integrity

**Indexes**:
- `idx_immutable_logs_sequence` (log_sequence) - For sequential access
- `idx_immutable_logs_type` (log_type) - For log type filtering
- `idx_immutable_logs_retention` (retention_period) - For retention policy queries
- `idx_immutable_logs_compliance` (compliance_framework) - For compliance-based queries
- `idx_immutable_logs_time` (timestamp) - For time-based queries
- `idx_immutable_logs_classification` (data_classification) - For classification filtering
- `idx_immutable_logs_expiry` (expires_at) - For retention management
- `idx_immutable_logs_archive` (archive_status) - For archive status queries

**Special Considerations**:
- **Cryptographic Integrity**: Blockchain-inspired hash chaining for tamper evidence
- **Legal Admissibility**: Digital signatures for court admissibility
- **Regulatory Compliance**: Built-in support for multiple compliance frameworks
- **Long-term Retention**: Configurable retention policies with secure archiving
- **Third-party Verification**: Witness signature support for enhanced trust

## Cryptographic Integrity Features

### Hash Chain Implementation
```sql
-- Each log entry links to the previous entry's hash
previous_hash = SHA256(previous_entry_content)
content_hash = SHA256(current_entry_content)
-- Tamper detection: Verify chain integrity across all entries
```

### Digital Signature Process
```sql
-- Sign the complete entry with private key
signature = RSA_SIGN(content + content_hash + previous_hash + timestamp)
-- Verification: Anyone can verify with public key
```

### Merkle Tree Support
```sql
-- For batch integrity verification
merkle_root = MERKLE_ROOT(batch_log_entries)
-- Efficiently verify large batches without checking each entry
```

## Compliance Framework Support

### GDPR Compliance
```json
{
  "compliance_framework": "GDPR",
  "data_processing_activities": ["auction_participation", "bid_history"],
  "consent_records": ["consent_id_123"],
  "data_retention_period": "3_years",
  "right_to_erasure": "enabled"
}
```

### Financial Regulations (SOX/PCI-DSS)
```json
{
  "compliance_framework": "SOX",
  "financial_impact": "material",
  "audit_requirements": ["segregation_of_duties", "access_controls"],
  "retention_period": "7_years",
  "encryption_required": true
}
```

## Design Principles

1. **Immutability**: Cryptographic integrity with tamper-evident design
2. **Performance**: Optimized for high-volume logging without system impact
3. **Compliance**: Built-in support for multiple regulatory frameworks
4. **Scalability**: Partitioning and archiving strategies for long-term growth
5. **Searchability**: Rich indexing for efficient audit and compliance queries
6. **Legal Admissibility**: Digital signatures for court acceptance

## Relationships

```
audit_trail (M) ──── (M) system_events
   │
   └─── (M) immutable_logs

users (M) ──── (M) audit_trail
auctions (M) ──── (M) audit_trail
bids (M) ──── (M) audit_trail
```

This audit and logging schema provides comprehensive, tamper-proof tracking of all system activities while maintaining high performance and supporting regulatory compliance requirements across all 13 auction types.