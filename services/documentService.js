const Document = require("../models/Document");
const openai = require("../utils/openaiClient");
const logger = require("../config/logger");

class DocumentService {
  constructor() {
    this.systemMessages = {
      humanizer:
        "You are an expert editor who specializes in making AI-generated content sound like it was written by a thoughtful human being.",
      styleChecker:
        "You are an expert editor with decades of experience in enforcing style guide compliance.",
      prosePerfector:
        "You are an expert editor with decades of experience in professional editing.",
      contentGenerator:
        "You are an expert content creator specializing in creating high-quality content.",
      contentRepurposer:
        "You are an expert content strategist who specializes in repurposing content across different formats.",
      keywordGenerator:
        "You are an SEO expert specialized in keyword research.",
    };
    // Define valid document types
    this.DOCUMENT_TYPES = {
      GENERATED: "generated",
      HUMANIZED: "humanized",
      STYLE_CHECKED: "style-checked",
      REPURPOSED: "repurposed",
      KEYWORD_RESEARCH: "keyword-research",
    };
  }

  async humanizeContent(userId, content, parameters = {}) {
    const prompt = this._buildHumanizerPrompt(content, parameters);
    const response = await openai.createCompletion(
      prompt,
      this.systemMessages.humanizer
    );
    const result = await openai.parseJSONResponse(response);

    return this._saveDocument(userId, {
      originalContent: content,
      processedContent: result.content,
      documentType: "humanized",
      metadata: parameters,
      stats: {
        humanityScore: result.humanityScore || 85,
        readabilityScore: result.readabilityScore || 85,
      },
    });
  }

  async checkStyle(userId, content, styleGuide = {}) {
    const prompt = this._buildStyleCheckerPrompt(content, styleGuide);
    const response = await openai.createCompletion(
      prompt,
      this.systemMessages.styleChecker,
      { temperature: 0.3 }
    );
    const result = await openai.parseJSONResponse(response);

    return this._saveDocument(userId, {
      originalContent: content,
      processedContent: content, // Original content since we're just checking
      documentType: "style-checked",
      metadata: { styleGuide },
      stats: {
        compliance: result.compliance || 75,
        issues: result.issues || [],
      },
    });
  }

