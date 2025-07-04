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
// POST /api/documents/keywords
router.post('/keywords', async (req, res) => {
  try {
    // Process the request and return keywords
    // ...
  } catch (error) {
    console.error('Error generating keywords:', error);
    res.status(500).json({ error: 'Failed to generate keywords' });
  }
});

router.post(
  '/humanize',
  authMiddleware.protect,
  contentHumanizerController.humanizeContent
);
// modify the content of the document
router.post(
  "/modify",
  authMiddleware.protect,
  documentController.modifyContent
);
// analize competitors 
router.post(
  "/competitors",
  authMiddleware.protect,
  documentController.analyzeCompetitors
);
// value-proposition-generator
router.post(
  "/value-proposition",
  authMiddleware.protect,
  documentController.generateValueProposition
);
// personal generator
router.post(
  "/personal-generator",
  authMiddleware.protect,
  documentController.generatePersonal
);

// lookup-keyword-volume
router.post(
  "/keyword-volume",
  authMiddleware.protect,
  documentController.lookupKeywordVolume
);

// generate-variations
router.post(
  "/variations",
  authMiddleware.protect,
  documentController.generateVariations
);
router.post(
  "/writing-style",
  authMiddleware.protect,
  documentController.setWritingStyle
);


// Document retrieval
router.get("/", authMiddleware.protect, documentController.getUserDocuments);
router.get(
  "/:id",
  authMiddleware.protect,
  documentController.getDocument
);
// Document deletion
router.delete(
  "/:id",
  authMiddleware.protect,
  documentController.deleteDocument
);
// Document update
router.patch(
  "/:id",
  authMiddleware.protect,
  documentController.updateDocument
);
router.get(
  "/writing-style",
  authMiddleware.protect,
  documentController.getWritingStyle
);

module.exports = router;
