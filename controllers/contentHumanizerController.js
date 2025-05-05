const contentHumanizerService = require('../services/contentHumanaizerService');
const AppError = require('../utils/appError');

exports.humanizeContent = async (req, res, next) => {
  try {
    const { content, parameters } = req.body;
    const userId = req.user.id; // Extracted from JWT

    const result = await contentHumanizerService.humanizeContent(
      userId,
      content,
      parameters
    );

    res.status(200).json({
      status: 'success',
      data: {
        humanizedContent: result.humanizedContent,
        changes: result.changes,
        scores: result.scores
      }
    });
  } catch (error) {
    next(error);
  }
};