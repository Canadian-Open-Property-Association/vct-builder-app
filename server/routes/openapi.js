import express from 'express';
import SwaggerParser from '@apidevtools/swagger-parser';

const router = express.Router();

// Common paths where OpenAPI specs are typically served
const PROBE_PATHS = [
  '/openapi.json',
  '/swagger.json',
  '/api-docs',
  '/api-docs.json',
  '/v3/api-docs',
  '/v2/api-docs',
  '/openapi.yaml',
  '/swagger.yaml',
  '/api/openapi.json',
  '/api/swagger.json',
];

/**
 * Attempt to detect the OpenAPI spec URL from a Swagger UI URL
 * @param {string} url - The input URL (could be Swagger UI or direct spec)
 * @returns {Promise<string|null>} - The detected spec URL or null
 */
async function detectSpecUrl(url) {
  try {
    const parsedUrl = new URL(url);
    const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;

    // Strip hash fragments and trailing slashes
    let cleanUrl = url.split('#')[0].replace(/\/+$/, '');

    // If URL already ends with .json or .yaml, it might be a direct spec URL
    if (/\.(json|yaml|yml)$/i.test(cleanUrl)) {
      // Verify it's a valid spec
      const response = await fetch(cleanUrl, {
        headers: { 'Accept': 'application/json, application/yaml, */*' }
      });
      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('json') || contentType.includes('yaml')) {
          return cleanUrl;
        }
      }
    }

    // Try to extract spec URL from Swagger UI HTML page
    try {
      const response = await fetch(cleanUrl, {
        headers: { 'Accept': 'text/html' }
      });
      if (response.ok) {
        const html = await response.text();

        // Look for common patterns in Swagger UI config
        // Pattern 1: url: "/api-docs" or url: 'https://...'
        const urlMatch = html.match(/url\s*[:=]\s*["']([^"']+)["']/);
        if (urlMatch) {
          const specUrl = urlMatch[1];
          // Handle relative URLs
          if (specUrl.startsWith('/')) {
            return baseUrl + specUrl;
          } else if (specUrl.startsWith('http')) {
            return specUrl;
          }
        }

        // Pattern 2: configUrl
        const configMatch = html.match(/configUrl\s*[:=]\s*["']([^"']+)["']/);
        if (configMatch) {
          const configUrl = configMatch[1].startsWith('/')
            ? baseUrl + configMatch[1]
            : configMatch[1];
          // Fetch config and get spec URL from it
          try {
            const configResponse = await fetch(configUrl);
            if (configResponse.ok) {
              const config = await configResponse.json();
              if (config.url) {
                return config.url.startsWith('/') ? baseUrl + config.url : config.url;
              }
            }
          } catch (e) {
            // Config fetch failed, continue probing
          }
        }
      }
    } catch (e) {
      // HTML fetch failed, continue probing
    }

    // Probe common paths
    for (const path of PROBE_PATHS) {
      const probeUrl = baseUrl + path;
      try {
        const response = await fetch(probeUrl, {
          method: 'HEAD',
          headers: { 'Accept': 'application/json, application/yaml' }
        });
        if (response.ok) {
          return probeUrl;
        }
      } catch (e) {
        // Continue to next path
      }
    }

    // Try path-based probing from the original URL path
    const urlPath = parsedUrl.pathname.replace(/\/+$/, '');
    if (urlPath && urlPath !== '/') {
      // Try adding spec extensions to the path
      for (const ext of ['.json', '/openapi.json', '/swagger.json']) {
        const probeUrl = baseUrl + urlPath + ext;
        try {
          const response = await fetch(probeUrl, {
            method: 'HEAD',
            headers: { 'Accept': 'application/json' }
          });
          if (response.ok) {
            return probeUrl;
          }
        } catch (e) {
          // Continue
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error detecting spec URL:', error);
    return null;
  }
}

/**
 * Parse OpenAPI spec and extract structured data
 * @param {object} spec - The parsed OpenAPI/Swagger spec
 * @returns {object} - Structured data with endpoints and schemas
 */
function extractSpecData(spec) {
  const result = {
    info: {
      title: spec.info?.title || 'Untitled API',
      version: spec.info?.version || '1.0.0',
      description: spec.info?.description || '',
    },
    servers: [],
    endpoints: [],
    schemas: [],
  };

  // Extract servers (OpenAPI 3.x) or host/basePath (Swagger 2.x)
  if (spec.servers && Array.isArray(spec.servers)) {
    result.servers = spec.servers.map(s => ({
      url: s.url,
      description: s.description || '',
    }));
  } else if (spec.host) {
    const scheme = spec.schemes?.[0] || 'https';
    const basePath = spec.basePath || '';
    result.servers = [{
      url: `${scheme}://${spec.host}${basePath}`,
      description: 'API Server',
    }];
  }

  // Extract paths/endpoints
  if (spec.paths) {
    for (const [path, pathItem] of Object.entries(spec.paths)) {
      const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];

      for (const method of methods) {
        if (pathItem[method]) {
          const operation = pathItem[method];
          const endpoint = {
            id: `${method.toUpperCase()}:${path}`,
            path,
            method: method.toUpperCase(),
            operationId: operation.operationId || '',
            summary: operation.summary || '',
            description: operation.description || '',
            tags: operation.tags || [],
            parameters: [],
            requestBody: null,
            responses: {},
          };

          // Extract parameters
          const allParams = [...(pathItem.parameters || []), ...(operation.parameters || [])];
          endpoint.parameters = allParams.map(param => ({
            name: param.name,
            in: param.in,
            required: param.required || false,
            type: param.schema?.type || param.type || 'string',
            description: param.description || '',
          }));

          // Extract request body (OpenAPI 3.x)
          if (operation.requestBody?.content) {
            const content = operation.requestBody.content;
            const mediaType = Object.keys(content)[0];
            if (content[mediaType]?.schema) {
              endpoint.requestBody = extractSchemaInfo(content[mediaType].schema, spec);
            }
          }

          // Extract responses
          if (operation.responses) {
            for (const [status, response] of Object.entries(operation.responses)) {
              if (response.content) {
                const mediaType = Object.keys(response.content)[0];
                if (response.content[mediaType]?.schema) {
                  endpoint.responses[status] = extractSchemaInfo(response.content[mediaType].schema, spec);
                }
              } else if (response.schema) {
                // Swagger 2.x format
                endpoint.responses[status] = extractSchemaInfo(response.schema, spec);
              }
            }
          }

          result.endpoints.push(endpoint);
        }
      }
    }
  }

  // Extract schema definitions
  const schemas = spec.components?.schemas || spec.definitions || {};
  for (const [name, schema] of Object.entries(schemas)) {
    const schemaInfo = {
      id: name,
      name,
      type: schema.type || 'object',
      description: schema.description || '',
      properties: [],
      required: schema.required || [],
    };

    if (schema.properties) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        schemaInfo.properties.push({
          name: propName,
          type: propSchema.type || 'string',
          format: propSchema.format || null,
          description: propSchema.description || '',
          example: propSchema.example,
          required: schema.required?.includes(propName) || false,
          enum: propSchema.enum || null,
          items: propSchema.items ? {
            type: propSchema.items.type || 'string',
            format: propSchema.items.format || null,
          } : null,
        });
      }
    }

    result.schemas.push(schemaInfo);
  }

  return result;
}

