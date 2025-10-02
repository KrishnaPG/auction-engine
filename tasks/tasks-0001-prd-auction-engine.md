## Relevant Files (draft, needs to be reviewed and updated)

This project delivers a comprehensive reusable auction engine supporting all 13 auction types (English, Dutch, Sealed-bid, Reverse, Vickrey, Buy-it-now, Double, All-Pay, Japanese, Chinese, Penny, Multi-Unit, and Combinatorial auctions) with zero-copy operations, comprehensive type safety through branded types that prevent primitive obsession, and performance optimization through extensive reusable patterns design.

- `docs/0-1-0-auction-types-research.md` - Comprehensive analysis of 13 auction types and their characteristics.
- `docs/0-2-core-auction-tables-schema.md` - Core auction tables design (auctions, auction_items, auction_configurations)
- `docs/0-2-bid-management-tables-schema.md` - Bid management tables design (bids, bid_history, bid_retractions)
- `docs/0-2-user-management-tables-schema.md` - User management tables design (users, user_profiles, user_preferences)
- `docs/0-2-audit-logging-tables-schema.md` - Audit and logging tables design (audit_trail, system_events, immutable_logs)
- `docs/0-2-business-rules-tables-schema.md` - Business rules tables design (rules, rule_configurations, rule_violations)
- `docs/0-2-notification-realtime-tables-schema.md` - Notification and real-time features tables design (notifications, websocket_connections, real_time_events)
- `docs/0-2-indexing-strategy-performance.md` - Comprehensive indexing strategy for performance optimization
- `docs/0-1-1-auction-type-special-considerations.md` - Special considerations for each of the 13 auction types
- `docs/0-2-entity-relationship-diagram-validation.md` - Entity relationship diagram and validation rules
- `docs/0-3-winner-determination-sql-queries.md` - Comprehensive SQL query designs for winner determination across all 13 auction types
- `docs/0-4-architecture.md` - Comprehensive package architecture design for reusable auction engine with CRUD APIs across REST, gRPC, and GraphQL interfaces
- `docs/0-6-reusable-patterns.md` - Comprehensive reusable patterns design supporting all 13 auction types with zero-copy operations, type safety, and performance optimization
- `docs/0-7-branded-types.md` - Comprehensive branded types design for type safety across all 13 auction types, preventing primitive obsession and ensuring domain-specific type safety
- `src/types/index.ts` - Core TypeScript types and interfaces for auctions, bids, and business rules.
- `src/types/auction.ts` - Auction-specific type definitions.
- `src/types/bid.ts` - Bid-specific type definitions.
- `src/types/business-rules.ts` - Business rules configuration types.
- `src/database/schema.sql` - Database schema definitions for multiple SQL databases.
- `src/database/migrations/` - Database migration files.
- `src/database/connection.ts` - Database connection and abstraction layer.
- `src/database/queries/` - SQL query builders for winner determination.
- `src/core/auction-factory.ts` - Factory pattern for creating different auction types.
- `src/core/auction-manager.ts` - Main auction lifecycle management.
- `src/auction-types/english-auction.ts` - English auction implementation.
- `src/auction-types/dutch-auction.ts` - Dutch auction implementation.
- `src/auction-types/sealed-bid-auction.ts` - Sealed-bid auction implementation.
- `src/auction-types/reverse-auction.ts` - Reverse auction implementation.
- `src/auction-types/vickrey-auction.ts` - Vickrey auction implementation.
- `src/auction-types/buy-it-now-auction.ts` - Buy-it-now auction implementation.
- `src/auction-types/double-auction.ts` - Double auction implementation.
- `src/auction-types/all-pay-auction.ts` - All-pay auction implementation.
- `src/auction-types/japanese-auction.ts` - Japanese auction implementation.
- `src/auction-types/chinese-auction.ts` - Chinese auction implementation.
- `src/auction-types/penny-auction.ts` - Penny auction implementation.
- `src/auction-types/multi-unit-auction.ts` - Multi-unit auction implementation.
- `src/auction-types/combinatorial-auction.ts` - Combinatorial auction implementation.
- `src/business-rules/engine.ts` - Business rules validation engine.
- `src/business-rules/validators/` - Individual rule validators.
- `src/bid/bid-manager.ts` - Bid processing and management.
- `src/bid/bid-validator.ts` - Bid validation logic.
- `src/winner-determination/service.ts` - Winner determination service.
- `src/winner-determination/sql-queries.ts` - Database-specific SQL queries.
- `src/notifications/service.ts` - Real-time notification service.
- `src/notifications/websocket.ts` - WebSocket implementation for real-time updates.
- `src/api/routes.ts` - API route handlers.
- `src/api/middleware.ts` - API middleware for validation and error handling.
- `src/audit/trail.ts` - Audit trail management.
- `src/audit/logger.ts` - Immutable logging system.
- `src/utils/constants.ts` - Application constants.
- `src/utils/helpers.ts` - Utility functions.
- `src/config/index.ts` - Configuration management.
- `tests/unit/` - Unit tests for all components.
- `tests/integration/` - Integration tests.
- `tests/utils/test-helpers.ts` - Test utilities and mocks.
- `package.json` - Project dependencies and scripts.
- `tsconfig.json` - TypeScript configuration.
- `README.md` - Project documentation.

