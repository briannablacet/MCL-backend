const OpenAI = require('openai');

class OpenAIClient {
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async createCompletion(prompt, systemMessage, options = {}) {
    const defaultOptions = {
      model: 'gpt-4',
      temperature: 0.7,
      max_tokens: 2000,
      ...options
    };

    try {
      const completion = await this.client.chat.completions.create({
        ...defaultOptions,
        messages: [
          {
            role: 'system',
            content: systemMessage
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      return completion.choices[0].message?.content || '';
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw new Error('Failed to generate content with OpenAI');
    }
  }

  async parseJSONResponse(responseText) {
    try {
      // Handle JSON wrapped in markdown code blocks
      console.log('Response Text:', responseText);
      if (responseText.includes('```json')) {
        const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch && jsonMatch[1]) {
          return JSON.parse(jsonMatch[1]);
        }
      }
      return JSON.parse(responseText);
    } catch (error) {
      console.error('Failed to parse OpenAI response:', error);
      throw new Error('Invalid response format from OpenAI');
    }
  }
}

module.exports = new OpenAIClient();