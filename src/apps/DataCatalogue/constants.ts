// Data Catalogue Constants

export const CANADIAN_REGIONS = [
  { value: 'AB', label: 'Alberta' },
  { value: 'BC', label: 'British Columbia' },
  { value: 'MB', label: 'Manitoba' },
  { value: 'NB', label: 'New Brunswick' },
  { value: 'NL', label: 'Newfoundland and Labrador' },
  { value: 'NS', label: 'Nova Scotia' },
  { value: 'NT', label: 'Northwest Territories' },
  { value: 'NU', label: 'Nunavut' },
  { value: 'ON', label: 'Ontario' },
  { value: 'PE', label: 'Prince Edward Island' },
  { value: 'QC', label: 'Quebec' },
  { value: 'SK', label: 'Saskatchewan' },
  { value: 'YT', label: 'Yukon' },
  { value: 'CA', label: 'Canada-wide' },
] as const;

export const DATA_TYPE_OPTIONS = [
  { value: 'string', label: 'String' },
  { value: 'number', label: 'Number' },
  { value: 'integer', label: 'Integer' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'date', label: 'Date' },
  { value: 'datetime', label: 'DateTime' },
  { value: 'array', label: 'Array' },
  { value: 'object', label: 'Object' },
  { value: 'uri', label: 'URI' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
] as const;

// Helper to get region label from value
export function getRegionLabel(value: string): string {
  const region = CANADIAN_REGIONS.find((r) => r.value === value);
  return region?.label ?? value;
}

// Helper to get data type label from value
export function getDataTypeLabel(value: string): string {
  const dataType = DATA_TYPE_OPTIONS.find((d) => d.value === value);
  return dataType?.label ?? value;
}
