import { afterEach, beforeEach, describe, expect, it, vi } from "bun:test";
import type { TAuctionId, TUserId } from "../../types/branded-types";
import { AuctionType } from "../../types/core-interfaces";
import { MaterializedViewName } from "../materialized-views";
import { WinnerQueries } from "./winner-queries";

// Mock the database and dependencies
const mockDb = {
	execute: vi.fn(),
	select: vi.fn(),
	from: vi.fn(),
	where: vi.fn(),
	orderBy: vi.fn(),
	limit: vi.fn(),
	innerJoin: vi.fn(),
};

const mockStoredProcedures = {
	determineWinner: vi.fn(),
};

const mockMaterializedViews = {
	createAllMaterializedViews: vi.fn(),
};

// Mock drizzle-orm
const mockRawSql = (strings: TemplateStringsArray, ...values: any[]) => ({
	strings,
	values,
});

// Setup mocks
vi.mock("../drizzle-adapter", () => ({
	db: mockDb,
}));

vi.mock("../stored-procedures", () => ({
	StoredProcedures: mockStoredProcedures,
}));

vi.mock("../materialized-views", () => ({
	MaterializedViews: mockMaterializedViews,
	MaterializedViewName,
}));

describe("WinnerQueries", () => {
	let winnerQueries: WinnerQueries;
	const mockAuctionId = "auction-id-123" as TAuctionId;
	const mockUserId = "user-id-123" as TUserId;

	beforeEach(() => {
		winnerQueries = new WinnerQueries();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("determineWinner", () => {
		it("should use materialized view for English auctions", async () => {
			// Mock materialized view exists
			mockDb.execute.mockResolvedValueOnce([{ exists: true }]);

			// Mock materialized view query result
			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						orderBy: vi.fn().mockReturnValue({
							limit: vi.fn().mockResolvedValueOnce([{ bidderId: mockUserId }]),
						}),
					}),
				}),
			});

			const result = await winnerQueries.determineWinner(
				mockAuctionId,
				AuctionType.ENGLISH,
			);

			expect(result).toBe(mockUserId);
			expect(mockDb.execute).toHaveBeenCalledWith(
				expect.stringContaining("SELECT EXISTS"),
			);
		});

		it("should use materialized view for Vickrey auctions", async () => {
			// Mock materialized view exists
			mockDb.execute.mockResolvedValueOnce([{ exists: true }]);

			// Mock materialized view query result
			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						orderBy: vi.fn().mockReturnValue({
							limit: vi.fn().mockResolvedValueOnce([{ bidderId: mockUserId }]),
						}),
					}),
				}),
			});

			const result = await winnerQueries.determineWinner(
				mockAuctionId,
				AuctionType.VICKREY,
			);

			expect(result).toBe(mockUserId);
		});

		it("should use materialized view for Multi-Unit auctions", async () => {
			// Mock materialized view exists
			mockDb.execute.mockResolvedValueOnce([{ exists: true }]);

			// Mock materialized view query result
			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						orderBy: vi.fn().mockReturnValue({
							limit: vi.fn().mockResolvedValueOnce([{ bidderId: mockUserId }]),
						}),
					}),
				}),
			});

			const result = await winnerQueries.determineWinner(
				mockAuctionId,
				AuctionType.MULTI_UNIT,
			);

			expect(result).toBe(mockUserId);
		});

		it("should fallback to stored procedure if materialized view fails", async () => {
			// Mock materialized view doesn't exist
			mockDb.execute.mockResolvedValueOnce([{ exists: false }]);

			// Mock stored procedure result
			mockStoredProcedures.determineWinner.mockResolvedValueOnce([
				{
					winner_id: mockUserId,
				},
			]);

			const result = await winnerQueries.determineWinner(
				mockAuctionId,
				AuctionType.ENGLISH,
			);

			expect(result).toBe(mockUserId);
			expect(mockStoredProcedures.determineWinner).toHaveBeenCalledWith(
				mockAuctionId.toString(),
			);
		});

		it("should fallback to original query if all else fails", async () => {
			// Mock materialized view doesn't exist
			mockDb.execute.mockResolvedValueOnce([{ exists: false }]);

			// Mock stored procedure fails
			mockStoredProcedures.determineWinner.mockRejectedValue(
				new Error("Procedure failed"),
			);

			// Mock base materialized view doesn't exist
			mockDb.execute.mockResolvedValueOnce([{ exists: false }]);

			// Mock fallback query result
			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					innerJoin: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							orderBy: vi.fn().mockReturnValue({
								limit: vi
									.fn()
									.mockResolvedValueOnce([{ bidderId: mockUserId }]),
							}),
						}),
					}),
				}),
			});

			const result = await winnerQueries.determineWinner(
				mockAuctionId,
				AuctionType.ENGLISH,
			);

			expect(result).toBe(mockUserId);
		});
	});

	describe("determineWinners", () => {
		it("should use materialized view for Multi-Unit auctions", async () => {
			// Mock auction type query
			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi
						.fn()
						.mockResolvedValueOnce([{ type: AuctionType.MULTI_UNIT }]),
				}),
			});

			// Mock materialized view exists
			mockDb.execute.mockResolvedValueOnce([{ exists: true }]);

			// Mock materialized view query result
			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						orderBy: vi.fn().mockReturnValue({
							limit: vi
								.fn()
								.mockResolvedValueOnce([
									{ bidderId: mockUserId, bidId: "bid-id-123" },
								]),
						}),
					}),
				}),
			});

			const result = await winnerQueries.determineWinners(mockAuctionId);

			expect(result.size).toBe(1);
			expect(result.get(mockUserId)).toBe("bid-id-123");
		});

		it("should use materialized view for Combinatorial auctions", async () => {
			// Mock auction type query
			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi
						.fn()
						.mockResolvedValueOnce([{ type: AuctionType.COMBINATORIAL }]),
				}),
			});

			// Mock materialized view exists
			mockDb.execute.mockResolvedValueOnce([{ exists: true }]);

			// Mock materialized view query result
			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						orderBy: vi.fn().mockReturnValue({
							limit: vi
								.fn()
								.mockResolvedValueOnce([
									{ bidderId: mockUserId, bidId: "bid-id-123" },
								]),
						}),
					}),
				}),
			});

			const result = await winnerQueries.determineWinners(mockAuctionId);

			expect(result.size).toBe(1);
			expect(result.get(mockUserId)).toBe("bid-id-123");
		});

		it("should fallback to original query if materialized view fails", async () => {
			// Mock auction type query
			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi
						.fn()
						.mockResolvedValueOnce([{ type: AuctionType.MULTI_UNIT }]),
				}),
			});

			// Mock materialized view doesn't exist
			mockDb.execute.mockResolvedValueOnce([{ exists: false }]);

			// Mock fallback query result
			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					innerJoin: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							orderBy: vi.fn().mockReturnValue({
								limit: vi
									.fn()
									.mockResolvedValueOnce([
										{ bidderId: mockUserId, id: "bid-id-123" },
									]),
							}),
						}),
					}),
				}),
			});

			const result = await winnerQueries.determineWinners(mockAuctionId);

			expect(result.size).toBe(1);
			expect(result.get(mockUserId)).toBe("bid-id-123");
		});
	});

	describe("performance monitoring", () => {
		it("should record performance metrics", async () => {
			// Mock materialized view exists
			mockDb.execute.mockResolvedValueOnce([{ exists: true }]);

			// Mock materialized view query result
			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						orderBy: vi.fn().mockReturnValue({
							limit: vi.fn().mockResolvedValueOnce([{ bidderId: mockUserId }]),
						}),
					}),
				}),
			});

			await winnerQueries.determineWinner(mockAuctionId, AuctionType.ENGLISH);

			const metrics = winnerQueries.getPerformanceMetrics();
			expect(metrics.has("determineWinner_english")).toBe(true);
			expect(metrics.get("determineWinner_english")?.count).toBe(1);
			expect(
				metrics.get("determineWinner_english")?.averageTime,
			).toBeGreaterThan(0);
		});
	});
});