## Notes
- Critical: the auction/bidding might happen over a long period of time and our app/package might have restarted multiple times during that period. Do not expect anything to be in memory. Always use database as the single source of truth. Never store any state data in memory. 
- Reliability should be the key concern and expect everything to fail at any point of time and design the code to withstand that.
- Unit tests should be in separate, dedicated `tests` folder (not to be mixed with code files in the `src` folder).
- Use `Bun test [optional/path/to/test/file]` to run tests. Running without a path executes all tests found by the Bun test configuration.
- Apart from unit tests we should have a test driver (CLI) that can test end-to-end engine with various different test mock auction scenarios (preferably loaded from test JSON file);
- Database schema should support immutability for audit trails.
- All SQL queries should be database-agnostic where possible.
- Consider performance requirements for real-time bidding.
- Coding standards: use prefix `I` for typescript interfaces (e.g. `interface IBid`) and prefix `T` for types (e.g. `type IEntry`);
- Avoid memory allocations and aim for zero-copy;
- Code Reliability must be very high; It should be fault-tolerant and crash-resilient;
- Use branded types instead of plain types wherever possible. Avoid primitive type castings, such as `Number(Date.now())` or `x as number` as much as possible. Brand types can be compared and assigned directly as long as their base type is same;
- Use Open/Closed Principle (e.g. instead of using `switch..case` to route to various functions, maintain a map of functions indexed by key and use object key based lookups);
- If something is not clear or not stated explicitly, do not assume anything - ask explicitly for clarifications instead of deciding one or other.
  
## Tech stack
- This project is primarily a "reusable backend library". It does not have an actual server, instead it provides APIs and interfaces needed so that any server (such as Elysia or Encore.ts or Express) can directly plugin this package and start offering auction functionality.
- Use `Bun` as package manager with typescript; 
- Use OTL + GraphQL Yoga + Pino + GRPC; 
- Database: Drizzle ORM with Postgres as primary for development; In production use the database based on the config settings;
- Use `Biomejs` for format, linting etc.
- For auth assume this is behind a pre-authenticated proxy; You will get `tenantId`;

## Key implementation directives
- **Thin Wrapper**: The package is a set of query functions/services that execute parameterized SQL (database-agnostic where possible) via Drizzle abstraction. 
- **Offload to DB**: Use SQL for all logic. e.g. current price/max bid via aggregates, status via CASE on timestamps/bids, winner determination via existing SQL designs. Leverage Postgres features (e.g., materialized views for real-time, triggers for outbox/events). For multi-auction types, parameterize queries (e.g., WHERE type = ?).
- **No In-Memory State**: Everything is stateless query execution. Services are thin: validate input (branded types), execute query in tx, return results.
- **Reliability/Fault Tolerance**: Retain idempotency (check DB for key before insert), outbox (DB table + poller for notifications), but simplify: events as DB inserts, polled by worker. Notifications via DB-triggered pub/sub (e.g., LISTEN/NOTIFY in Postgres) or external (Redis, but DB-first).
- **Performance**: Use Drizzle for zero-copy (direct row mapping to branded types), connection pooling, prepared statements. No caching layer if DB indexes suffice; if needed, DB-level (e.g., materialized views).
- **API Exposure**: CRUD via query wrappers (e.g., createAuction => INSERT returning id), supporting REST/gRPC/GraphQL by mapping to these queries.

