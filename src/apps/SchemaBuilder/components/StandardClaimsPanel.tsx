/**
 * StandardClaimsPanel Component
 *
 * Allows users to configure which standard SD-JWT VC claims to include
 * in the generated schema, and whether each claim is required or optional.
 */

import { useSchemaStore } from '../../../store/schemaStore';
import { StandardClaimsConfig, DEFAULT_STANDARD_CLAIMS } from '../../../types/schema';

interface ClaimRowProps {
  name: string;
  label: string;
  description: string;
  enabled: boolean;
  required: boolean;
  canToggleEnabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onRequiredChange: (required: boolean) => void;
}

function ClaimRow({
  name,
  label,
  description,
  enabled,
  required,
  canToggleEnabled,
  onEnabledChange,
  onRequiredChange,
}: ClaimRowProps) {
  return (
    <div className={`flex items-center justify-between py-2 px-3 rounded ${enabled ? 'bg-white' : 'bg-gray-50'}`}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {canToggleEnabled ? (
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onEnabledChange(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
        ) : (
          <div className="w-4 h-4 flex items-center justify-center">
            <div className="w-2 h-2 bg-blue-500 rounded-full" title="Always included" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <code className={`text-sm font-mono ${enabled ? 'text-gray-900' : 'text-gray-400'}`}>
              {name}
            </code>
            <span className={`text-sm ${enabled ? 'text-gray-600' : 'text-gray-400'}`}>
              {label}
            </span>
          </div>
          <p className={`text-xs ${enabled ? 'text-gray-500' : 'text-gray-400'} truncate`}>
            {description}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 ml-4">
        <label className={`text-xs ${enabled ? 'text-gray-600' : 'text-gray-400'}`}>
          Required
        </label>
        <input
          type="checkbox"
          checked={required}
          onChange={(e) => onRequiredChange(e.target.checked)}
          disabled={!enabled}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
        />
      </div>
    </div>
  );
}

export default function StandardClaimsPanel() {
  const { metadata, updateMetadata } = useSchemaStore();

  // Get current claims config or use defaults
  const claims = metadata.standardClaims || DEFAULT_STANDARD_CLAIMS;

  // Update a specific claim's configuration
  const updateClaim = (
    claimName: keyof StandardClaimsConfig,
    updates: { enabled?: boolean; required?: boolean }
  ) => {
    const currentClaim = claims[claimName];
    const updatedClaims: StandardClaimsConfig = {
      ...claims,
      [claimName]: {
        ...currentClaim,
        ...updates,
      },
    };
    updateMetadata({ standardClaims: updatedClaims });
  };

  // Core claims data (always included)
  const coreClaims = [
    {
      name: 'iss',
      label: 'Issuer',
      description: 'URI identifying the issuer of the credential',
    },
    {
      name: 'iat',
      label: 'Issued At',
      description: 'Unix timestamp when the credential was issued',
    },
    {
      name: 'vct',
      label: 'Credential Type',
      description: 'URI identifying the verifiable credential type',
    },
    {
      name: 'exp',
      label: 'Expiration',
      description: 'Unix timestamp when the credential expires',
    },
  ] as const;

  // Optional claims data
  const optionalClaims = [
    {
      name: 'nbf',
      label: 'Not Before',
      description: 'Unix timestamp before which the credential is not valid',
    },
    {
      name: 'sub',
      label: 'Subject',
      description: 'Identifier for the subject of the credential',
    },
    {
      name: 'jti',
      label: 'JWT ID',
      description: 'Unique identifier for the credential',
    },
    {
      name: 'cnf',
      label: 'Confirmation',
      description: 'Holder binding confirmation claim with JWK',
    },
    {
      name: 'status',
      label: 'Status',
      description: 'Credential revocation status information',
    },
  ] as const;

  // Only show this panel in JSON Schema mode (SD-JWT VC)
  if (metadata.mode !== 'json-schema') {
    return null;
  }

  return (
    <div className="border-b border-gray-200">
      {/* Header */}
      <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-700">Standard Claims</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Configure which SD-JWT VC claims to include
        </p>
      </div>

      {/* Core Claims Section */}
      <div className="p-2">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide px-3 py-1">
          Core Claims
        </div>
        <div className="space-y-1">
          {coreClaims.map((claim) => (
            <ClaimRow
              key={claim.name}
              name={claim.name}
              label={claim.label}
              description={claim.description}
              enabled={true}
              required={claims[claim.name].required}
              canToggleEnabled={false}
              onEnabledChange={() => {}}
              onRequiredChange={(required) =>
                updateClaim(claim.name, { required })
              }
            />
          ))}
        </div>
      </div>

      {/* Optional Claims Section */}
      <div className="p-2 border-t border-gray-100">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide px-3 py-1">
          Optional Claims
        </div>
        <div className="space-y-1">
          {optionalClaims.map((claim) => {
            const claimConfig = claims[claim.name];
            return (
              <ClaimRow
                key={claim.name}
                name={claim.name}
                label={claim.label}
                description={claim.description}
                enabled={claimConfig.enabled}
                required={claimConfig.required}
                canToggleEnabled={true}
                onEnabledChange={(enabled) =>
                  updateClaim(claim.name, {
                    enabled,
                    // If disabling, also set required to false
                    required: enabled ? claimConfig.required : false,
                  })
                }
                onRequiredChange={(required) =>
                  updateClaim(claim.name, { required })
                }
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
