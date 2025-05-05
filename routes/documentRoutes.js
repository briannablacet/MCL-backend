const express = require("express");
const router = express.Router();
const documentController = require("../controllers/documentController");
const authMiddleware = require("../middleware/authMiddleware");
const contentHumanizerController = require('../controllers/contentHumanizerController');


// Document processing endpoints
router.post(
  "/humanize",
  authMiddleware.protect,
  documentController.humanizeContent
);
router.post(
  "/check-style",
  authMiddleware.protect,
  documentController.checkStyle
);
router.post(
  "/perfect-prose",
  authMiddleware.protect,
  documentController.perfectProse
);
router.post(
  "/generate",
  authMiddleware.protect,
  documentController.generateContent
);
router.post(
  "/repurpose",
  authMiddleware.protect,
  documentController.repurposeContent
);
router.post(
  "/keywords",
  authMiddleware.protect,
  documentController.generateKeyword
);
router.post(
  '/humanize',
  authMiddleware.protect,
  contentHumanizerController.humanizeContent
);

// Document retrieval
router.get("/",authMiddleware.protect, documentController.getUserDocuments);

module.exports = router;