## Tasks
- [x] 0.0 Research
  - [x] 0.1 identify different types of auctions that are used in the real-world (identified 13 types: English, Dutch, Sealed-bid, Reverse, Vickrey, Buy-it-now, Double, All-Pay, Japanese, Chinese, Penny, Multi-Unit, and Combinatorial auctions)
  - [x] 0.2 identify the database schema to hold the auction data and the bids for those auctions; 
  - [x] 0.3 identify the SQL queries required to determine the winner for each auction type; (Completed: Comprehensive SQL query designs created in docs/winner-determination-sql-queries.md)
  - [x] 0.4 decide how to expose this functionality as a reusable package that can be plugged and played in any project; This may need exposing certain CRUD API to create/manage the auctions and bids. Need to support REST, grpc and GraphQL interfaces; (Completed: Comprehensive package architecture design created in docs/0-4-architecture.md, featuring abstraction layers for database, API, and notification systems; supports CRUD APIs across REST, gRPC, and GraphQL interfaces; implements SOLID principles with dependency injection; provides unified configuration management and error handling strategy)
  - [x] 0.5 identify the layers needed to keep the code organized clean (preferably SOLID principles); Since we need to support different databases, different API interfaces, different notification types etc., we should have a DB abstraction layer, API abstraction layer, Notification abstraction layer etc., each supporting various different implementations (such as different databases, different API interfaces etc.);
  - [x] 0.6 Identify reusable patterns in the code and plan the helper methods, common interfaces, reusable types; (Completed: Comprehensive reusable patterns design created in docs/0-6-reusable-patterns.md, featuring common interfaces for auction operations, helper methods for lifecycle management, utility functions for bid validation, branded types for type safety, factory patterns for auction creation, strategy patterns for auction-specific logic, decorator patterns for cross-cutting concerns, and performance optimizations with zero-copy operations)
  - [x] 0.7 Identify all different branded types needed; (Completed: Comprehensive branded types design created in docs/0-7-branded-types.md, featuring 50+ branded types covering monetary values, temporal types, identification types, auction-specific types, business rules, notifications, and payment processing; eliminates primitive obsession and ensures type safety across all 13 auction types); 

- [x] 1.0 Core Infrastructure Setup
  - [x] 1.1 Review the research findings from the files in the `docs/` folder and use them for all further tasks and sub-tasks;
  - [x] 1.2 Set up basic project structure and configuration files based on the tech-stack and research findings;
  - [x] 1.3 Create core TypeScript types and interfaces for the auction system
  - [x] 1.4 Implement database abstraction layer supporting multiple SQL databases
  - [x] 1.5 Create core utilities and constants for the auction engine

