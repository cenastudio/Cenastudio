import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requireStudioPlan } from "../middleware/planAccess.js";
import {
  listEquipment,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  getAvailability,
  listBookings,
  createBooking,
  cancelBooking,
} from "../controllers/equipmentController.js";

const router = Router();

router.use(authenticate, requireStudioPlan("equipmentInventory"));

router.get("/", listEquipment);
router.post("/", createEquipment);
router.patch("/:id", updateEquipment);
router.delete("/:id", deleteEquipment);
router.get("/:id/availability", getAvailability);
router.get("/:id/bookings", listBookings);
router.post("/:id/bookings", createBooking);
router.delete("/bookings/:id", cancelBooking);

export default router;
