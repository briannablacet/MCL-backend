const Document = require('../models/Document');
const documentService = require('../services/documentService');
const AppError = require('../utils/appError');

exports.humanizeContent = async (req, res, next) => {
  try {
    const { content, parameters } = req.body;
    
    if (!content) {
      throw new AppError('Content is required', 400);
    }

    const document = await documentService.humanizeContent(req.user.id, content, parameters);
    
    res.status(200).json({
      status: 'success',
      data: {
        document
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.checkStyle = async (req, res, next) => {
  try {
    const { content, styleGuide } = req.body;
    
    if (!content) {
      throw new AppError('Content is required', 400);
    }

    const document = await documentService.checkStyle(req.user.id, content, styleGuide);
    
    res.status(200).json({
      status: 'success',
      data: {
        document
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.perfectProse = async (req, res, next) => {
  try {
    const { text, options } = req.body;
    
    if (!text) {
      throw new AppError('Text is required', 400);
    }

    const document = await documentService.perfectProse(req.user.id, text, options);
    
    res.status(200).json({
      status: 'success',
      data: {
        document
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.generateContent = async (req, res, next) => {
  try {
    // Get the raw request body
    const requestBody = req.body;
    
    // Extract common fields that exist in all requests
    const commonFields = {
      userId: req.user.id,
      contentType: requestBody.contentType || requestBody.data?.contentType,
      prompt: requestBody.prompt || requestBody.data?.prompt
    };

    // Pass the entire request body to the service layer
    const document = await documentService.generateContent(
      commonFields.userId,
      {
        ...commonFields,
        // Include the entire original request body for flexibility
        rawRequest: requestBody,
        // Explicitly pass parameters that might be nested
        parameters: requestBody.parameters || requestBody.data?.parameters || {}
      }
    );

    res.status(200).json({
      status: 'success',
      data: { document }
    });
  } catch (error) {
    next(error);
  }
};


exports.repurposeContent = async (req, res, next) => {
  try {
    const { content, sourceFormat, targetFormat, styleGuide, messaging } = req.body;
    
    if (!content || !sourceFormat || !targetFormat) {
      throw new AppError('Content, sourceFormat and targetFormat are required', 400);
    }

    const document = await documentService.repurposeContent(
      req.user.id,
      content,
      { sourceFormat, targetFormat, styleGuide, messaging }
    );
    
    res.status(200).json({
      status: 'success',
      data: {
        document
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.generateKeyword = async (req, res, next) => {
  try {

    const document = await documentService.generateKeywords(
      req.user.id,
      req.body,
    );
    
    res.status(200).json({
      status: 'success',
      document: document
      
    });
  } catch (error) {
    next(error);
  }
};
exports.getUserDocuments = async (req, res, next) => {
  try {
    const { type } = req.query;
    const query = { userId: req.user.id };
    
    if (type) {
      query.documentType = type;
    }

    const documents = await Document.find(query).sort({ createdAt: -1 });
    
    res.status(200).json({
      status: 'success',
      results: documents.length,
      data: {
        documents
      }
    });
  } catch (error) {
    next(error);
  }
};