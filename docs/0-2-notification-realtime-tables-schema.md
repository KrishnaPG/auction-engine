# Notification and Real-Time Features Tables Schema Design

## Overview
This document defines the database schema for comprehensive notification management and real-time features, supporting instant communication, connection management, and event streaming across all 13 auction types.

## 1. notifications

**Purpose**: Multi-channel notification system supporting email, SMS, push notifications, and in-app alerts with personalization and delivery tracking.

**Key Columns**:
- `notification_id` (UUID, PRIMARY KEY) - Unique notification identifier
- `user_id` (UUID, NOT NULL) - Target user for notification
- `notification_type` (ENUM, NOT NULL) - Type: email, sms, push, in_app, webhook
- `category` (ENUM, NOT NULL) - Category: auction, bid, payment, system, marketing
- `priority` (ENUM, NOT NULL) - Priority: low, normal, high, urgent
- `auction_id` (UUID, NULLABLE) - Associated auction (if applicable)
- `bid_id` (UUID, NULLABLE) - Associated bid (if applicable)
- `item_id` (UUID, NULLABLE) - Associated item (if applicable)
- `title` (VARCHAR(255), NOT NULL) - Notification title/subject
- `message` (TEXT, NOT NULL) - Notification message content
- `rich_content` (JSON, NULLABLE) - Rich media content (images, buttons, etc.)
- `action_url` (VARCHAR(500), NULLABLE) - URL for notification action
- `action_label` (VARCHAR(100), NULLABLE) - Label for action button
- `template_id` (UUID, NULLABLE) - Notification template used
- `template_data` (JSON, NULLABLE) - Data merged into template
- `delivery_channels` (JSON, NOT NULL) - Channels to deliver through
- `scheduled_at` (TIMESTAMP, NULLABLE) - When to send (for scheduled notifications)
- `sent_at` (TIMESTAMP, NULLABLE) - When notification was sent
- `delivered_at` (TIMESTAMP, NULLABLE) - When notification was delivered
- `read_at` (TIMESTAMP, NULLABLE) - When user read the notification
- `clicked_at` (TIMESTAMP, NULLABLE) - When user clicked notification action
- `status` (ENUM, NOT NULL) - Status: pending, sent, delivered, read, clicked, failed, cancelled
- `delivery_attempts` (INTEGER, DEFAULT 0) - Number of delivery attempts
- `max_attempts` (INTEGER, DEFAULT 3) - Maximum delivery attempts
- `error_message` (TEXT, NULLABLE) - Last delivery error (if failed)
- `provider_response` (JSON, NULLABLE) - Response from delivery provider
- `expires_at` (TIMESTAMP, NULLABLE) - When notification expires
- `is_read` (BOOLEAN, DEFAULT FALSE) - Whether user has read notification
- `is_archived` (BOOLEAN, DEFAULT FALSE) - Whether notification is archived
- `tags` (JSON, NULLABLE) - Additional classification tags
- `metadata` (JSON, NULLABLE) - Additional notification metadata
- `created_at` (TIMESTAMP, NOT NULL) - Notification creation timestamp
- `updated_at` (TIMESTAMP, NOT NULL) - Last update timestamp

**Primary Key**: `notification_id`

**Foreign Keys**:
- `user_id` → `users.user_id`
- `auction_id` → `auctions.auction_id` (nullable)
- `bid_id` → `bids.bid_id` (nullable)
- `item_id` → `auction_items.item_id` (nullable)
- `template_id` → `notification_templates.template_id` (nullable)

**Indexes**:
- `idx_notifications_user` (user_id) - For user notification queries
- `idx_notifications_type` (notification_type) - For notification type filtering
- `idx_notifications_category` (category) - For category-based queries
- `idx_notifications_priority` (priority) - For priority-based sorting
- `idx_notifications_status` (status) - For status-based filtering
- `idx_notifications_scheduled` (scheduled_at) - For scheduled notification processing
- `idx_notifications_read` (is_read) - For read/unread filtering
- `idx_notifications_auction` (auction_id) - For auction-specific notifications
- `idx_notifications_time` (created_at) - For time-based queries
- `idx_notifications_expiry` (expires_at) - For expiration processing

**Special Considerations**:
- **Multi-channel Delivery**: Support for email, SMS, push, and webhook notifications
- **Rich Content**: JSON structure supports complex notification layouts
- **Template System**: Reusable templates with dynamic data merging
- **Delivery Tracking**: Complete delivery lifecycle management
- **Performance**: Optimized for high-volume notification processing

## 2. websocket_connections

**Purpose**: Real-time WebSocket connection management for live auction updates and instant communication.

