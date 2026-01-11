/**
 * IndyScan Parser
 *
 * Parses IndyScan HTML pages to extract AnonCreds schema and
 * credential definition metadata.
 */

const cheerio = require('cheerio');

/**
 * Known IndyScan URL patterns
 */
const INDYSCAN_PATTERNS = {
  candyscan: /candyscan\.idlab\.org\/tx\/([^/]+)\/domain\/(\d+)/,
  indyscan: /indyscan\.io\/txs\/([^/]+)\/domain\/(\d+)/,
  bcovrin: /bcovrin\.vonx\.io.*\/tx\/(\d+)/,
};

/**
 * Parse a ledger name from URL
 */
function parseLedgerFromUrl(url) {
  if (url.includes('candyscan.idlab.org')) {
    const match = url.match(/\/tx\/([^/]+)\//);
    if (match) {
      const network = match[1].toLowerCase();
      return `candy:${network.replace('candy_', '')}`;
    }
    return 'candy:dev';
  }

  if (url.includes('indyscan.io')) {
    const match = url.match(/\/txs\/([^/]+)\//);
    if (match) {
      const network = match[1].toLowerCase();
      return `sovrin:${network}`;
    }
    return 'sovrin:staging';
  }

  if (url.includes('bcovrin.vonx.io')) {
    if (url.includes('test.')) return 'bcovrin:test';
    if (url.includes('dev.')) return 'bcovrin:dev';
    return 'bcovrin:test';
  }

  return 'unknown';
}

/**
 * Parse schema data from IndyScan HTML
 */
async function parseSchemaFromHtml(html, sourceUrl) {
  const $ = cheerio.load(html);

  // Initialize result
  const result = {
    name: null,
    version: null,
    schemaId: null,
    issuerDid: null,
    attributes: [],
    ledger: parseLedgerFromUrl(sourceUrl),
    seqNo: null,
  };

  // Try to extract from JSON in page (some IndyScan pages include raw TX data)
  const scriptTags = $('script').toArray();
  for (const script of scriptTags) {
    const content = $(script).html();
    if (content && content.includes('"data":')) {
      try {
        // Look for schema data in scripts
        const jsonMatch = content.match(/\{[^}]*"data"\s*:\s*\{[^}]*"name"[^}]*\}/);
        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[0]);
          if (data.data) {
            result.name = data.data.name;
            result.version = data.data.version;
            result.attributes = data.data.attr_names || [];
          }
        }
      } catch {
        // Continue trying other methods
      }
    }
  }

  // Extract from visible page content
  const pageText = $('body').text();

  // Look for schema name pattern
  if (!result.name) {
    const nameMatch = pageText.match(/name[:\s]+["']?([A-Za-z0-9_\s-]+)["']?/i);
    if (nameMatch) {
      result.name = nameMatch[1].trim();
    }
  }

  // Look for version pattern
  if (!result.version) {
    const versionMatch = pageText.match(/version[:\s]+["']?([0-9.]+)["']?/i);
    if (versionMatch) {
      result.version = versionMatch[1].trim();
    }
  }

  // Look for schema ID pattern (DID:2:name:version format)
  const schemaIdMatch = pageText.match(/([A-Za-z0-9]{21,}):2:([^:]+):([0-9.]+)/);
  if (schemaIdMatch) {
    result.schemaId = schemaIdMatch[0];
    result.issuerDid = schemaIdMatch[1];
    if (!result.name) result.name = schemaIdMatch[2];
    if (!result.version) result.version = schemaIdMatch[3];
  }

  // Extract attributes from attr_names pattern
  if (result.attributes.length === 0) {
    const attrMatch = pageText.match(/attr_names[:\s]*\[([^\]]+)\]/i);
    if (attrMatch) {
      const attrs = attrMatch[1].match(/["']([^"']+)["']/g);
      if (attrs) {
        result.attributes = attrs.map((a) => a.replace(/["']/g, ''));
      }
    }
  }

  // Try to extract from table rows (CandyScan format)
  $('tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length >= 2) {
      const label = $(cells[0]).text().toLowerCase().trim();
      const value = $(cells[1]).text().trim();

      if (label.includes('name') && !result.name) {
        result.name = value;
      }
      if (label.includes('version') && !result.version) {
        result.version = value;
      }
      if (label.includes('seqno') || label.includes('seq')) {
        result.seqNo = parseInt(value, 10);
      }
    }
  });

  // Extract sequence number from URL if not found
  if (!result.seqNo) {
    const seqMatch = sourceUrl.match(/\/domain\/(\d+)/);
    if (seqMatch) {
      result.seqNo = parseInt(seqMatch[1], 10);
    }
  }

  // Validate we have minimum required data
  if (!result.name || !result.version) {
    throw new Error('Could not parse schema name and version from page');
  }

  if (!result.schemaId && result.issuerDid) {
    result.schemaId = `${result.issuerDid}:2:${result.name}:${result.version}`;
  }

  return result;
}

/**
 * Parse credential definition data from IndyScan HTML
 */
async function parseCredDefFromHtml(html, sourceUrl) {
  const $ = cheerio.load(html);

  // Initialize result
  const result = {
    credDefId: null,
    schemaId: null,
    issuerDid: null,
    tag: 'default',
    signatureType: 'CL',
    ledger: parseLedgerFromUrl(sourceUrl),
    seqNo: null,
  };

  const pageText = $('body').text();

  // Look for credential definition ID pattern (DID:3:CL:schemaSeqNo:tag format)
  const credDefIdMatch = pageText.match(/([A-Za-z0-9]{21,}):3:CL:(\d+):([A-Za-z0-9_-]+)/);
  if (credDefIdMatch) {
    result.credDefId = credDefIdMatch[0];
    result.issuerDid = credDefIdMatch[1];
    result.tag = credDefIdMatch[3];
  }

  // Look for schema reference
  const schemaRefMatch = pageText.match(/ref[:\s]+(\d+)/i);
  if (schemaRefMatch) {
    // This is the schema sequence number
  }

  // Look for schema ID in page
  const schemaIdMatch = pageText.match(/([A-Za-z0-9]{21,}):2:([^:]+):([0-9.]+)/);
  if (schemaIdMatch) {
    result.schemaId = schemaIdMatch[0];
  }

  // Try to extract from table rows
  $('tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length >= 2) {
      const label = $(cells[0]).text().toLowerCase().trim();
      const value = $(cells[1]).text().trim();

      if (label.includes('tag')) {
        result.tag = value || 'default';
      }
      if (label.includes('signature') && label.includes('type')) {
        result.signatureType = value || 'CL';
      }
      if (label.includes('seqno') || label.includes('seq')) {
        result.seqNo = parseInt(value, 10);
      }
    }
  });

  // Extract sequence number from URL if not found
  if (!result.seqNo) {
    const seqMatch = sourceUrl.match(/\/domain\/(\d+)/);
    if (seqMatch) {
      result.seqNo = parseInt(seqMatch[1], 10);
    }
  }

  // Validate we have minimum required data
  if (!result.credDefId) {
    throw new Error('Could not parse credential definition ID from page');
  }

  return result;
}

/**
 * Detect transaction type from HTML content
 */
function detectTransactionType(html) {
  const $ = cheerio.load(html);
  const pageText = $('body').text().toLowerCase();

  // Check for schema indicators
  if (
    pageText.includes('attr_names') ||
    pageText.includes('attribute names') ||
    pageText.includes(':2:') // Schema ID pattern
  ) {
    return 'schema';
  }

  // Check for cred def indicators
  if (
    pageText.includes(':3:cl:') ||
    pageText.includes('credential definition') ||
    pageText.includes('creddef')
  ) {
    return 'creddef';
  }

  return 'unknown';
}

/**
 * Fetch and parse an IndyScan URL
 */
async function fetchAndParse(url) {
  // Fetch the page
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; CredentialCatalogue/1.0)',
      Accept: 'text/html,application/xhtml+xml',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const type = detectTransactionType(html);

  return { html, type };
}

module.exports = {
  parseSchemaFromHtml,
  parseCredDefFromHtml,
  detectTransactionType,
  fetchAndParse,
  parseLedgerFromUrl,
};
