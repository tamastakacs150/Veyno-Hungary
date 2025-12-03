// server/routes/returns.js
import express from "express";
import ReturnRequest from "../models/ReturnRequest.js";
import Order from "../models/Order.js";
import User from "../models/User.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// minden visszaküldés csak belépett usernek
router.use(authMiddleware);

/**
 * POST /api/returns
 * Body: { orderId, reason }
 */
router.post("/", async (req, res) => {
  try {
    const { orderId, reason } = req.body || {};
    if (!orderId) {
      return res.status(400).json({ msg: "orderId is required." });
    }
    
    // 1. Lépés: Felhasználó e-mail címének lekérése
    const user = await User.findById(req.userId).select("email");
    if (!user) {
        return res.status(401).json({ msg: "Unauthorized." });
    }

    // 2. Lépés: Rendelés keresése user ID VAGY e-mail cím alapján
    // csak a SAJÁT rendelésére nyithat returnt
    const order = await Order.findOne({ 
        _id: orderId, 
        $or: [
            { userId: req.userId },
            { "customer.email": user.email }
        ],
    });
    
    if (!order) {
      return res.status(404).json({ msg: "Order not found." });
    }

    // (opcionális) pl. 30 napos visszaküldési limit
    const THIRTY_DAYS = 1000 * 60 * 60 * 24 * 30;
    if (Date.now() - new Date(order.createdAt).getTime() > THIRTY_DAYS) {
      return res
        .status(400)
        .json({ msg: "Return period has expired for this order." });
    }

    // ne lehessen egy rendelésre egyszerre több aktív return
    const active = await ReturnRequest.findOne({
      order: order._id,
      status: { $in: ["pending", "approved", "received", "refunded"] },
    });

    if (active) {
      return res
        .status(400)
        .json({ msg: "You already have an active return request for this order." });
    }

    const created = await ReturnRequest.create({
      order: order._id,
      user: req.userId,
      reason: reason || "",
      status: "pending",
    });

    return res.status(201).json({
      msg: "Return request created successfully.",
      returnRequest: created,
    });
  } catch (err) {
    console.error("Create return error:", err);
    return res.status(500).json({ msg: "Failed to create return request." });
  }
});

router.get("/check/:orderId", async (req, res) => {
    try {
        const orderId = req.params.orderId;
        
        // Először meg kell győződni, hogy a rendelés a felhasználóhoz tartozik (az új, robusztus logikával)
        const user = await User.findById(req.userId).select("email");
        if (!user) {
            return res.status(401).json({ msg: "Unauthorized." });
        }

        const order = await Order.findOne({ 
            _id: orderId, 
            $or: [
                { userId: req.userId },
                { "customer.email": user.email }
            ],
        });
        
        if (!order) {
            return res.status(404).json({ msg: "Order not found." });
        }

        const active = await ReturnRequest.findOne({
            order: order._id,
            status: { $in: ["pending", "approved", "received", "refunded"] },
        });

        return res.json({ hasActiveReturn: !!active, returnStatus: active?.status || null });
    } catch (err) {
        console.error("Check return status error:", err);
        return res.status(500).json({ msg: "Failed to check return status." });
    }
});

/**
 * GET /api/returns/my
 * A user saját returnjei
 */
router.get("/my", async (req, res) => {
  try {
    const list = await ReturnRequest.find({ user: req.userId })
      .populate("order", "orderNumber totalAmount displayCurrency status createdAt")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ items: list });
  } catch (err) {
    console.error("List my returns error:", err);
    return res.status(500).json({ msg: "Failed to load return requests." });
  }
});

export default router;
