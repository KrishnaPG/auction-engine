# User Management Tables Schema Design

## Overview
This document defines the database schema for comprehensive user management, supporting authentication, authorization, preferences, and compliance requirements across all 13 auction types.

## 1. users

**Purpose**: Core user account management with authentication, authorization, and account lifecycle tracking.

**Key Columns**:
- `user_id` (UUID, PRIMARY KEY) - Unique user identifier
- `username` (VARCHAR(50), UNIQUE, NOT NULL) - Unique username for login
- `email` (VARCHAR(255), UNIQUE, NOT NULL) - Email address for notifications and login
- `password_hash` (VARCHAR(255), NOT NULL) - Secure password hash
- `salt` (VARCHAR(32), NOT NULL) - Password salt for enhanced security
- `user_role` (ENUM, NOT NULL) - Role: bidder, seller, admin, moderator, system
- `account_status` (ENUM, NOT NULL) - Status: active, suspended, deactivated, pending_verification, banned
- `email_verified` (BOOLEAN, DEFAULT FALSE) - Email verification status
- `phone_verified` (BOOLEAN, DEFAULT FALSE) - Phone verification status
- `two_factor_enabled` (BOOLEAN, DEFAULT FALSE) - 2FA status
- `two_factor_secret` (VARCHAR(32), NULLABLE) - 2FA secret key
- `last_login_at` (TIMESTAMP, NULLABLE) - Last successful login
- `last_login_ip` (INET, NULLABLE) - Last login IP address
- `login_attempts` (INTEGER, DEFAULT 0) - Failed login attempts counter
- `locked_until` (TIMESTAMP, NULLABLE) - Account lockout expiration
- `password_changed_at` (TIMESTAMP, NOT NULL) - Last password change
- `created_at` (TIMESTAMP, NOT NULL) - Account creation timestamp
- `updated_at` (TIMESTAMP, NOT NULL) - Last update timestamp
- `version` (INTEGER, DEFAULT 1) - Optimistic locking version

**Primary Key**: `user_id`

**Unique Constraints**:
- `uq_users_username` (username)
- `uq_users_email` (email)

**Indexes**:
- `idx_users_username` (username) - For username-based lookups
- `idx_users_email` (email) - For email-based lookups
- `idx_users_role` (user_role) - For role-based queries
- `idx_users_status` (account_status) - For active user filtering
- `idx_users_login` (last_login_at) - For activity analysis
- `idx_users_verification` (email_verified, phone_verified) - For verification status queries

**Special Considerations**:
- **Security**: Password hashing with salt, login attempt tracking, account lockout
- **Verification**: Multi-factor verification support for high-value auctions
- **Role Management**: Granular roles for different auction participation levels
- **Audit Trail**: Login tracking for security and compliance
- **Scalability**: Efficient lookups for real-time authentication

## 2. user_profiles

**Purpose**: Extended user profile information for personalization, verification, and compliance requirements.

**Key Columns**:
- `profile_id` (UUID, PRIMARY KEY) - Unique profile identifier
- `user_id` (UUID, NOT NULL) - Associated user account
- `first_name` (VARCHAR(50), NULLABLE) - First name
- `last_name` (VARCHAR(50), NULLABLE) - Last name
- `display_name` (VARCHAR(100), NULLABLE) - Public display name
- `avatar_url` (VARCHAR(500), NULLABLE) - Profile picture URL
- `date_of_birth` (DATE, NULLABLE) - Date of birth for age verification
- `gender` (ENUM, NULLABLE) - Gender: male, female, other, prefer_not_to_say
- `timezone` (VARCHAR(50), DEFAULT 'UTC') - User's timezone preference
- `language` (VARCHAR(10), DEFAULT 'en') - Preferred language (ISO 639-1)
- `country` (VARCHAR(2), NULLABLE) - Country code (ISO 3166-1 alpha-2)
- `region` (VARCHAR(100), NULLABLE) - State/region
- `city` (VARCHAR(100), NULLABLE) - City
- `postal_code` (VARCHAR(20), NULLABLE) - Postal/ZIP code
- `phone_number` (VARCHAR(20), NULLABLE) - Phone number for verification
- `phone_country_code` (VARCHAR(5), DEFAULT '+1') - Phone country code
- `company` (VARCHAR(255), NULLABLE) - Company/organization name
- `job_title` (VARCHAR(100), NULLABLE) - Job title/position
- `industry` (VARCHAR(100), NULLABLE) - Industry sector
- `website` (VARCHAR(500), NULLABLE) - Personal/company website
- `bio` (TEXT, NULLABLE) - User biography/description
- `social_links` (JSON, NULLABLE) - Social media profile links
- `verification_documents` (JSON, NULLABLE) - Verification document references
- `kyc_status` (ENUM, DEFAULT 'not_required') - KYC status: not_required, pending, verified, rejected
- `kyc_verified_at` (TIMESTAMP, NULLABLE) - KYC verification timestamp
- `kyc_verified_by` (UUID, NULLABLE) - Admin who verified KYC
- `risk_score` (DECIMAL(3,2), DEFAULT 0.00) - Fraud risk assessment score
- `is_public_profile` (BOOLEAN, DEFAULT FALSE) - Whether profile is publicly visible
- `created_at` (TIMESTAMP, NOT NULL) - Profile creation timestamp
- `updated_at` (TIMESTAMP, NOT NULL) - Last update timestamp

**Primary Key**: `profile_id`

**Foreign Keys**:
- `user_id` → `users.user_id`
- `kyc_verified_by` → `users.user_id` (nullable)

