import { useHarmonizationStore } from '../../../store/harmonizationStore';

interface HarmonizationToolbarProps {
  onCreateMapping: () => void;
}

export default function HarmonizationToolbar({ onCreateMapping }: HarmonizationToolbarProps) {
  const { selectedEntityId, selectedVocabTypeId } = useHarmonizationStore();

  const canCreateMapping = selectedEntityId && selectedVocabTypeId;

  return (
    <div className="flex items-center justify-end px-4 py-3 bg-white border-b border-gray-200">
      <div className="flex items-center gap-2">
        <button
          onClick={onCreateMapping}
          disabled={!canCreateMapping}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            canCreateMapping
              ? 'bg-purple-600 text-white hover:bg-purple-700'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
          title={!canCreateMapping ? 'Select a furnisher and vocab type first' : 'Create new mapping'}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Mapping
        </button>
      </div>
    </div>
  );
}