- [ ] 2.0 Auction Management System
  - [ ] 2.1 Implement Drizzle query wrappers for auction factory: Parameterized INSERT into auctions table with branded types for inputs (TAuctionId, AuctionType, Money for prices); thin service for validation and tx execution with outbox insert for 'auction_created' event.
  - [ ] 2.2 Create SQL queries for English auction dynamics: ascending current price via MAX(bids.amount) WHERE auction_id=? AND type='english', time-based status via CASE on start_time/end_time/bids count; Drizzle wrapper in src/database/queries/english-queries.ts with branded outputs (Money for price, AuctionStatus).
  - [ ] 2.3 Create SQL queries for Dutch auction dynamics: descending current price via UPDATE auctions SET current_price = current_price - decrement WHERE type='dutch' AND status='active', status via CASE on bids acceptance; Drizzle wrapper in src/database/queries/dutch-queries.ts integrating idempotency check (SELECT before UPDATE) and outbox for price changes.
  - [ ] 2.4 Create SQL queries for sealed-bid auction dynamics: hidden bids via INSERT into bids with is_anonymous=true, reveal at end via SELECT * FROM bids WHERE auction_id=? AND type='sealed_bid' ORDER BY amount DESC after status='completed'; Drizzle wrapper in src/database/queries/sealed-bid-queries.ts with thin JS for tx and branded BidData outputs.
  - [ ] 2.5 Create SQL queries for reverse auction dynamics: lowest bid tracking via MIN(bids.amount) WHERE type='reverse', status via CASE on supplier bids; Drizzle wrapper in src/database/queries/reverse-queries.ts with validation service for amount < current_price and outbox for bid notifications.
  - [ ] 2.6 Create SQL queries for Vickrey auction dynamics: second-price calculation via subquery for second MAX(bids.amount), winner via highest bid; Drizzle wrapper in src/database/queries/vickrey-queries.ts using parameterized SQL from docs/0-3, thin service for tx update on auction end.
  - [ ] 2.7 Create SQL queries for buy-it-now auction dynamics: immediate win check via SELECT IF(amount >= buy_it_now_price, 'win', 'bid') on INSERT, status update to 'completed' if won; Drizzle wrapper in src/database/queries/buy-it-now-queries.ts with idempotency and outbox for purchase events.
  - [ ] 2.8 Create SQL queries for double auction dynamics: buyer/seller matching via CROSS JOIN on bids with bid_type='buyer'/'seller' WHERE buyer.amount >= seller.amount, equilibrium price avg; Drizzle wrapper in src/database/queries/double-queries.ts with branded matching results.
  - [ ] 2.9 Create SQL queries for all-pay auction dynamics: all bids payment via INSERT bids with status='paid', winner via MAX(amount); Drizzle wrapper in src/database/queries/all-pay-queries.ts integrating outbox for all payment events.
  - [ ] 2.10 Create SQL queries for Japanese auction dynamics: elimination rounds via UPDATE bids SET status='eliminated' WHERE amount < current_round_price, last active via COUNT(active)=1; Drizzle wrapper in src/database/queries/japanese-queries.ts with tx for round updates.
  - [ ] 2.11 Create SQL queries for Chinese auction dynamics: rapid price drops via scheduled UPDATE current_price, first acceptance via MIN(submitted_at) WHERE amount >= current_price; Drizzle wrapper in src/database/queries/chinese-queries.ts with poller trigger.
  - [ ] 2.12 Create SQL queries for penny auction dynamics: bid fees via INSERT bids with bid_fee_amount, time extension via UPDATE end_time = end_time + extension; Drizzle wrapper in src/database/queries/penny-queries.ts with idempotency and outbox for extensions.
  - [ ] 2.13 Create SQL queries for multi-unit auction dynamics: quantity allocation via SUM(quantity) OVER (ORDER BY amount DESC) <= available_quantity; Drizzle wrapper in src/database/queries/multi-unit-queries.ts using ROW_NUMBER for ranking.
  - [ ] 2.14 Create SQL queries for combinatorial auction dynamics: package bidding via JSON package_items, greedy winner via MAX(package_bid_amount); Drizzle wrapper in src/database/queries/combinatorial-queries.ts with validation for non-overlapping packages.
  - [ ] 2.15 Implement auction configuration management: INSERT/SELECT from auction_configurations table with JSON values, parameterized by auction_id; thin Drizzle service for validation using branded types and tx.
  - [ ] 2.16 Create auction lifecycle management: UPDATE auctions SET status=? WHERE id=? in tx, with outbox inserts for 'started'/'ended'/'cancelled'; Drizzle wrapper integrating status CASE queries and idempotency checks.

- [ ] 3.0 Business Rules Engine
  - [ ] 3.1 Design business rules configuration system: INSERT into rules table with JSON validation_rules, query via SELECT config_value FROM auction_configurations WHERE auction_id=? AND config_key='rules'; thin service for loading branded rule objects.
  - [ ] 3.2 Implement SQL validation for min bid: SELECT CASE WHEN amount < (SELECT min_increment FROM auctions WHERE id=?) THEN 'invalid' ELSE 'valid' END; Drizzle wrapper in src/database/queries/validation-queries.ts calling from thin JS validator with branded Money inputs.
  - [ ] 3.3 Implement SQL validation for maximum bids per user: SELECT COUNT(*) FROM bids WHERE auction_id=? AND user_id=? AND status='active' > max_bids; Drizzle query with parameterized limits, integrated in bid service tx.
  - [ ] 3.4 Implement SQL validation for bid retraction time limit: SELECT CASE WHEN submitted_at > NOW() - retraction_window THEN 'allowed' ELSE 'expired' END FROM bids WHERE id=?; Drizzle wrapper with outbox for retraction events.
  - [ ] 3.5 Implement SQL handling for reserve price: SELECT CASE WHEN MAX(amount) >= reserve_price THEN 'met' ELSE 'not_met' END FROM bids JOIN auctions; thin service querying in tx before status updates.
  - [ ] 3.6 Implement SQL for auction duration settings: UPDATE end_time = start_time + duration WHERE id=?; Drizzle wrapper with validation for overlaps and outbox notifications.
  - [ ] 3.7 Implement SQL for auto-extension rules: UPDATE end_time = end_time + extension_duration WHERE submitted_at > end_time - trigger_seconds AND extensions < max; Drizzle trigger or poller with tx.
  - [ ] 3.8 Create rules validation engine: Thin JS service orchestrating multiple SQL checks (JOIN auctions, bids, rules tables) with branded error outputs; integrate in all mutation tx via Drizzle.