**Indexes**:
- `idx_user_profiles_user` (user_id) - For user profile queries
- `idx_user_profiles_name` (first_name, last_name) - For name-based searches
- `idx_user_profiles_location` (country, region, city) - For location-based queries
- `idx_user_profiles_kyc` (kyc_status) - For KYC verification filtering
- `idx_user_profiles_risk` (risk_score) - For risk assessment queries
- `idx_user_profiles_public` (is_public_profile) - For public profile searches

**Special Considerations**:
- **Privacy Protection**: Granular privacy controls for different data types
- **KYC Compliance**: Built-in support for Know Your Customer requirements
- **Internationalization**: Multi-language and timezone support
- **Verification**: Document storage for identity verification
- **Risk Management**: Fraud scoring for enhanced security

## 3. user_preferences

**Purpose**: User-specific auction preferences, notification settings, and personalized auction experience configuration.

**Key Columns**:
- `preference_id` (UUID, PRIMARY KEY) - Unique preference identifier
- `user_id` (UUID, NOT NULL) - Associated user account
- `preference_category` (VARCHAR(50), NOT NULL) - Category: bidding, notifications, display, privacy
- `preference_key` (VARCHAR(100), NOT NULL) - Specific preference name
- `preference_value` (JSON, NOT NULL) - Preference value (JSON for complex settings)
- `data_type` (VARCHAR(20), NOT NULL) - Value type: string, number, boolean, json, array
- `is_default` (BOOLEAN, DEFAULT FALSE) - Whether this is system default
- `is_overridable` (BOOLEAN, DEFAULT TRUE) - Whether users can change this preference

**Bidding Preferences**:
- `default_bid_increment` (DECIMAL(15,2)) - Preferred bid increment amount
- `max_bid_amount` (DECIMAL(15,2)) - Maximum single bid limit
- `auto_bid_enabled` (BOOLEAN) - Enable automatic proxy bidding
- `bid_confirmation_required` (BOOLEAN) - Require confirmation for large bids
- `favorite_auction_types` (ARRAY) - Preferred auction type IDs
- `excluded_auction_types` (ARRAY) - Auction types to hide from user
- `max_bids_per_auction` (INTEGER) - Maximum bids per auction limit
- `bid_retraction_allowed` (BOOLEAN) - Allow bid retractions within time limits

**Notification Preferences**:
- `email_notifications` (JSON) - Email notification settings by type
- `sms_notifications` (JSON) - SMS notification settings by type
- `push_notifications` (JSON) - Push notification settings by type
- `notification_frequency` (ENUM) - Frequency: real_time, hourly, daily, weekly, never
- `auction_alerts` (JSON) - Auction-specific alert preferences
- `bid_alerts` (JSON) - Bid-related notification preferences
- `payment_alerts` (JSON) - Payment and settlement notifications

**Display Preferences**:
- `timezone` (VARCHAR(50)) - Display timezone
- `currency` (VARCHAR(3)) - Preferred currency (ISO 4217)
- `language` (VARCHAR(10)) - Display language (ISO 639-1)
- `theme` (ENUM) - UI theme: light, dark, auto
- `items_per_page` (INTEGER) - Pagination preference
- `default_sort_order` (VARCHAR(50)) - Default sorting for auction lists
- `show_bid_history` (BOOLEAN) - Display bid history by default
- `compact_view` (BOOLEAN) - Use compact auction display

**Privacy Preferences**:
- `profile_visibility` (ENUM) - Profile visibility: public, bidders_only, private
- `bid_history_visibility` (ENUM) - Bid history visibility level
- `show_online_status` (BOOLEAN) - Display online presence
- `allow_direct_messages` (BOOLEAN) - Allow direct messages from other users
- `data_collection_consent` (BOOLEAN) - Consent for data collection
- `marketing_emails` (BOOLEAN) - Consent for marketing communications

**Primary Key**: `preference_id`

**Foreign Keys**:
- `user_id` → `users.user_id`

**Unique Constraint**:
- `uq_user_preferences` (user_id, preference_key) - One preference per key per user

**Indexes**:
- `idx_user_preferences_user` (user_id) - For user preference queries
- `idx_user_preferences_category` (preference_category) - For category-based queries
- `idx_user_preferences_key` (preference_key) - For preference key lookups

**Special Considerations**:
- **Flexibility**: JSON values support complex nested preference structures
- **Personalization**: Granular control over auction experience
- **Privacy Compliance**: Built-in consent management for regulations
- **Real-time Updates**: Efficient preference retrieval for live auction features
- **Default Management**: System defaults with user override capability

## Example Preference Configurations

### High-Frequency Bidder
```json
{
  "notification_frequency": "real_time",
  "bid_confirmation_required": false,
  "auto_bid_enabled": true,
  "max_bid_amount": "10000.00",
  "favorite_auction_types": ["english", "penny", "japanese"]
}
```

### Privacy-Conscious User
```json
{
  "profile_visibility": "private",
  "bid_history_visibility": "bidders_only",
  "show_online_status": false,
  "allow_direct_messages": false,
  "marketing_emails": false
}
```

### International User
```json
{
  "timezone": "Asia/Tokyo",
  "currency": "JPY",
  "language": "ja",
  "country": "JP"
}
```

## Design Principles

1. **Security First**: Comprehensive authentication and authorization
2. **Privacy Protection**: Granular privacy controls and consent management
3. **Personalization**: Extensive customization options for user experience
4. **Compliance Ready**: Built-in support for regulatory requirements
5. **Scalability**: Efficient queries for real-time user operations
6. **Flexibility**: Extensible preference system for future enhancements

## Relationships

```
users (1) ──── (1) user_profiles
   │
   └─── (1) ──── (M) user_preferences
```

This user management schema provides comprehensive support for user authentication, personalization, privacy protection, and compliance across all 13 auction types while maintaining high performance and scalability.