**Key Columns**:
- `connection_id` (UUID, PRIMARY KEY) - Unique connection identifier
- `user_id` (UUID, NOT NULL) - Connected user
- `session_id` (VARCHAR(255), NOT NULL) - User session identifier
- `socket_id` (VARCHAR(255), NOT NULL) - WebSocket connection identifier
- `connection_status` (ENUM, NOT NULL) - Status: connecting, connected, disconnecting, disconnected
- `client_ip` (INET, NOT NULL) - Client IP address
- `user_agent` (TEXT, NOT NULL) - Client application information
- `protocol_version` (VARCHAR(20), DEFAULT '1.0') - WebSocket protocol version
- `compression_enabled` (BOOLEAN, DEFAULT FALSE) - Whether compression is enabled
- `heartbeat_interval` (INTEGER, DEFAULT 30) - Heartbeat interval in seconds
- `last_heartbeat` (TIMESTAMP, NULLABLE) - Last heartbeat received
- `connected_at` (TIMESTAMP, NOT NULL) - Connection establishment time
- `disconnected_at` (TIMESTAMP, NULLABLE) - Connection termination time
- `disconnect_reason` (VARCHAR(255), NULLABLE) - Reason for disconnection
- `reconnect_count` (INTEGER, DEFAULT 0) - Number of reconnections
- `bytes_sent` (BIGINT, DEFAULT 0) - Total bytes sent to client
- `bytes_received` (BIGINT, DEFAULT 0) - Total bytes received from client
- `messages_sent` (INTEGER, DEFAULT 0) - Total messages sent
- `messages_received` (INTEGER, DEFAULT 0) - Total messages received
- `subscriptions` (JSON, NOT NULL) - Active subscription topics
- `auction_subscriptions` (JSON, NOT NULL) - Specific auctions being monitored
- `user_preferences` (JSON, NULLABLE) - Real-time preferences (throttling, filtering)
- `geo_location` (JSON, NULLABLE) - Geographic location for CDN optimization
- `device_info` (JSON, NULLABLE) - Device and browser information
- `bandwidth_usage` (JSON, NULLABLE) - Bandwidth usage statistics
- `error_count` (INTEGER, DEFAULT 0) - Connection errors encountered
- `last_error` (TEXT, NULLABLE) - Last error message
- `created_at` (TIMESTAMP, NOT NULL) - Connection record creation timestamp
- `updated_at` (TIMESTAMP, NOT NULL) - Last update timestamp

**Primary Key**: `connection_id`

**Foreign Keys**:
- `user_id` → `users.user_id`

**Indexes**:
- `idx_ws_connections_user` (user_id) - For user connection queries
- `idx_ws_connections_session` (session_id) - For session-based lookups
- `idx_ws_connections_socket` (socket_id) - For socket-based lookups
- `idx_ws_connections_status` (connection_status) - For active connection filtering
- `idx_ws_connections_heartbeat` (last_heartbeat) - For heartbeat monitoring
- `idx_ws_connections_time` (connected_at) - For connection time analysis

**Special Considerations**:
- **Connection Lifecycle**: Complete connection state management
- **Performance Monitoring**: Bandwidth and message tracking
- **Subscription Management**: Flexible topic subscription system
- **Heartbeat Monitoring**: Connection health and automatic cleanup
- **Scalability**: Support for thousands of concurrent connections

## 3. real_time_events

**Purpose**: Event streaming system for real-time auction updates, bid notifications, and system events.

**Key Columns**:
- `event_id` (UUID, PRIMARY KEY) - Unique event identifier
- `event_type` (VARCHAR(100), NOT NULL) - Type of event
- `event_category` (ENUM, NOT NULL) - Category: auction, bid, user, system, notification
- `auction_id` (UUID, NULLABLE) - Associated auction (if applicable)
- `user_id` (UUID, NULLABLE) - Associated user (if applicable)
- `bid_id` (UUID, NULLABLE) - Associated bid (if applicable)
- `item_id` (UUID, NULLABLE) - Associated item (if applicable)
- `event_data` (JSON, NOT NULL) - Complete event payload
- `event_metadata` (JSON, NULLABLE) - Additional event context
- `priority` (ENUM, DEFAULT 'normal') - Priority: low, normal, high, critical
- `visibility` (ENUM, NOT NULL) - Visibility: public, authenticated, private, targeted
- `target_audience` (JSON, NULLABLE) - Specific users/groups to receive event
- `broadcast_channels` (JSON, NOT NULL) - Channels to broadcast on
- `sequence_number` (BIGINT, NOT NULL) - Monotonic sequence for event ordering
- `previous_event_id` (UUID, NULLABLE) - Link to previous related event
- `correlation_id` (VARCHAR(255), NULLABLE) - ID for correlating related events
- `causal_events` (JSON, NULLABLE) - Events that caused this event
- `expected_impacts` (JSON, NULLABLE) - Expected effects of this event
- `generated_at` (TIMESTAMP, NOT NULL) - When event was generated
- `published_at` (TIMESTAMP, NULLABLE) - When event was published to streams
- `expires_at` (TIMESTAMP, NULLABLE) - When event expires from streams
- `retention_policy` (VARCHAR(50), DEFAULT 'standard') - How long to retain event
- `delivery_status` (JSON, NULLABLE) - Delivery status per channel
- `ack_required` (BOOLEAN, DEFAULT FALSE) - Whether acknowledgment is required
- `ack_timeout` (INTEGER, DEFAULT 30) - Acknowledgment timeout in seconds
- `acknowledgments` (JSON, NULLABLE) - Received acknowledgments
- `tags` (JSON, NULLABLE) - Event classification tags
- `created_at` (TIMESTAMP, NOT NULL) - Event record creation timestamp