  async perfectProse(userId, text, options = {}) {
    const prompt = this._buildProsePerfectorPrompt(text, options);
    const response = await openai.createCompletion(
      prompt,
      this.systemMessages.prosePerfector
    );
    const result = await openai.parseJSONResponse(response);

    return this._saveDocument(userId, {
      originalContent: text,
      processedContent: result.enhancedText,
      documentType: "generated",
      metadata: options,
      stats: result.stats || {},
    });
  }
  async _generateContentWithAI(contentType, promptData) {
    const prompt = this._buildContentGeneratorPrompt(contentType, promptData);
    const response = await openai.createCompletion(
      prompt,
      this.systemMessages.contentGenerator
    );

    try {
      // First try to parse as pure JSON
      const parsed = JSON.parse(response);
      if (parsed.content) {
        return parsed.content;
      }
      return response; // Fallback to raw response if no content field
    } catch (e) {
      // If not valid JSON, check for markdown code block
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          return parsed.content || jsonMatch[1];
        } catch (e) {
          return response; // Final fallback to raw response
        }
      }
      return response; // Return raw response if all parsing fails
    }
  }
  async generateContent(userId, input) {
    try {
      // Destructure with defaults for optional fields
      const {
        contentType,
        prompt,
        parameters = {},
        rawRequest = {},
        templateId,
        variables,
      } = input;

      // Validate required fields
      if (!contentType) {
        throw new Error("contentType is required");
      }

      // Extract parameters with fallbacks
      const {
        audience = "",
        tone = "professional",
        keywords = [],
        additionalNotes = "",
        ...otherParams // Capture any additional parameters
      } = parameters;

      // Prepare content generation data
      const generationData = {
        contentType,
        prompt,
        audience,
        tone,
        keywords,
        additionalNotes,
        // Include any other parameters that might be needed
        ...otherParams,
      };

      // Generate content - pass the complete data object
      const generatedContent = await this._generateContentWithAI(
        contentType,
        generationData
      );

      const finalContent =
        generatedContent || "Content generation failed - please try again";

      // Prepare document metadata - include the complete raw request for reference
      const document = await this._saveDocument(userId, {
        originalContent: prompt,
        processedContent: finalContent,
        documentType: "generated",
        metadata: {
          contentType,
          requestData: rawRequest, // Store complete request for debugging
          parameters: {
            audience,
            tone,
            keywords,
            additionalNotes,
            ...otherParams,
          },
          // Include template info if available
          ...(templateId && { templateId, variables }),
        },
      });

      return document;
    } catch (error) {
      logger.error(`Content generation failed: ${error.message}`, {
        input, // Log complete input for debugging
        stack: error.stack,
      });
      throw error;
    }
  }

  async repurposeContent(userId, content, repurposeData) {
    const prompt = this._buildRepurposePrompt(content, repurposeData);
    const response = await openai.createCompletion(
      prompt,
      this.systemMessages.contentRepurposer
    );
    const result = await openai.parseJSONResponse(response);

    return this._saveDocument(userId, {
      originalContent: content,
      processedContent: result.repurposedContent,
      documentType: "repurposed",
      metadata: repurposeData,
      stats: result.contentStats || {},
    });
  }

  async generateKeywords(userId, requestBody) {
    try {
      // Extract context from the request body structure
      const context = requestBody.data?.context;
      if (!context) {
        throw new Error("Missing context in request body");
      }

      // Generate the prompt
      const prompt = this._buildKeywordPrompt(context);

      // Call OpenAI API
      const response = await openai.createCompletion(
        prompt,
        this.systemMessages.keywordGenerator,
        { temperature: 0.7 }
      );

      // Parse the response
      let keywordData = this._parseKeywordResponse(response);

      // Save the document
      this._saveDocument(userId, {
        originalContent: JSON.stringify(context),
        processedContent: JSON.stringify(keywordData),
        documentType: this.DOCUMENT_TYPES.KEYWORD_RESEARCH,
        metadata: {
          context,
          keywordData,
          generationType: "keyword-research",
          requestBody: requestBody,
        },
      });
      console.log("Keyword data saved:", keywordData);
      return keywordData;
    } catch (error) {
      logger.error("Keyword generation failed:", error);

      // Return fallback keywords if generation fails
      const fallbackKeywords = this._getFallbackKeywords(
        requestBody.data?.context
      );
      return this._saveDocument(userId, {
        originalContent: JSON.stringify(requestBody.data?.context || {}),
        processedContent: JSON.stringify(fallbackKeywords),
        documentType: this.DOCUMENT_TYPES.KEYWORD_RESEARCH,
        metadata: {
          context: requestBody.data?.context || {},
          keywordData: fallbackKeywords,
          isFallback: true,
          generationType: "keyword-research",
          error: error.message,
        },
      });
    }
  }

  async _saveDocument(userId, documentData) {
    try {
      const document = await Document.create({
        userId,
        ...documentData,
      });
      return document;
    } catch (error) {
      logger.error(`Failed to save document: ${error.message}`);
      throw error;
    }
  }

  _buildHumanizerPrompt(content, parameters) {
    return `As an expert editor specializing in humanizing AI-generated or overly formal content, enhance the following text to sound more naturally human.

Text: ${content}

Apply these humanization techniques:
${parameters.clicheRemoval ? "- Remove AI clichés and robotic phrasing\n" : ""}
${parameters.addContractions ? "- Add natural contractions where appropriate\n" : ""}
${parameters.addPersonality ? "- Incorporate a warmer, more personable tone\n" : ""}
${parameters.formality ? `- Adjust formality level to be ${parameters.formality}\n` : ""}

Additional humanization principles:
- Replace robotic transitions ("it is important to note," "as mentioned earlier")
- Vary sentence structure to create a more natural rhythm
- Use more conversational connectors ("so," "actually," "though," etc. where appropriate)
- Add natural discourse markers humans use when speaking or writing
- Incorporate tasteful idioms and colloquialisms where appropriate
- Replace generic words with more specific, vivid alternatives
- Follow ${parameters.styleGuide || "Chicago Manual of Style"} for punctuation and formatting
- Ensure the content sounds like it was written by a thoughtful human expert
- Maintain the original meaning and expertise level while making it sound more natural

Typography improvements:
- Use proper em dashes (—) instead of hyphens or double hyphens
- Use en dashes (–) for ranges
- Use true quotation marks (" ") rather than straight quotes
- Use proper ellipses (…) rather than three periods
- Ensure proper spacing after punctuation

Return your response as a JSON string with these fields:
{
  "content": "the humanized text",
  "changes": [
    {
      "original": "original text segment",
      "modified": "modified text segment",
      "reason": "reason for change"
    }
  ],
  "humanityScore": 85,
  "readabilityScore": 90
}`;
  }

  _buildStyleCheckerPrompt(content, styleGuide) {
    return `As an expert editor specializing in style guide compliance, analyze the following text for adherence to style guidelines:

Text to analyze:
${content}

Style Guide: ${styleGuide.guide || "Chicago Manual of Style"}

Formatting Guidelines:
${JSON.stringify(styleGuide.formatting || {}, null, 2)}

Punctuation Rules:
${JSON.stringify(styleGuide.punctuation || {}, null, 2)}

Prohibited Terms/Phrases:
${JSON.stringify(styleGuide.prohibited || [], null, 2)}

Required Conventions:
${JSON.stringify(styleGuide.required || [], null, 2)}

Please analyze the text and provide a detailed compliance report. Focus exclusively on identifying violations of the style guide and formatting issues.

Return the analysis as a JSON object with these fields:
{
  "compliance": 75, // Overall compliance score (0-100)
  "issues": [
    {
      "type": "CAPITALIZATION", // Category of issue (CAPITALIZATION, PUNCTUATION, FORMATTING, GRAMMAR, TERMINOLOGY)
      "text": "the exact text with the issue",
      "suggestion": "specific correction that would fix the issue",
      "severity": "high" // high, medium, or low
    }
  ],
  "strengths": [
    "Areas where the text adheres well to the style guide"
  ]
}`;
  }

  _buildProsePerfectorPrompt(text, options) {
    return `As a professional editor with expertise matching ${options.styleGuide || "Chicago Manual of Style"} guidelines, enhance the following text:

Text: ${text}

Apply these professional editing standards:
${options.improveClarity ? "- Improve clarity and readability\n" : ""}
${options.enhanceEngagement ? "- Enhance engagement\n" : ""}
${options.adjustFormality ? `- Adjust formality level to be ${options.formalityLevel}\n` : ""}

Additional editing principles:
- Remove all unnecessary words and redundancies
- Convert passive constructions to active voice
- Use shorter, more declarative sentences where appropriate
- Vary sentence structure for better rhythm and flow
- Follow ${options.styleGuide || "Chicago Manual of Style"} guidelines
- Ensure proper parallel structure in lists and series
- Replace vague terms with specific, concrete language

Return response as JSON with these fields:
1. enhancedText: the professionally edited version
2. suggestions: array of improvement objects with {original, suggestion, reason, type}  
3. stats: object with readabilityScore, passiveVoiceCount, averageSentenceLength, etc.`;
  }

  _buildContentGeneratorPrompt(contentType, promptData) {
    return `You are an expert content creator specializing in ${contentType} content.
    
  ## Instructions:
  1. Create high-quality ${contentType} content based on the following parameters:
  ${promptData.prompt ? `- Primary Prompt: ${promptData.prompt}\n` : ""}
  ${promptData.audience ? `- Target Audience: ${promptData.audience}\n` : ""}
  ${promptData.keywords ? `- Keywords: ${Array.isArray(promptData.keywords) ? promptData.keywords.join(", ") : promptData.keywords}\n` : ""}
  ${promptData.tone ? `- Tone: ${promptData.tone}\n` : "- Tone: professional\n"}
  ${promptData.additionalNotes ? `- Additional Notes: ${promptData.additionalNotes}\n` : ""}
  
  2. Structure the content with appropriate headings and paragraphs
  3. Ensure the content is original and valuable to the target audience
  
  ## Response Format:
  Please return ONLY the generated content text. Do not include any additional formatting, headers, or JSON wrappers.
  
  ## Generated Content:`;
  }

  _buildRepurposePrompt(content, repurposeData) {
    return `Repurpose the following content from ${repurposeData.sourceFormat} format to ${repurposeData.targetFormat} format:
    
Content to repurpose:
${content}

${repurposeData.styleGuide ? `Style Guide: ${JSON.stringify(repurposeData.styleGuide)}` : ""}
${repurposeData.messaging ? `Messaging Framework: ${JSON.stringify(repurposeData.messaging)}` : ""}

Please transform this content completely to match the new format while maintaining the core message.
Return your response as JSON with the following structure:
{
  "repurposedContent": "The transformed content in the new format",
  "contentStats": {
    "originalLength": 1500,
    "newLength": 500,
    "readabilityScore": 85
  }
}`;
  }

  _parseKeywordResponse(response) {
    try {
      // First try direct JSON parse
      return JSON.parse(response);
    } catch (e) {
      // If direct parse fails, try extracting from markdown code block
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      throw new Error("Invalid keyword response format");
    }
  }

  _parseKeywordResponse(response) {
    try {
      // First try direct JSON parse
      const parsed = JSON.parse(response);
      if (parsed.primaryKeywords && parsed.secondaryKeywords) {
        return parsed;
      }
      throw new Error("Invalid keyword structure");
    } catch (e) {
      // If direct parse fails, try extracting from markdown code block
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          if (parsed.primaryKeywords && parsed.secondaryKeywords) {
            return parsed;
          }
        } catch (parseError) {
          logger.error("Failed to parse keyword response:", parseError);
        }
      }
      throw new Error("Invalid keyword response format");
    }
  }

  _buildKeywordPrompt(context) {
    // Extract data from context with proper fallbacks
    const topicText =
      context.topic ||
      (Array.isArray(context.messages)
        ? context.messages.join(". ")
        : context.messages) ||
      "content marketing";

    const audienceText = Array.isArray(context.personas)
      ? context.personas.join(", ")
      : context.personas || "marketing professionals";

    const contentTypeText = context.contentType || "blog post";

    return `Generate comprehensive SEO keywords for the following content requirements:
    
Content Topic: ${topicText}
Target Audience: ${audienceText}
Content Type: ${contentTypeText}

Please provide:
1. 5-7 primary keywords (most important, high-value keywords)
2. 8-10 secondary keywords (supporting terms, long-tail variations)
3. 3-4 keyword groups (thematic clusters of related keywords)

Format your response as valid JSON with these exact fields:
{
  "primaryKeywords": ["keyword1", "keyword2"],
  "secondaryKeywords": ["keyword1", "keyword2"],
  "keywordGroups": [
    {
      "category": "group name",
      "keywords": ["keyword1", "keyword2"]
    }
  ]
}

Ensure the response contains only valid JSON that can be parsed directly.`;
  }

  _getFallbackKeywords(context = {}) {
    // Context-aware fallback keywords
    const baseKeywords = {
      primaryKeywords: [
        "content marketing",
        "blog post",
        "content creation",
        "digital marketing",
        "SEO content",
      ],
      secondaryKeywords: [
        "content strategy",
        "blogging tips",
        "content calendar",
        "content optimization",
        "audience engagement",
        "content distribution",
        "lead generation",
        "brand awareness",
      ],
      keywordGroups: [
        {
          category: "Content Types",
          keywords: ["blog posts", "articles", "guides", "tutorials"],
        },
        {
          category: "Marketing Goals",
          keywords: [
            "lead generation",
            "brand awareness",
            "engagement",
            "conversions",
          ],
        },
        {
          category: "SEO",
          keywords: ["keyword research", "on-page SEO", "backlinks", "ranking"],
        },
      ],
    };

    // Add context-specific keywords if available
    if (context.topic) {
      const topicKeywords = context.topic
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3);
      baseKeywords.primaryKeywords = [
        ...new Set([...topicKeywords, ...baseKeywords.primaryKeywords]),
      ];
    }

    if (context.contentType) {
      baseKeywords.keywordGroups[0].keywords.unshift(
        context.contentType.toLowerCase()
      );
    }

    return baseKeywords;
  }

  async lookupKeywordVolume(userId, keyword) {
    const prompt = this._buildKeywordVolumePrompt(keyword);
    const response = await openai.createCompletion(
      prompt,
      this.systemMessages.keywordGenerator
    );
    const result = await openai.parseJSONResponse(response);

    return this._saveDocument(userId, {
      originalContent: keyword,
      processedContent: result.volumeData,
      documentType: "keyword-volume",
      metadata: { keyword },
      stats: result.stats || {},
    });
  }

  _buildKeywordVolumePrompt(keyword) {
    return `Generate keyword volume data for the following keyword:
Keyword: ${keyword}
Please provide:
1. Monthly search volume
2. Competition level (high, medium, low)
3. CPC (Cost Per Click) estimate
4. Related keywords
5. Suggested content ideas
6. Audience demographics
7. Seasonal trends
8. Historical search volume data
9. SERP analysis (top-ranking pages, featured snippets)
10. Keyword difficulty score
Format your response as valid JSON with these fields:
{
  "searchVolume": 1000,
  "competitionLevel": "medium",
  "cpc": 1.50,
  "relatedKeywords": ["keyword1", "keyword2"],
  "contentIdeas": ["idea1", "idea2"],
  "audienceDemographics": {
    "age": [18, 24],
    "location": ["USA", "Canada"]
  },
  "seasonalTrends": {
    "highSeason": ["January", "February"],
    "lowSeason": ["July", "August"]
  },
  "historicalData": {
    "lastYearVolume": [800, 1200],
    "twoYearsAgoVolume": [600, 900]
  },
  "serpAnalysis": {
    "topPages": ["url1", "url2"],
    "featuredSnippets": ["snippet1", "snippet2"]
  },
  "difficultyScore": 35
}`;
  }

  async generateVariations(userId, content, parameters = {}) {
    const prompt = this._buildVariationsPrompt(content, parameters);
    const response = await openai.createCompletion(
      prompt,
      this.systemMessages.contentGenerator
    );
    const result = await openai.parseJSONResponse(response);

    return this._saveDocument(userId, {
      originalContent: content,
      processedContent: result.variations,
      documentType: "generated",
      metadata: parameters,
      stats: result.stats || {},
    });
  }

  _buildVariationsPrompt(content, parameters) {
    return `Generate variations of the following content:
Content: ${content}
Parameters:
- Tone: ${parameters.tone || "professional"}
- Audience: ${parameters.audience || "general"}
- Keywords: ${parameters.keywords ? parameters.keywords.join(", ") : ""}
- Additional Notes: ${parameters.additionalNotes || ""}
Return the variations as a JSON array of strings.
Ensure the variations maintain the original meaning but vary in wording, structure, and style.
Return the variations as a JSON array of strings.
Example:
[
  "Variation 1",
  "Variation 2",
  "Variation 3"
]`;
  }
  async analyzeCompetitors(userId, content, parameters = {}) {
    const prompt = this._buildCompetitorAnalysisPrompt(content, parameters);
    const response = await openai.createCompletion(
      prompt,
      this.systemMessages.contentGenerator
    );
    const result = await openai.parseJSONResponse(response);

    return this._saveDocument(userId, {
      // stringify the content to ensure it's stored as a string
      originalContent: JSON.stringify(content),
      processedContent: result.analysis,
      documentType: "competitor-analysis",
      metadata: parameters,
      stats: result.stats || {},
    });
  }
  _buildCompetitorAnalysisPrompt(content, parameters) {
    return `Analyze the following content for competitor insights:
Content: ${content}
Parameters:
- Tone: ${parameters.tone || "professional"}
- Audience: ${parameters.audience || "general"}
- Keywords: ${parameters.keywords ? parameters.keywords.join(", ") : ""}
- Additional Notes: ${parameters.additionalNotes || ""}
Return the analysis as a JSON object with these fields:
{
  "analysis": "detailed competitor insights",
  "stats": {
    "competitorStrengths": [],
    "competitorWeaknesses": [],
    "opportunities": []
  }
}`;
  }
  
  async generateValueProposition(userId, content, parameters = {}) {

    const prompt = this._buildValuePropositionPrompt(content);
    const response = await openai.createCompletion(
      prompt,
      this.systemMessages.contentGenerator
    );
    const result = await openai.parseJSONResponse(response);


    return this._saveDocument(userId, {
      originalContent: JSON.stringify(content),
      processedContent: result.valueProposition,
      documentType: "value-proposition",
      metadata: parameters,
      stats: result.stats || {},
    });
  }
  _buildValuePropositionPrompt(content) {
    const {
      productInfo = {},
      competitors = [],
      industry = 'technology',
      tone = 'professional',
      focusAreas = []
    } = content;
  
    return `Create a messaging framework for the following product:
  
  Product/Service: ${productInfo.name || 'Unnamed Product'}
  Description: ${productInfo.description || 'No description provided'}
  Target Audience: ${Array.isArray(productInfo.targetAudience) ? productInfo.targetAudience.join('; ') : productInfo.targetAudience || 'General'}
  Industry: ${industry}
  Competitors: ${Array.isArray(competitors) ? competitors.join(', ') : competitors}
  Focus Areas: ${Array.isArray(focusAreas) ? focusAreas.join(', ') : focusAreas}
  Tone: ${tone}
  
  Please create a messaging framework with the following components:
  1. A compelling value proposition (1-2 sentences)
  2. 3-5 key differentiators that set this product apart
  3. 3-5 specific benefits for the target audience
  
  Format your response as a valid JSON object with these fields:
  {
    "valueProposition": "A clear, compelling value proposition statement",
    "keyDifferentiators": ["differentiator 1", "differentiator 2", "differentiator 3"],
    "targetedMessages": ["benefit 1", "benefit 2", "benefit 3"]
  }
  
  Make the content specific, substantive and actionable. Avoid generic marketing language.`;
  }
  
  async generatePersonal(userId, content, parameters = {}) {
    const prompt = this._buildPersonalGeneratorPrompt(content, parameters);
    const response = await openai.createCompletion(
      prompt,
      this.systemMessages.contentGenerator
    );
    const result = await openai.parseJSONResponse(response);

    return this._saveDocument(userId, {
      originalContent: JSON.stringify(content),
      processedContent: result.personalContent,
      documentType: "personal-generator",
      metadata: parameters,
      stats: result.stats || {},
    });
  }
  _buildPersonalGeneratorPrompt(content, parameters) {
    return `Generate personalized content based on the following input:
Content: ${content}
Parameters:
- Tone: ${parameters.tone || "professional"}
- Audience: ${parameters.audience || "general"}
- Keywords: ${parameters.keywords ? parameters.keywords.join(", ") : ""}
- Additional Notes: ${parameters.additionalNotes || ""}
Return the personalized content as a JSON object with these fields:
{
  "personalContent": "the generated personalized content",
  "stats": {
    "personalizationScore": 85,
    "engagementScore": 90
  }
}`;
  }
  async modifyContent(userId, content, parameters = {}) {
    const prompt = this._buildModifyPrompt(content, parameters);
    const response = await openai.createCompletion(
      prompt,
      this.systemMessages.contentGenerator
    );
    const result = await openai.parseJSONResponse(response);

    return this._saveDocument(userId, {
      originalContent: content,
      processedContent: result.modifiedContent,
      documentType: "modified",
      metadata: parameters,
      stats: result.stats || {},
    });
  }
  _buildModifyPrompt(content, parameters) {
    return `Modify the following content based on the provided parameters:
Content: ${content}
Parameters:
- Tone: ${parameters.tone || "professional"}
- Audience: ${parameters.audience || "general"}
- Keywords: ${parameters.keywords ? parameters.keywords.join(", ") : ""}
- Additional Notes: ${parameters.additionalNotes || ""}
Return the modified content as a JSON object with these fields:
{
  "modifiedContent": "the modified content",
  "stats": {
    "clarityScore": 85,
    "engagementScore": 90
  }
}`;
  }

  // get user documents
  async getUserDocuments(userId, query = {}) {
    try {
      const documents = await Document.find({
        userId,
        ...query,
      }).sort({ createdAt: -1 }
      );
      return documents;
    } catch (error) {
      logger.error(`Failed to retrieve documents: ${error.message}`);
      throw error;
    }
  }
  // get document by id
  async getDocumentById(userId, documentId) {
    try {
      const document = await Document.findOne({ _id: documentId, userId });
      if (!document) {
        throw new Error("Document not found");
      }
      return document;
    } catch (error) {
      logger.error(`Failed to retrieve documents: ${error.message}`);
      throw error;
    }
  }

  // delete document by id
  async deleteDocumentById(userId, documentId) {
    try {
      const result = await Document.deleteOne({ _id: documentId, userId });
      if (result.deletedCount === 0) {
        throw new Error("Document not found or already deleted");
      }
      return { message: "Document deleted successfully" };
    } catch (error) {
      logger.error(`Failed to delete document: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new DocumentService();
