/**
 * Tests for Dashboard Controller
 *
 * Test Coverage:
 * 1. GET /api/dashboard/stats
 * 2. GET /api/dashboard/finance-strip
 * 3. GET /api/dashboard/user-info
 * 4. Authentication
 * 5. Error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import * as dashboardController from '../dashboardController';

// Mock database
vi.mock('../../models/prisma', () => ({
  prisma: {
    project: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    client: {
      count: vi.fn(),
    },
    videoReview: {
      count: vi.fn(),
    },
    financialEntry: {
      aggregate: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
  shouldUsePrisma: vi.fn(() => true),
}));

vi.mock('../../models/db', () => ({
  db: {
    prepare: vi.fn(() => ({
      get: vi.fn(),
    })),
  },
}));

import { prisma } from '../../models/prisma';

describe('Dashboard Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });

    mockRequest = {
      user: { id: 1 },
    };

    mockResponse = {
      json: jsonMock,
      status: statusMock,
    };
  });

  describe('getDashboardStats', () => {
    it('should return dashboard statistics successfully', async () => {
      // Mock counts
      vi.mocked(prisma.project.count).mockResolvedValue(5);
      vi.mocked(prisma.client.count).mockResolvedValue(3);
      vi.mocked(prisma.videoReview.count).mockResolvedValue(7);

      await dashboardController.getDashboardStats(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          activeJobs: 5,
          clientsWaiting: 3,
          reviewsPending: 7,
        },
      });
    });

    it('should return 401 if user is not authenticated', async () => {
      mockRequest.user = undefined;

      await dashboardController.getDashboardStats(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized',
      });
    });

    it('should handle database errors', async () => {
      vi.mocked(prisma.project.count).mockRejectedValue(
        new Error('Database error')
      );

      await dashboardController.getDashboardStats(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to fetch dashboard statistics',
      });
    });

    it('should count active projects correctly', async () => {
      vi.mocked(prisma.project.count).mockResolvedValue(10);
      vi.mocked(prisma.client.count).mockResolvedValue(0);
      vi.mocked(prisma.videoReview.count).mockResolvedValue(0);

      await dashboardController.getDashboardStats(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(prisma.project.count).toHaveBeenCalledWith({
        where: {
          userId: BigInt(1),
          status: 'active',
        },
      });

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            activeJobs: 10,
          }),
        })
      );
    });

    it('should count clients waiting with correct criteria', async () => {
      vi.mocked(prisma.project.count).mockResolvedValue(0);
      vi.mocked(prisma.client.count).mockResolvedValue(5);
      vi.mocked(prisma.videoReview.count).mockResolvedValue(0);

      await dashboardController.getDashboardStats(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(prisma.client.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: BigInt(1),
            status: {
              in: ['lead', 'active', 'negotiation'],
            },
          }),
        })
      );

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            clientsWaiting: 5,
          }),
        })
      );
    });

    it('should count pending reviews correctly', async () => {
      vi.mocked(prisma.project.count).mockResolvedValue(0);
      vi.mocked(prisma.client.count).mockResolvedValue(0);
      vi.mocked(prisma.videoReview.count).mockResolvedValue(12);

      await dashboardController.getDashboardStats(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(prisma.videoReview.count).toHaveBeenCalledWith({
        where: {
          userId: BigInt(1),
          status: {
            in: ['draft', 'pending'],
          },
        },
      });

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reviewsPending: 12,
          }),
        })
      );
    });

    it('should handle zero counts', async () => {
      vi.mocked(prisma.project.count).mockResolvedValue(0);
      vi.mocked(prisma.client.count).mockResolvedValue(0);
      vi.mocked(prisma.videoReview.count).mockResolvedValue(0);

      await dashboardController.getDashboardStats(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          activeJobs: 0,
          clientsWaiting: 0,
          reviewsPending: 0,
        },
      });
    });
  });

  describe('getFinanceStrip', () => {
    it('should return finance statistics successfully', async () => {
      vi.mocked(prisma.financialEntry.aggregate).mockResolvedValue({
        _sum: { amount: 45000 },
        _avg: null,
        _count: null,
        _max: null,
        _min: null,
      });

      vi.mocked(prisma.project.count).mockResolvedValue(8);

      await dashboardController.getFinanceStrip(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          monthlyRevenue: 45000,
          jobsCompleted: 8,
        },
      });
    });

    it('should return 401 if user is not authenticated', async () => {
      mockRequest.user = undefined;

      await dashboardController.getFinanceStrip(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized',
      });
    });

    it('should handle null revenue', async () => {
      vi.mocked(prisma.financialEntry.aggregate).mockResolvedValue({
        _sum: { amount: null },
        _avg: null,
        _count: null,
        _max: null,
        _min: null,
      });

      vi.mocked(prisma.project.count).mockResolvedValue(0);

      await dashboardController.getFinanceStrip(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          monthlyRevenue: 0,
          jobsCompleted: 0,
        },
      });
    });

    it('should query revenue with correct date range', async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      );

      vi.mocked(prisma.financialEntry.aggregate).mockResolvedValue({
        _sum: { amount: 10000 },
        _avg: null,
        _count: null,
        _max: null,
        _min: null,
      });

      vi.mocked(prisma.project.count).mockResolvedValue(5);

      await dashboardController.getFinanceStrip(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(prisma.financialEntry.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: BigInt(1),
            kind: 'revenue',
            status: 'paid',
            paidAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        })
      );
    });

    it('should count completed projects in current month', async () => {
      vi.mocked(prisma.financialEntry.aggregate).mockResolvedValue({
        _sum: { amount: 0 },
        _avg: null,
        _count: null,
        _max: null,
        _min: null,
      });

      vi.mocked(prisma.project.count).mockResolvedValue(3);

      await dashboardController.getFinanceStrip(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(prisma.project.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: BigInt(1),
            status: 'completed',
            updatedAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        })
      );

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            jobsCompleted: 3,
          }),
        })
      );
    });

    it('should handle database errors', async () => {
      vi.mocked(prisma.financialEntry.aggregate).mockRejectedValue(
        new Error('Database error')
      );

      await dashboardController.getFinanceStrip(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to fetch finance statistics',
      });
    });
  });

  describe('getUserInfo', () => {
    it('should return user information successfully', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: BigInt(1),
        name: 'João Silva',
        email: 'joao@example.com',
        passwordHash: '',
        role: 'user',
        avatarUrl: null,
        emailVerified: false,
        githubId: null,
        supabaseId: null,
        studioName: null,
        studioRole: null,
        phone: null,
        createdAt: new Date(),
      });

      await dashboardController.getUserInfo(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          name: 'João Silva',
        },
      });
    });

    it('should return 401 if user is not authenticated', async () => {
      mockRequest.user = undefined;

      await dashboardController.getUserInfo(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized',
      });
    });

    it('should use email username if name is null', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: BigInt(1),
        name: null,
        email: 'test@example.com',
        passwordHash: '',
        role: 'user',
        avatarUrl: null,
        emailVerified: false,
        githubId: null,
        supabaseId: null,
        studioName: null,
        studioRole: null,
        phone: null,
        createdAt: new Date(),
      });

      await dashboardController.getUserInfo(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          name: 'test',
        },
      });
    });

    it('should return 404 if user not found', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await dashboardController.getUserInfo(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'User not found',
      });
    });

    it('should handle database errors', async () => {
      vi.mocked(prisma.user.findUnique).mockRejectedValue(
        new Error('Database error')
      );

      await dashboardController.getUserInfo(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to fetch user information',
      });
    });

    it('should query correct user ID', async () => {
      mockRequest.user = { id: 123 };

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: BigInt(123),
        name: 'Test User',
        email: 'test@test.com',
        passwordHash: '',
        role: 'user',
        avatarUrl: null,
        emailVerified: false,
        githubId: null,
        supabaseId: null,
        studioName: null,
        studioRole: null,
        phone: null,
        createdAt: new Date(),
      });

      await dashboardController.getUserInfo(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: {
          id: BigInt(123),
        },
        select: {
          name: true,
          email: true,
        },
      });
    });
  });

  describe('getActiveJobs', () => {
    it('should return active jobs with client information', async () => {
      const mockProjects = [
        {
          id: BigInt(1),
          userId: BigInt(1),
          clientId: BigInt(1),
          name: 'Product Launch Video',
          status: 'active',
          deadline: new Date('2024-12-31'),
          progress: 65,
          client: {
            name: 'Acme',
            company: 'Acme Corp',
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: BigInt(2),
          userId: BigInt(1),
          clientId: BigInt(2),
          name: 'Brand Campaign',
          status: 'active',
          deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
          progress: 30,
          client: {
            name: 'Tech Startup',
            company: null,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.project.findMany).mockResolvedValue(mockProjects as any);

      await dashboardController.getActiveJobs(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            title: expect.any(String),
            client: expect.any(String),
            status: expect.any(String),
            deadline: expect.any(String),
            daysLeft: expect.any(Number),
            progress: expect.any(Number),
            urgent: expect.any(Boolean),
          }),
        ]),
      });
    });

    it('should return 401 if user is not authenticated', async () => {
      mockRequest.user = undefined;

      await dashboardController.getActiveJobs(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized',
      });
    });

    it('should calculate daysLeft correctly', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const mockProjects = [
        {
          id: BigInt(1),
          userId: BigInt(1),
          clientId: null,
          name: 'Urgent Job',
          status: 'active',
          deadline: tomorrow,
          progress: 50,
          client: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.project.findMany).mockResolvedValue(mockProjects as any);

      await dashboardController.getActiveJobs(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: [
          expect.objectContaining({
            daysLeft: 1,
            urgent: true, // < 3 days
          }),
        ],
      });
    });

    it('should mark jobs as urgent if daysLeft < 3', async () => {
      const twoDaysFromNow = new Date();
      twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

      const mockProjects = [
        {
          id: BigInt(1),
          userId: BigInt(1),
          clientId: null,
          name: 'Urgent Job',
          status: 'active',
          deadline: twoDaysFromNow,
          progress: 50,
          client: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.project.findMany).mockResolvedValue(mockProjects as any);

      await dashboardController.getActiveJobs(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: [
          expect.objectContaining({
            urgent: true,
          }),
        ],
      });
    });

    it('should not mark jobs as urgent if daysLeft >= 3', async () => {
      const fourDaysFromNow = new Date();
      fourDaysFromNow.setDate(fourDaysFromNow.getDate() + 4);

      const mockProjects = [
        {
          id: BigInt(1),
          userId: BigInt(1),
          clientId: null,
          name: 'Normal Job',
          status: 'active',
          deadline: fourDaysFromNow,
          progress: 50,
          client: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.project.findMany).mockResolvedValue(mockProjects as any);

      await dashboardController.getActiveJobs(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: [
          expect.objectContaining({
            urgent: false,
          }),
        ],
      });
    });

    it('should handle jobs without deadline', async () => {
      const mockProjects = [
        {
          id: BigInt(1),
          userId: BigInt(1),
          clientId: null,
          name: 'Job Without Deadline',
          status: 'active',
          deadline: null,
          progress: 50,
          client: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.project.findMany).mockResolvedValue(mockProjects as any);

      await dashboardController.getActiveJobs(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: [
          expect.objectContaining({
            deadline: 'No deadline',
            daysLeft: 0,
            urgent: false,
          }),
        ],
      });
    });

    it('should handle jobs without client', async () => {
      const mockProjects = [
        {
          id: BigInt(1),
          userId: BigInt(1),
          clientId: null,
          name: 'Job Without Client',
          status: 'active',
          deadline: new Date('2024-12-31'),
          progress: 50,
          client: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.project.findMany).mockResolvedValue(mockProjects as any);

      await dashboardController.getActiveJobs(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: [
          expect.objectContaining({
            client: 'No Client',
          }),
        ],
      });
    });

    it('should return empty array if no active jobs', async () => {
      vi.mocked(prisma.project.findMany).mockResolvedValue([]);

      await dashboardController.getActiveJobs(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: [],
      });
    });

    it('should order jobs by deadline (ascending)', async () => {
      const soon = new Date();
      soon.setDate(soon.getDate() + 1);

      const later = new Date();
      later.setDate(later.getDate() + 10);

      const mockProjects = [
        {
          id: BigInt(2),
          userId: BigInt(1),
          clientId: null,
          name: 'Later Job',
          status: 'active',
          deadline: later,
          progress: 30,
          client: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: BigInt(1),
          userId: BigInt(1),
          clientId: null,
          name: 'Soon Job',
          status: 'active',
          deadline: soon,
          progress: 50,
          client: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.project.findMany).mockResolvedValue(mockProjects as any);

      await dashboardController.getActiveJobs(
        mockRequest as Request,
        mockResponse as Response
      );

      // Verify query was called with correct orderBy
      expect(prisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [
            { deadline: 'asc' },
            { createdAt: 'desc' },
          ],
        })
      );
    });

    it('should handle database errors', async () => {
      vi.mocked(prisma.project.findMany).mockRejectedValue(
        new Error('Database error')
      );

      await dashboardController.getActiveJobs(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to fetch active jobs',
      });
    });
  });
});
