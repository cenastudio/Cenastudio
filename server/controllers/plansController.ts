import type { RequestHandler } from "express";
import { prisma, shouldUsePrisma } from "../models/prisma.js";
import { db } from "../models/db.js";

export const listPlans: RequestHandler = async (_req, res, next) => {
  try {
    if (shouldUsePrisma) {
      const plans = await prisma.plan.findMany({
        orderBy: { priceBrl: "asc" },
      });

      return res.json({
        success: true,
        data: plans.map(plan => ({
          ...plan,
          price_brl: plan.priceBrl,
          generation_limit: plan.generationLimit,
        })),
      });
    } else {
      const plans = db
        .prepare("SELECT * FROM plans ORDER BY price_brl ASC")
        .all();

      return res.json({
        success: true,
        data: plans,
      });
    }
  } catch (error) {
    next(error);
  }
};

export const getPlan: RequestHandler = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (shouldUsePrisma) {
      const plan = await prisma.plan.findUnique({
        where: { id },
      });

      if (!plan) {
        return res.status(404).json({
          success: false,
          error: "Plan not found",
        });
      }

      return res.json({
        success: true,
        data: {
          ...plan,
          price_brl: plan.priceBrl,
          generation_limit: plan.generationLimit,
        },
      });
    } else {
      const plan = db
        .prepare("SELECT * FROM plans WHERE id = ?")
        .get(id);

      if (!plan) {
        return res.status(404).json({
          success: false,
          error: "Plan not found",
        });
      }

      return res.json({
        success: true,
        data: plan,
      });
    }
  } catch (error) {
    next(error);
  }
};