- [ ] 4.0 Bid Processing System
  - [ ] 4.1 Implement bid submission query: INSERT INTO bids (auction_id, user_id, amount, idempotency_key) RETURNING id, with prior SELECT for idempotency; Drizzle wrapper in src/database/queries/bid-queries.ts using branded PlaceBidRequest, thin service for tx.
  - [ ] 4.2 Create real-time bid processing: Parameterized INSERT with DB locks (FOR UPDATE on auctions), status update via CASE; integrate outbox for 'bid_placed' in tx, polled for notifications.
  - [ ] 4.3 Implement concurrent bid handling: Serializable tx with SELECT FOR UPDATE on auctions/bids, SQL joins for validation (amount > MAX(bid) + increment); Drizzle service ensuring atomicity via tx isolation.
  - [ ] 4.4 Create immutable bid storage: INSERT into bids and bid_history with old/new values; Drizzle wrapper appending to history table without updates to bids.
  - [ ] 4.5 Implement bid retraction: UPDATE bids SET status='retracted' WHERE id=? AND submitted_at > retraction_deadline, INSERT to bid_retractions and outbox; Drizzle tx with validation query.
  - [ ] 4.6 Add comprehensive bid validation: SQL joins on auctions, bids, rules (e.g., SELECT IF(amount >= current_price + min_increment AND status='active', 'valid', 'invalid')); thin service calling multiple queries.
  - [ ] 4.7 Implement error handling for invalid bids: Tx rollback on validation fail, INSERT to rule_violations table; Drizzle service with branded error types and logging.

- [ ] 5.0 Winner Determination & Real-time Features
  - [ ] 5.1 Implement SQL-based winner determination queries for each auction type: Parameterized views/CASE from docs/0-3-winner-determination-sql-queries.md (e.g., English: ROW_NUMBER() OVER (ORDER BY amount DESC) =1); Drizzle wrappers in src/database/queries/winner-queries.ts with branded outputs.
  - [ ] 5.2 Create tie-breaking logic: Extend winner SQL with ORDER BY amount DESC, submitted_at ASC; Drizzle query handling multi-winners for multi-unit via LATERAL or aggregates.
  - [ ] 5.3 Implement atomic auction status updates: Tx UPDATE auctions SET status='completed', determine_winner query, INSERT outbox 'auction_ended'; Drizzle service ensuring consistency.
  - [ ] 5.4 Create real-time notification system for bid updates: INSERT to outbox on bid tx, DB poller queries unprocessed events every 100ms for pub/sub (LISTEN/NOTIFY or Redis).
  - [ ] 5.5 Implement WebSocket/SSE for live auction updates: Poller publishes to channels, adapters subscribe and push to connections; query outbox for replay on reconnect.
  - [ ] 5.6 Create API endpoints for auction status and winner information: Thin wrappers calling Drizzle queries (getStatus, determineWinner) with branded responses for REST/gRPC/GraphQL.
  - [ ] 5.7 Implement audit trail maintenance: INSERT to audit_trail on all tx (bids, auctions updates) with JSON payload; Drizzle triggers or service integration for immutability.
  - [ ] 5.8 Add performance monitoring: Query logging in Drizzle adapter, INSERT to system_events for metrics (tx duration, query plans); thin service exposing via API.