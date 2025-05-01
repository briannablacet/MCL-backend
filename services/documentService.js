const Document = require('../models/Document');
const openai = require('../utils/openaiClient');
const logger = require('../config/logger');

class DocumentService {
  constructor() {
    this.systemMessages = {
      humanizer: 'You are an expert editor who specializes in making AI-generated content sound like it was written by a thoughtful human being.',
      styleChecker: 'You are an expert editor with decades of experience in enforcing style guide compliance.',
      prosePerfector: 'You are an expert editor with decades of experience in professional editing.',
      contentGenerator: 'You are an expert content creator specializing in creating high-quality content.',
      contentRepurposer: 'You are an expert content strategist who specializes in repurposing content across different formats.'
    };
  }

  async humanizeContent(userId, content, parameters = {}) {
    const prompt = this._buildHumanizerPrompt(content, parameters);
    const response = await openai.createCompletion(prompt, this.systemMessages.humanizer);
    const result = await openai.parseJSONResponse(response);

    return this._saveDocument(userId, {
      originalContent: content,
      processedContent: result.content,
      documentType: 'humanized',
      metadata: parameters,
      stats: {
        humanityScore: result.humanityScore || 85,
        readabilityScore: result.readabilityScore || 85
      }
    });
  }

  async checkStyle(userId, content, styleGuide = {}) {
    const prompt = this._buildStyleCheckerPrompt(content, styleGuide);
    const response = await openai.createCompletion(prompt, this.systemMessages.styleChecker, { temperature: 0.3 });
    const result = await openai.parseJSONResponse(response);

    return this._saveDocument(userId, {
      originalContent: content,
      processedContent: content, // Original content since we're just checking
      documentType: 'style-checked',
      metadata: { styleGuide },
      stats: {
        compliance: result.compliance || 75,
        issues: result.issues || []
      }
    });
  }

  async perfectProse(userId, text, options = {}) {
    const prompt = this._buildProsePerfectorPrompt(text, options);
    const response = await openai.createCompletion(prompt, this.systemMessages.prosePerfector);
    const result = await openai.parseJSONResponse(response);

    return this._saveDocument(userId, {
      originalContent: text,
      processedContent: result.enhancedText,
      documentType: 'generated',
      metadata: options,
      stats: result.stats || {}
    });
  }
  async _generateContentWithAI(contentType, promptData) {
    const prompt = this._buildContentGeneratorPrompt(contentType, promptData);
    const response = await openai.createCompletion(prompt, this.systemMessages.contentGenerator);
  
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
  async generateContent(userId, contentType, input) {
    const {
      prompt,
      templateId,
      variables,
      audience,
      keywords,
      tone,
      additionalNotes
    } = input;
  
    try {
      let originalContent = prompt;
  
      // If template is used, create descriptive originalContent
      if (!originalContent && templateId && variables) {
        originalContent = `Template: ${templateId}\n` +
          Object.entries(variables)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');
      }
  
      if (!originalContent) {
        throw new Error('Either prompt or template with variables is required');
      }
  
      const generatedContent = await this._generateContentWithAI(
        contentType,
        { 
          prompt: originalContent, 
          audience, 
          keywords, 
          tone, 
          additionalNotes 
        }
      );
  
      // Ensure we have content even if parsing failed
      const finalContent = generatedContent || "Content generation failed - please try again";
  
      const document = await this._saveDocument(userId, {
        originalContent,
        processedContent: finalContent,
        documentType: 'generated',
        metadata: {
          contentType,
          audience,
          keywords,
          tone,
          additionalNotes,
          templateId,
          variables
        }
      });
  
      return document;
    } catch (error) {
      logger.error(`Content generation failed: ${error.message}`);
      throw error;
    }
  }

  async repurposeContent(userId, content, repurposeData) {
    const prompt = this._buildRepurposePrompt(content, repurposeData);
    const response = await openai.createCompletion(prompt, this.systemMessages.contentRepurposer);
    const result = await openai.parseJSONResponse(response);

    return this._saveDocument(userId, {
      originalContent: content,
      processedContent: result.repurposedContent,
      documentType: 'repurposed',
      metadata: repurposeData,
      stats: result.contentStats || {}
    });
  }

  async _saveDocument(userId, documentData) {
    try {
      const document = await Document.create({
        userId,
        ...documentData
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
${parameters.clicheRemoval ? '- Remove AI clichés and robotic phrasing\n' : ''}
${parameters.addContractions ? '- Add natural contractions where appropriate\n' : ''}
${parameters.addPersonality ? '- Incorporate a warmer, more personable tone\n' : ''}
${parameters.formality ? `- Adjust formality level to be ${parameters.formality}\n` : ''}

Additional humanization principles:
- Replace robotic transitions ("it is important to note," "as mentioned earlier")
- Vary sentence structure to create a more natural rhythm
- Use more conversational connectors ("so," "actually," "though," etc. where appropriate)
- Add natural discourse markers humans use when speaking or writing
- Incorporate tasteful idioms and colloquialisms where appropriate
- Replace generic words with more specific, vivid alternatives
- Follow ${parameters.styleGuide || 'Chicago Manual of Style'} for punctuation and formatting
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

Style Guide: ${styleGuide.guide || 'Chicago Manual of Style'}

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
    return `As a professional editor with expertise matching ${options.styleGuide || 'Chicago Manual of Style'} guidelines, enhance the following text:

Text: ${text}

Apply these professional editing standards:
${options.improveClarity ? '- Improve clarity and readability\n' : ''}
${options.enhanceEngagement ? '- Enhance engagement\n' : ''}
${options.adjustFormality ? `- Adjust formality level to be ${options.formalityLevel}\n` : ''}

Additional editing principles:
- Remove all unnecessary words and redundancies
- Convert passive constructions to active voice
- Use shorter, more declarative sentences where appropriate
- Vary sentence structure for better rhythm and flow
- Follow ${options.styleGuide || 'Chicago Manual of Style'} guidelines
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
  ${promptData.prompt ? `- Primary Prompt: ${promptData.prompt}\n` : ''}
  ${promptData.audience ? `- Target Audience: ${promptData.audience}\n` : ''}
  ${promptData.keywords ? `- Keywords: ${Array.isArray(promptData.keywords) ? promptData.keywords.join(', ') : promptData.keywords}\n` : ''}
  ${promptData.tone ? `- Tone: ${promptData.tone}\n` : '- Tone: professional\n'}
  ${promptData.additionalNotes ? `- Additional Notes: ${promptData.additionalNotes}\n` : ''}
  
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

${repurposeData.styleGuide ? `Style Guide: ${JSON.stringify(repurposeData.styleGuide)}` : ''}
${repurposeData.messaging ? `Messaging Framework: ${JSON.stringify(repurposeData.messaging)}` : ''}

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
}


module.exports = new DocumentService();