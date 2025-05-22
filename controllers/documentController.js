const Document = require('../models/Document');
const documentService = require('../services/documentService');
const AppError = require('../utils/appError');

exports.humanizeContent = async (req, res, next) => {
  try {
    const document = await documentService.humanizeContent(req.user.id, req.body, parameters);
    
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
    const document = await documentService.checkStyle(req.user.id, req.body, styleGuide);
    
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

    const document = await documentService.perfectProse(req.user.id, req.body, options);
    
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

    const documents = await documentService.getUserDocuments(userId, query);
    
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

exports.modifyContent = async (req, res, next) => {
  try {
    const { data } = req.body;

    const document = await documentService.modifyContent(req.user.id, data); 

    return res.status(200).json({
      status: 'success',
      ...document // or `data: { document }`, depending on your frontend expectations
    });
  } catch (error) {
    next(error);
  }
};



exports.analyzeCompetitors = async (req, res, next) => {
  try {

    const document = await documentService.analyzeCompetitors(req.user.id, req.body.data);
    
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

exports.generateValueProposition = async (req, res, next) => {
  try {

    const document = await documentService.generateValueProposition(req.user.id, req.body);
    
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

exports.generatePersonal = async (req, res, next) => {
  try {

    const document = await documentService.generatePersonal(req.user.id, req.body);
    
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

exports.lookupKeywordVolume = async (req, res, next) => {
  try {
    const { keywords } = req.body;
    
    if (!keywords) {
      throw new AppError('Keywords are required', 400);
    }

    const document = await documentService.lookupKeywordVolume(req.user.id, keywords);
    
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

exports.generateVariations = async (req, res, next) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      throw new AppError('Content is required', 400);
    }

    const document = await documentService.generateVariations(req.user.id, content);
    
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

exports.deleteDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      throw new AppError('Document ID is required', 400);
    }

    await documentService.deleteDocument(req.user.id, id);
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

exports.updateDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    
    if (!id || !content) {
      throw new AppError('Document ID and content are required', 400);
    }

    const document = await documentService.updateDocument(req.user.id, id, content);
    
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

exports.getDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      throw new AppError('Document ID is required', 400);
    }

    const document = await documentService.getDocument(req.user.id, id);
    
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

