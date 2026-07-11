import type { RequestHandler } from "express";
import { AppError } from "../middleware/errorHandler.js";
import * as equipmentService from "../services/equipmentService.js";

function parseId(value: string | undefined, label = "ID"): number {
  const id = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(id)) throw new AppError(`${label} inválido`, 400);
  return id;
}

export const listEquipment: RequestHandler = async (req, res, next) => {
  try {
    const items = await equipmentService.listEquipment(req.user!.id);
    res.json({ success: true, data: items });
  } catch (e) {
    next(e);
  }
};

export const createEquipment: RequestHandler = async (req, res, next) => {
  try {
    const { name, category, specs, costPerDay, isOwned } = req.body as {
      name?: string;
      category?: string;
      specs?: Record<string, string | number | boolean>;
      costPerDay?: number | null;
      isOwned?: boolean;
    };
    const created = await equipmentService.createEquipment(req.user!.id, {
      name: name ?? "",
      category: category ?? "",
      specs,
      costPerDay: costPerDay ?? null,
      isOwned,
    });
    res.status(201).json({ success: true, data: created });
  } catch (e) {
    next(e);
  }
};

export const updateEquipment: RequestHandler = async (req, res, next) => {
  try {
    const equipmentId = parseId(req.params.id);
    const updated = await equipmentService.updateEquipment(req.user!.id, equipmentId, req.body);
    res.json({ success: true, data: updated });
  } catch (e) {
    next(e);
  }
};

export const deleteEquipment: RequestHandler = async (req, res, next) => {
  try {
    const equipmentId = parseId(req.params.id);
    const deleted = await equipmentService.deleteEquipment(req.user!.id, equipmentId);
    if (!deleted) throw new AppError("Equipamento não encontrado", 404);
    res.json({ success: true, data: null });
  } catch (e) {
    next(e);
  }
};

export const getAvailability: RequestHandler = async (req, res, next) => {
  try {
    const equipmentId = parseId(req.params.id);
    const { start, end } = req.query as { start?: string; end?: string };
    if (!start || !end) throw new AppError("Parâmetros start e end são obrigatórios", 400);
    const available = await equipmentService.checkAvailability(req.user!.id, equipmentId, start, end);
    res.json({ success: true, data: { available } });
  } catch (e) {
    next(e);
  }
};

export const listBookings: RequestHandler = async (req, res, next) => {
  try {
    const equipmentId = parseId(req.params.id);
    const bookings = await equipmentService.listBookingsForEquipment(req.user!.id, equipmentId);
    res.json({ success: true, data: bookings });
  } catch (e) {
    next(e);
  }
};

export const createBooking: RequestHandler = async (req, res, next) => {
  try {
    const equipmentId = parseId(req.params.id);
    const { projectId, startDate, endDate } = req.body as {
      projectId?: number;
      startDate?: string;
      endDate?: string;
    };
    const booking = await equipmentService.createBooking(req.user!.id, {
      equipmentId,
      projectId: projectId ?? 0,
      startDate: startDate ?? "",
      endDate: endDate ?? "",
    });
    res.status(201).json({ success: true, data: booking });
  } catch (e) {
    next(e);
  }
};

export const cancelBooking: RequestHandler = async (req, res, next) => {
  try {
    const bookingId = parseId(req.params.id, "ID da reserva");
    const cancelled = await equipmentService.cancelBooking(req.user!.id, bookingId);
    if (!cancelled) throw new AppError("Reserva não encontrada", 404);
    res.json({ success: true, data: null });
  } catch (e) {
    next(e);
  }
};