**Primary Key**: `event_id`

**Foreign Keys**:
- `auction_id` → `auctions.auction_id` (nullable)
- `user_id` → `users.user_id` (nullable)
- `bid_id` → `bids.bid_id` (nullable)
- `item_id` → `auction_items.item_id` (nullable)

**Indexes**:
- `idx_rt_events_type` (event_type) - For event type filtering
- `idx_rt_events_category` (event_category) - For category-based queries
- `idx_rt_events_auction` (auction_id) - For auction-specific events
- `idx_rt_events_user` (user_id) - For user-specific events
- `idx_rt_events_sequence` (sequence_number) - For event ordering
- `idx_rt_events_time` (generated_at) - For time-based queries
- `idx_rt_events_priority` (priority) - For priority-based processing
- `idx_rt_events_visibility` (visibility) - For visibility filtering
- `idx_rt_events_expiry` (expires_at) - For expiration processing
- `idx_rt_events_correlation` (correlation_id) - For event correlation

**Special Considerations**:
- **Event Ordering**: Sequence numbers ensure proper event ordering
- **Causal Relationships**: Track event dependencies and relationships
- **Targeted Delivery**: Sophisticated audience targeting capabilities
- **Acknowledgment System**: Ensure critical events are received
- **Performance**: Optimized for high-throughput event streaming

## Notification Types by Auction Events

### English Auction Events
```json
{
  "new_bid": {
    "title": "New bid on {auction_title}",
    "message": "{bidder} bid {amount} on {item_title}",
    "priority": "normal",
    "channels": ["in_app", "push"]
  },
  "outbid": {
    "title": "You've been outbid",
    "message": "Someone bid higher than your {amount} bid",
    "priority": "high",
    "channels": ["in_app", "push", "email"]
  }
}
```

### Penny Auction Events
```json
{
  "bid_placed": {
    "title": "Bid placed successfully",
    "message": "Your bid extended {auction_title} by {extension_seconds}s",
    "priority": "normal",
    "channels": ["in_app"]
  },
  "auction_ending": {
    "title": "Auction ending soon!",
    "message": "{auction_title} ends in {time_remaining}",
    "priority": "urgent",
    "channels": ["in_app", "push"]
  }
}
```

### System-wide Events
```json
{
  "auction_started": {
    "title": "Auction started",
    "message": "{auction_title} is now live",
    "priority": "normal",
    "channels": ["in_app", "email"]
  },
  "auction_ended": {
    "title": "Auction completed",
    "message": "{auction_title} ended. Winner: {winner}",
    "priority": "normal",
    "channels": ["in_app", "email"]
  }
}
```

## Real-Time Event Examples

### Bid Event
```json
{
  "event_type": "bid_placed",
  "auction_id": "uuid-auction-123",
  "bid_id": "uuid-bid-456",
  "event_data": {
    "bid_amount": 150.00,
    "bidder_id": "uuid-user-789",
    "current_price": 140.00,
    "auction_title": "Vintage Watch Collection"
  },
  "priority": "high",
  "visibility": "authenticated"
}
```

### Auction Status Event
```json
{
  "event_type": "auction_status_changed",
  "auction_id": "uuid-auction-123",
  "event_data": {
    "old_status": "active",
    "new_status": "completed",
    "winner_id": "uuid-user-789",
    "final_price": 275.00
  },
  "priority": "normal",
  "visibility": "public"
}
```

## Design Principles

1. **Real-Time Performance**: Sub-second event delivery and notification processing
2. **Scalability**: Support for thousands of concurrent connections and high event throughput
3. **Reliability**: Guaranteed delivery with acknowledgment and retry mechanisms
4. **Flexibility**: Multi-channel notification support with rich content capabilities
5. **Privacy**: Granular visibility controls and targeted event delivery
6. **Monitoring**: Comprehensive connection and delivery tracking

## Relationships

```
users (1) ──── (M) notifications
   │              │
   │              └─── (M) websocket_connections
   │
   └─── (M) real_time_events

auctions (1) ──── (M) notifications
   │                    │
   │                    └─── (M) real_time_events
   │
   └─── (M) websocket_connections (via subscriptions)

bids (1) ──── (M) notifications
   │
   └─── (M) real_time_events
```

This notification and real-time features schema provides comprehensive support for instant communication, connection management, and event streaming across all 13 auction types while maintaining high performance, reliability, and scalability.