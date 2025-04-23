const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Marketing Content Lab API',
      version: '1.0.0',
      description: 'API documentation for the Marketing Content Lab platform',
      contact: {
        name: 'API Support',
        email: 'support@mcl.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000/api',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          required: ['name', 'email'],
          properties: {
            name: {
              type: 'string',
              example: 'John Doe'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'john@example.com'
            },
            password: {
              type: 'string',
              format: 'password',
              example: 'Password123!'
            },
            role: {
              type: 'string',
              enum: ['user', 'admin'],
              example: 'user'
            }
          }
        },
        Client: {
          type: 'object',
          required: ['name'],
          properties: {
            name: {
              type: 'string',
              example: 'Acme Corp'
            },
            description: {
              type: 'string',
              example: 'A leading manufacturer of animated products'
            },
            industry: {
              type: 'string',
              example: 'Manufacturing'
            },
            brandVoice: {
              type: 'string',
              example: 'Friendly, professional, and innovative'
            },
            targetAudience: {
              type: 'string',
              example: 'Small business owners aged 25-45'
            }
          }
        },
        Framework: {
          type: 'object',
          required: ['name', 'description', 'structure'],
          properties: {
            name: {
              type: 'string',
              example: 'AIDA Framework'
            },
            description: {
              type: 'string',
              example: 'Attention, Interest, Desire, Action marketing framework'
            },
            structure: {
              type: 'object',
              example: {
                sections: ['Attention', 'Interest', 'Desire', 'Action'],
                guidelines: 'Start with a hook, build interest with benefits, create desire with emotional appeal, end with clear CTA'
              }
            },
            isPublic: {
              type: 'boolean',
              example: true
            }
          }
        },
        ContentGeneration: {
          type: 'object',
          required: ['clientId', 'prompt'],
          properties: {
            clientId: {
              type: 'string',
              format: 'mongo-id',
              example: '64d4f5e5b4c4d53a7c8f9e6a'
            },
            frameworkId: {
              type: 'string',
              format: 'mongo-id',
              example: '64d4f5e5b4c4d53a7c8f9e6b'
            },
            prompt: {
              type: 'string',
              example: 'Create a social media post about our new product launch'
            }
          }
        },
        Content: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              example: 'New Product Launch Announcement'
            },
            content: {
              type: 'string',
              example: 'Exciting news! Our new product is launching next week...'
            },
            status: {
              type: 'string',
              enum: ['draft', 'published', 'archived'],
              example: 'draft'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'fail'
            },
            message: {
              type: 'string',
              example: 'Error message describing what went wrong'
            }
          }
        }
      }
    }
  },
  apis: ['./routes/*.js', './models/*.js']
};

const specs = swaggerJsdoc(options);

module.exports = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, { 
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }'
  }));
};