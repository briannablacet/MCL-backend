const HumanizedContent = require('../models/HumanizedContent');
const { openai } = require('../config/');
const logger = require('../config/logger');

class ContentHumanizerService {
  async humanizeContent(userId, content, parameters = {}) {
    try {
      // Validate input
      if (!content || typeof content !== 'string') {
        throw new Error('Missing or invalid content field');
      }

      // Set default parameters
      const humanizationParams = {
        clicheRemoval: true,
        formality: 'neutral',
        styleGuide: 'Chicago Manual of Style',
        ...parameters
      };

      // Generate the prompt
      const prompt = this._buildPrompt(content, humanizationParams);

      // Call OpenAI API
      const response = await this._callOpenAI(prompt);

      // Parse and format the response
      const result = this._parseResponse(response, content);

      // Save to database
      const savedContent = await this._saveHumanizedContent(
        userId,
        content,
        result,
        humanizationParams
      );

      return savedContent;
    } catch (error) {
      logger.error(`Content humanization failed: ${error.message}`);
      throw error;
    }
  }

  _buildPrompt(content, parameters) {
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

  async _callOpenAI(prompt) {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert editor who specializes in making AI-generated content sound like it was written by a thoughtful human being.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7
    });

    return completion.choices[0].message?.content || '';
  }

  _parseResponse(responseText, originalContent) {
    try {
      const parsedResponse = JSON.parse(responseText);
      return {
        content: parsedResponse.content || originalContent,
        changes: parsedResponse.changes || [],
        humanityScore: parsedResponse.humanityScore || 85,
        readabilityScore: parsedResponse.readabilityScore || 85
      };
    } catch (error) {
      console.error('Failed to parse OpenAI response:', responseText);
      return {
        content: originalContent,
        changes: [],
        humanityScore: 85,
        readabilityScore: 85
      };
    }
  }

  async _saveHumanizedContent(userId, originalContent, result, parameters) {
    return await HumanizedContent.create({
      userId,
      originalContent,
      humanizedContent: result.content,
      parameters,
      changes: result.changes,
      scores: {
        humanity: result.humanityScore,
        readability: result.readabilityScore
      }
    });
  }
}

module.exports = new ContentHumanizerService();