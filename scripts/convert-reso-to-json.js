/**
 * RESO Data Dictionary CSV to JSON Converter
 *
 * Converts RESODataDictionary-2.0 - Fields.csv into the COPA Data Dictionary format.
 * Each RESO ResourceName becomes a VocabType, each field becomes a VocabProperty.
 *
 * Usage:
 *   node scripts/convert-reso-to-json.js
 *
 * Input:
 *   ../RESODataDictionary-2.0 - Fields.csv (relative to credential-design-tools)
 *
 * Output:
 *   server/data/data-types.json - VocabTypes (RESO resources with properties)
 *   server/data/categories.json - Domains/categories
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const CSV_PATH = path.join(__dirname, '../../RESODataDictionary-2.0 - Fields.csv');
const OUTPUT_DATA_TYPES = path.join(__dirname, '../server/data/data-types.json');
const OUTPUT_CATEGORIES = path.join(__dirname, '../server/data/categories.json');

// Map RESO SimpleDataType to COPA ValueType
const DATA_TYPE_MAP = {
  'String': 'string',
  'Number': 'number',
  'Boolean': 'boolean',
  'Date': 'date',
  'Timestamp': 'datetime',
  'String List, Single': 'string',
  'String List, Multi': 'array',
  'Collection': 'object',
};

// Generate slug-style ID
function slugify(str) {
  return str
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Parse comma-separated values, handling quotes
function parseList(str) {
  if (!str || str.trim() === '') return [];
  return str.split(',').map(s => s.trim()).filter(s => s);
}

// Clean undefined values from object
function cleanUndefined(obj) {
  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null && value !== '') {
      if (typeof value === 'object' && !Array.isArray(value)) {
        const cleanedNested = cleanUndefined(value);
        if (Object.keys(cleanedNested).length > 0) {
          cleaned[key] = cleanedNested;
        }
      } else if (Array.isArray(value) && value.length > 0) {
        cleaned[key] = value;
      } else if (!Array.isArray(value)) {
        cleaned[key] = value;
      }
    }
  }
  return cleaned;
}

async function main() {
  console.log('Reading RESO CSV...');
  console.log(`Input: ${CSV_PATH}`);

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`Error: CSV file not found at ${CSV_PATH}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  });

  console.log(`Parsed ${records.length} records from CSV`);

  // Group records by ResourceName
  const resources = {};
  for (const row of records) {
    const resourceName = row.ResourceName;
    if (!resourceName || resourceName === 'ResourceName') continue; // Skip header row if duplicated

    if (!resources[resourceName]) {
      resources[resourceName] = [];
    }
    resources[resourceName].push(row);
  }

  console.log(`Found ${Object.keys(resources).length} RESO resources`);

  // Extract all unique Groups for categories
  const allGroups = new Set();
  for (const row of records) {
    if (row.Groups) {
      parseList(row.Groups).forEach(g => allGroups.add(g));
    }
  }

  const now = new Date().toISOString();

  // Convert to VocabTypes
  const dataTypes = Object.entries(resources).map(([resourceName, fields]) => {
    // Collect all groups used by this resource's fields
    const resourceGroups = new Set();
    fields.forEach(f => {
      if (f.Groups) {
        parseList(f.Groups).forEach(g => resourceGroups.add(g));
      }
    });

    const properties = fields.map(f => {
      const prop = {
        id: `prop-${slugify(f.StandardName)}`,
        name: f.StandardName,
        displayName: f.DisplayName || f.StandardName,
        description: f.Definition || undefined,
        valueType: DATA_TYPE_MAP[f.SimpleDataType] || 'string',
        required: false,
        constraints: {
          maxLength: f.SugMaxLength ? parseInt(f.SugMaxLength, 10) : undefined,
          precision: f.SugMaxPrecision ? parseInt(f.SugMaxPrecision, 10) : undefined,
        },
        // RESO metadata
        displayNameFr: f.FrenchCanadianDisplayName || undefined,
        displayNameEs: f.SpanishDisplayName || undefined,
        resoGroups: parseList(f.Groups),
        synonyms: parseList(f.Synonyms),
        wikiUrl: f.WikiPageUrl || undefined,
        // Additional RESO metadata
        resoPropertyTypes: parseList(f.PropertyTypes),
        resoLookupName: f.LookupName || undefined,
        resoElementStatus: f.ElementStatus || undefined,
      };

      return cleanUndefined(prop);
    });

    return {
      id: slugify(resourceName),
      name: resourceName,
      description: `RESO ${resourceName} resource - ${fields.length} fields`,
      category: 'reso',
      domains: ['reso'],
      properties,
      source: 'RESO',
      sourceVersion: '2.0',
      createdAt: now,
      updatedAt: now,
    };
  });

  // Sort by property count (largest first)
  dataTypes.sort((a, b) => b.properties.length - a.properties.length);

  // Create categories from RESO Groups
  const categories = [
    {
      id: 'reso',
      name: 'RESO',
      description: 'RESO Data Dictionary 2.0',
      order: 0,
      color: '#2563EB',
    },
    ...Array.from(allGroups)
      .filter(g => g)
      .sort()
      .map((g, i) => ({
        id: slugify(g),
        name: g,
        description: `RESO ${g} group`,
        order: i + 1,
      })),
  ];

  // Write output files
  console.log(`\nWriting ${dataTypes.length} VocabTypes to ${OUTPUT_DATA_TYPES}`);
  fs.writeFileSync(OUTPUT_DATA_TYPES, JSON.stringify({ dataTypes }, null, 2));

  console.log(`Writing ${categories.length} categories to ${OUTPUT_CATEGORIES}`);
  fs.writeFileSync(OUTPUT_CATEGORIES, JSON.stringify(categories, null, 2));

  // Summary
  const totalProperties = dataTypes.reduce((sum, dt) => sum + dt.properties.length, 0);
  console.log('\n=== Conversion Complete ===');
  console.log(`VocabTypes: ${dataTypes.length}`);
  console.log(`Total Properties: ${totalProperties}`);
  console.log(`Categories: ${categories.length}`);
  console.log('\nTop 10 resources by field count:');
  dataTypes.slice(0, 10).forEach(dt => {
    console.log(`  ${dt.name}: ${dt.properties.length} properties`);
  });
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
