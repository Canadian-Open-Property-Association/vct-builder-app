/**
 * Attribute Form
 *
 * Middle panel showing a form for filling in credential attribute values.
 * Includes a "Randomize All" button to fill fields with fake data.
 */

import { useState, useEffect, useMemo } from 'react';
import { faker } from '@faker-js/faker';
import type { CatalogueCredential } from '../../../types/catalogue';

interface AttributeFormProps {
  credential: CatalogueCredential | null;
  onGenerateOffer: (attributeValues: Record<string, string>) => void;
  isGenerating: boolean;
}

/**
 * Generate a random value based on attribute name patterns
 */
const generateRandomValue = (attributeName: string): string => {
  const normalized = attributeName.toLowerCase().replace(/[_-]/g, '');

  // Name patterns
  if (normalized.includes('firstname') || normalized.includes('givenname')) {
    return faker.person.firstName();
  }
  if (normalized.includes('lastname') || normalized.includes('surname') || normalized.includes('familyname')) {
    return faker.person.lastName();
  }
  if (normalized.includes('fullname') || normalized === 'name') {
    return faker.person.fullName();
  }
  if (normalized.includes('middlename')) {
    return faker.person.middleName();
  }

  // Date patterns
  if (normalized.includes('dateofbirth') || normalized.includes('dob') || normalized.includes('birthdate')) {
    return faker.date.birthdate({ min: 18, max: 80, mode: 'age' }).toISOString().split('T')[0];
  }
  if (normalized.includes('expirydate') || normalized.includes('expiration') || normalized.includes('validuntil')) {
    return faker.date.future({ years: 5 }).toISOString().split('T')[0];
  }
  if (normalized.includes('issuedate') || normalized.includes('issuancedate') || normalized.includes('dateissued')) {
    return faker.date.past({ years: 1 }).toISOString().split('T')[0];
  }
  if (normalized.includes('date') || normalized.includes('timestamp')) {
    return faker.date.recent().toISOString().split('T')[0];
  }

  // Contact patterns
  if (normalized.includes('email')) {
    return faker.internet.email();
  }
  if (normalized.includes('phone') || normalized.includes('tel') || normalized.includes('mobile')) {
    return faker.phone.number();
  }

  // Address patterns
  if (normalized.includes('streetaddress') || normalized.includes('address')) {
    return faker.location.streetAddress();
  }
  if (normalized.includes('city')) {
    return faker.location.city();
  }
  if (normalized.includes('state') || normalized.includes('province')) {
    return faker.location.state();
  }
  if (normalized.includes('country')) {
    return faker.location.country();
  }
  if (normalized.includes('postalcode') || normalized.includes('zipcode') || normalized.includes('zip')) {
    return faker.location.zipCode();
  }

  // ID patterns
  if (normalized.includes('licencenumber') || normalized.includes('licensenumber') || normalized.includes('licenceno')) {
    return faker.string.alphanumeric(10).toUpperCase();
  }
  if (normalized.includes('id') && (normalized.includes('number') || normalized.includes('num') || normalized.includes('no'))) {
    return faker.string.alphanumeric(12).toUpperCase();
  }
  if (normalized.includes('ssn') || normalized.includes('sin') || normalized.includes('socialsecurity')) {
    return faker.string.numeric(9);
  }

  // Business patterns
  if (normalized.includes('businessname') || normalized.includes('companyname') || normalized.includes('organization')) {
    return faker.company.name();
  }
  if (normalized.includes('jobtitle') || normalized.includes('title') || normalized.includes('position')) {
    return faker.person.jobTitle();
  }
  if (normalized.includes('department')) {
    return faker.commerce.department();
  }

  // Document patterns
  if (normalized.includes('document') || normalized.includes('type')) {
    return faker.helpers.arrayElement(['Passport', 'Driver License', 'ID Card', 'Birth Certificate']);
  }
  if (normalized.includes('class') || normalized.includes('category')) {
    return faker.helpers.arrayElement(['Class A', 'Class B', 'Class C', 'Standard', 'Premium']);
  }

  // Boolean patterns
  if (normalized.includes('isvalid') || normalized.includes('active') || normalized.includes('enabled')) {
    return faker.helpers.arrayElement(['true', 'false']);
  }

  // Numeric patterns
  if (normalized.includes('age')) {
    return faker.number.int({ min: 18, max: 80 }).toString();
  }
  if (normalized.includes('amount') || normalized.includes('price') || normalized.includes('cost')) {
    return faker.finance.amount({ min: 100, max: 10000, dec: 2 });
  }
  if (normalized.includes('year')) {
    return faker.date.past({ years: 20 }).getFullYear().toString();
  }

  // Default - generate a realistic word/phrase
  return faker.lorem.words(faker.number.int({ min: 1, max: 3 }));
};

/**
 * Format attribute name for display (e.g., "first_name" -> "First Name")
 */
const formatAttributeName = (name: string): string => {
  return name
    .replace(/[_-]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

export default function AttributeForm({
  credential,
  onGenerateOffer,
  isGenerating,
}: AttributeFormProps) {
  const [values, setValues] = useState<Record<string, string>>({});

  // Reset form when credential changes
  useEffect(() => {
    if (credential) {
      const initialValues: Record<string, string> = {};
      credential.attributes.forEach((attr) => {
        initialValues[attr] = '';
      });
      setValues(initialValues);
    } else {
      setValues({});
    }
  }, [credential?.id]);

  // Check if all required fields are filled
  const isFormValid = useMemo(() => {
    if (!credential) return false;
    return credential.attributes.every((attr) => values[attr]?.trim());
  }, [credential, values]);

  // Handle value change
  const handleChange = (attribute: string, value: string) => {
    setValues((prev) => ({ ...prev, [attribute]: value }));
  };

  // Randomize all fields
  const handleRandomizeAll = () => {
    if (!credential) return;

    const randomValues: Record<string, string> = {};
    credential.attributes.forEach((attr) => {
      randomValues[attr] = generateRandomValue(attr);
    });
    setValues(randomValues);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormValid && !isGenerating) {
      onGenerateOffer(values);
    }
  };

  if (!credential) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Credential</h3>
          <p className="text-sm text-gray-500 max-w-[300px] mx-auto">
            Choose a credential from the left panel to fill in the attribute values and generate a
            credential offer.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{credential.name}</h2>
            <p className="text-xs text-gray-500">v{credential.version}</p>
          </div>
          <button
            type="button"
            onClick={handleRandomizeAll}
            className="px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-100 rounded-lg hover:bg-purple-200 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Randomize All
          </button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {credential.attributes.map((attr) => (
            <div key={attr}>
              <label
                htmlFor={attr}
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {formatAttributeName(attr)}
              </label>
              <input
                type="text"
                id={attr}
                value={values[attr] || ''}
                onChange={(e) => handleChange(attr, e.target.value)}
                placeholder={`Enter ${formatAttributeName(attr).toLowerCase()}`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          ))}
        </div>

        {/* Footer with Generate Button */}
        <div className="p-4 border-t border-gray-200 flex-shrink-0">
          <button
            type="submit"
            disabled={!isFormValid || isGenerating}
            className="w-full px-4 py-3 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <svg
                  className="animate-spin h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Generating Offer...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                  />
                </svg>
                Generate Offer
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