/**
 * Extract schema info, resolving $ref if needed
 */
function extractSchemaInfo(schema, spec) {
  if (schema.$ref) {
    const refPath = schema.$ref.replace('#/components/schemas/', '').replace('#/definitions/', '');
    const refSchema = spec.components?.schemas?.[refPath] || spec.definitions?.[refPath];
    if (refSchema) {
      return {
        name: refPath,
        type: refSchema.type || 'object',
        isRef: true,
      };
    }
  }

  return {
    name: schema.title || 'inline',
    type: schema.type || 'object',
    isRef: false,
  };
}

/**
 * POST /api/openapi/parse
 * Fetch and parse an OpenAPI/Swagger spec from a URL
 */
router.post('/parse', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Detect the actual spec URL
    const specUrl = await detectSpecUrl(url);

    if (!specUrl) {
      return res.status(404).json({
        error: 'Could not detect OpenAPI spec location',
        message: 'Unable to find an OpenAPI/Swagger specification at the provided URL. Please ensure the URL points to a valid Swagger UI page or OpenAPI JSON/YAML file.',
        triedPaths: PROBE_PATHS,
      });
    }

    // Fetch and parse the spec
    let spec;
    try {
      spec = await SwaggerParser.validate(specUrl);
    } catch (parseError) {
      // Try without validation (some specs have minor issues)
      try {
        spec = await SwaggerParser.parse(specUrl);
      } catch (e) {
        return res.status(422).json({
          error: 'Failed to parse OpenAPI spec',
          message: parseError.message,
          specUrl,
        });
      }
    }

    // Extract structured data
    const data = extractSpecData(spec);

    res.json({
      success: true,
      specUrl,
      originalUrl: url,
      ...data,
    });

  } catch (error) {
    console.error('OpenAPI parse error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

/**
 * POST /api/openapi/detect
 * Just detect the spec URL without full parsing
 */
router.post('/detect', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const specUrl = await detectSpecUrl(url);

    if (!specUrl) {
      return res.status(404).json({
        error: 'Could not detect OpenAPI spec location',
      });
    }

    res.json({
      success: true,
      detectedUrl: specUrl,
      originalUrl: url,
    });

  } catch (error) {
    console.error('OpenAPI detect error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

export default router;
