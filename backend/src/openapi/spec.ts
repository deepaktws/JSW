/**
 * OpenAPI 3.0 document for JSW API (served at /docs via Swagger UI).
 */
export const openapiSpec: Record<string, unknown> = {
  openapi: '3.0.3',
  info: {
    title: 'JSW API',
    version: '1.0.0',
    description: 'Express + Prisma API. Use **Authorize** with a JWT from `POST /auth/login`.',
  },
  servers: [{ url: '/', description: 'Same origin as this server (e.g. http://localhost:5050)' }],
  tags: [
    { name: 'Health' },
    { name: 'Auth' },
    { name: 'Users' },
    { name: 'Excel' },
    { name: 'Files' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          isActive: { type: 'boolean' },
          createdBy: { type: 'string', format: 'uuid' },
          updatedBy: { type: 'string', format: 'uuid' },
          deletedBy: { type: 'string', format: 'uuid', nullable: true },
        },
      },
      UserPatchBody: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
        },
      },
      UserSingleResponse: {
        type: 'object',
        properties: {
          user: { $ref: '#/components/schemas/User' },
        },
      },
      UserDeleteResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'User deleted' },
          user: { $ref: '#/components/schemas/User' },
        },
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, example: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, example: 20 },
          total: { type: 'integer', minimum: 0, example: 42 },
          totalPages: { type: 'integer', minimum: 0, example: 3 },
        },
      },
      UserListResponse: {
        type: 'object',
        properties: {
          users: {
            type: 'array',
            items: { $ref: '#/components/schemas/User' },
          },
          meta: { $ref: '#/components/schemas/PaginationMeta' },
        },
      },
      UserCreateInput: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          isActive: { type: 'boolean', default: true },
        },
      },
      UserCreateResponse: {
        type: 'object',
        properties: {
          created: {
            type: 'array',
            items: { $ref: '#/components/schemas/User' },
            description: 'Successfully created users',
          },
          failed: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                index: { type: 'integer', description: 'Index in request array' },
                email: { type: 'string' },
                name: { type: 'string' },
                reason: { type: 'string', description: 'Failure reason' },
              },
            },
            description: 'Users that failed to create with reasons',
          },
          summary: {
            type: 'object',
            properties: {
              total: { type: 'integer' },
              succeeded: { type: 'integer' },
              failed: { type: 'integer' },
            },
          },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          user: { $ref: '#/components/schemas/User' },
          token: { type: 'string' },
        },
      },
      ValidationError: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Validation failed' },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                msg: { type: 'string' },
                path: { type: 'string' },
                location: { type: 'string' },
              },
            },
          },
        },
      },
      ExcelUploadResult: {
        type: 'object',
        properties: {
          sheetName: { type: 'string' },
          columns: { type: 'array', items: { type: 'string' } },
          rows: {
            type: 'array',
            items: { type: 'object', additionalProperties: true },
          },
          rowCount: { type: 'integer' },
        },
      },
      FileStatus: {
        type: 'string',
        enum: ['ACTIVE', 'DELETED'],
      },
      File: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          originalName: { type: 'string' },
          sizeBytes: { type: 'integer' },
          mimeType: { type: 'string' },
          status: { $ref: '#/components/schemas/FileStatus' },
          deletedAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      FileListResponse: {
        type: 'object',
        properties: {
          files: {
            type: 'array',
            items: { $ref: '#/components/schemas/File' },
          },
          meta: { $ref: '#/components/schemas/PaginationMeta' },
        },
      },
      FileSingleResponse: {
        type: 'object',
        properties: {
          file: { $ref: '#/components/schemas/File' },
        },
      },
      FileDeleteResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'File deleted successfully' },
          file: { $ref: '#/components/schemas/File' },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { status: { type: 'string', example: 'ok' } },
                },
              },
            },
          },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
              },
            },
          },
          400: {
            description: 'Validation failed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ValidationError' },
              },
            },
          },
          401: {
            description: 'Invalid email or password',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { message: { type: 'string' } },
                },
              },
            },
          },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Current user',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized or user not found' },
        },
      },
    },
    '/users': {
      post: {
        tags: ['Users'],
        summary: 'Create users (bulk only - array required)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'array',
                minItems: 1,
                items: { $ref: '#/components/schemas/UserCreateInput' },
              },
              examples: {
                single: {
                  summary: 'Single user (still requires array)',
                  value: [
                    {
                      name: 'John Doe',
                      email: 'john@example.com',
                      password: 'securepass123',
                    },
                  ],
                },
                bulk: {
                  summary: 'Multiple users',
                  value: [
                    { name: 'Alice', email: 'alice@example.com', password: 'pass12345' },
                    { name: 'Bob', email: 'bob@example.com', password: 'pass67890' },
                    { name: 'Charlie', email: 'charlie@example.com', password: 'pass11111' },
                  ],
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'All users created successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UserCreateResponse' },
              },
            },
          },
          207: {
            description: 'Partial success - some users created, some failed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UserCreateResponse' },
              },
            },
          },
          400: {
            description: 'Validation failed or all users failed to create',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UserCreateResponse' },
              },
            },
          },
          401: { description: 'Unauthorized' },
        },
      },
      get: {
        tags: ['Users'],
        summary: 'List users (not soft-deleted), paginated',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'page',
            in: 'query',
            required: false,
            schema: { type: 'integer', minimum: 1, default: 1 },
            description: '1-based page index',
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            description: 'Page size (max 100)',
          },
        ],
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UserListResponse' },
              },
            },
          },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/users/me': {
      patch: {
        tags: ['Users'],
        summary: 'Update current user',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UserPatchBody' },
            },
          },
        },
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UserSingleResponse' },
              },
            },
          },
          400: { description: 'Validation failed or no fields' },
          401: { description: 'Unauthorized' },
          404: { description: 'Not found' },
          409: { description: 'Email in use' },
        },
      },
      delete: {
        tags: ['Users'],
        summary: 'Soft-delete current user',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UserDeleteResponse' },
              },
            },
          },
          401: { description: 'Unauthorized' },
          404: { description: 'Not found' },
        },
      },
    },
    '/users/{id}': {
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      get: {
        tags: ['Users'],
        summary: 'Get user by id',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UserSingleResponse' },
              },
            },
          },
          400: { description: 'Invalid id' },
          401: { description: 'Unauthorized' },
          404: { description: 'Not found' },
        },
      },
    },
    '/excel/upload': {
      post: {
        tags: ['Excel'],
        summary: 'Upload Excel (.xls / .xlsx)',
        description: 'Multipart form field name must be `file`. Max size 10 MB.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: { type: 'string', format: 'binary' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Parsed sheet JSON',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ExcelUploadResult' },
              },
            },
          },
          400: { description: 'No file, invalid type, or empty workbook' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/files/upload': {
      post: {
        tags: ['Files'],
        summary: 'Upload a file chunk (auto-finalizes when complete)',
        description:
          'Upload file in chunks. Frontend generates file_id (UUID). Server auto-merges when all chunks received. Form field name must be `data`. Max chunk size 1MB.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: [
                  'data',
                  'file_id',
                  'chunk_index',
                  'total_chunks',
                  'original_name',
                  'mime_type',
                ],
                properties: {
                  data: { type: 'string', format: 'binary', description: 'Chunk data' },
                  file_id: {
                    type: 'string',
                    format: 'uuid',
                    description: 'Client-generated UUID for this upload session',
                  },
                  chunk_index: {
                    type: 'integer',
                    minimum: 0,
                    description: '0-based chunk index',
                  },
                  total_chunks: {
                    type: 'integer',
                    minimum: 1,
                    description: 'Total number of chunks',
                  },
                  original_name: {
                    type: 'string',
                    example: 'document.xlsx',
                    description: 'Original filename',
                  },
                  mime_type: {
                    type: 'string',
                    example:
                      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    description: 'MIME type',
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Upload complete - all chunks received and merged',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    completed: { type: 'boolean', example: true },
                    file: { $ref: '#/components/schemas/File' },
                  },
                },
              },
            },
          },
          202: {
            description: 'Chunk received - upload in progress',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    completed: { type: 'boolean', example: false },
                    progress: {
                      type: 'object',
                      properties: {
                        received: { type: 'integer', example: 15 },
                        total: { type: 'integer', example: 20 },
                        percentage: { type: 'integer', example: 75 },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: 'Validation failed or invalid chunk' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/files': {
      get: {
        tags: ['Files'],
        summary: 'List user files',
        description: 'Returns all active files for the authenticated user (paginated).',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'page',
            in: 'query',
            required: false,
            schema: { type: 'integer', minimum: 1, default: 1 },
            description: '1-based page index',
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            description: 'Page size (max 100)',
          },
        ],
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FileListResponse' },
              },
            },
          },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/files/{id}': {
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      get: {
        tags: ['Files'],
        summary: 'Get file metadata',
        description: 'Returns file metadata by ID. User can only access their own files.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FileSingleResponse' },
              },
            },
          },
          400: { description: 'Invalid file id' },
          401: { description: 'Unauthorized' },
          403: { description: 'Access denied' },
          404: { description: 'File not found' },
        },
      },
      delete: {
        tags: ['Files'],
        summary: 'Soft delete file',
        description: 'Marks the file as deleted. User can only delete their own files.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'File deleted successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FileDeleteResponse' },
              },
            },
          },
          400: { description: 'Invalid file id' },
          401: { description: 'Unauthorized' },
          403: { description: 'Access denied' },
          404: { description: 'File not found' },
        },
      },
    },
    '/files/{id}/download': {
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      get: {
        tags: ['Files'],
        summary: 'Download file',
        description: 'Downloads the file. User can only download their own files.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'File content',
            content: {
              'application/octet-stream': {
                schema: {
                  type: 'string',
                  format: 'binary',
                },
              },
            },
          },
          400: { description: 'Invalid file id' },
          401: { description: 'Unauthorized' },
          403: { description: 'Access denied' },
          404: { description: 'File not found' },
        },
      },
    },
  },
};
