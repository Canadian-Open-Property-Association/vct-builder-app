import { useState, useEffect } from 'react';
import { useDictionaryStore } from '../../../store/dictionaryStore';
import type { VocabType } from '../../../types/dictionary';

const FAVORITES_KEY = 'copa-dictionary-favorites';

export default function VocabTypeList() {
  const {
    selectedVocabType,
    selectVocabType,
    deleteVocabType,
    searchResults,
    getFilteredVocabTypes,
  } = useDictionaryStore();

  // Load favorites from localStorage
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Save favorites to localStorage when they change
  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
  }, [favorites]);

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Get filtered vocab types (respects search)
  const filteredTypes = getFilteredVocabTypes();

  // Sort: favorites first, then alphabetically
  const sortedTypes = [...filteredTypes].sort((a, b) => {
    const aFav = favorites.has(a.id);
    const bFav = favorites.has(b.id);
    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;
    return a.name.localeCompare(b.name);
  });

  // Split into favorites and others for visual grouping
  const favoriteTypes = sortedTypes.filter(vt => favorites.has(vt.id));
  const otherTypes = sortedTypes.filter(vt => !favorites.has(vt.id));

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this vocabulary type?')) {
      await deleteVocabType(id);
    }
  };

  const renderVocabTypeItem = (vt: VocabType) => {
    const isSelected = selectedVocabType?.id === vt.id;
    const isFavorite = favorites.has(vt.id);

    return (
      <div
        key={vt.id}
        onClick={() => selectVocabType(vt.id)}
        className={`group px-4 py-3 cursor-pointer border-b border-gray-100 hover:bg-gray-50 ${
          isSelected ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            {/* Favorite star button */}
            <button
              onClick={(e) => toggleFavorite(e, vt.id)}
              className={`mt-0.5 p-0.5 transition-colors ${
                isFavorite
                  ? 'text-yellow-500 hover:text-yellow-600'
                  : 'text-gray-300 hover:text-yellow-500'
              }`}
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <svg
                className="w-4 h-4"
                fill={isFavorite ? 'currentColor' : 'none'}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            </button>
            <div className="flex-1 min-w-0">
              <h3 className={`font-medium truncate ${isSelected ? 'text-blue-700' : 'text-gray-800'}`}>
                {vt.name}
              </h3>
              {vt.description && (
                <p className="text-xs text-gray-500 truncate mt-0.5">{vt.description}</p>
              )}
              <span className="text-xs text-gray-400 mt-1 block">
                {(vt.properties || []).length} properties
              </span>
            </div>
          </div>
          <button
            onClick={(e) => handleDelete(e, vt.id)}
            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Vocab types list */}
      {sortedTypes.length === 0 ? (
        <div className="p-4 text-center text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <p className="text-sm">
            {searchResults !== null
              ? 'No vocabulary types found'
              : 'No vocabulary types yet'
            }
          </p>
          {!searchResults && (
            <p className="text-xs mt-1">Click "Add Vocab Type" to create one</p>
          )}
        </div>
      ) : (
        <>
          {/* Favorites section */}
          {favoriteTypes.length > 0 && (
            <>
              <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-100">
                <span className="text-xs font-medium text-yellow-700 uppercase tracking-wide flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  Favorites ({favoriteTypes.length})
                </span>
              </div>
              {favoriteTypes.map(renderVocabTypeItem)}
            </>
          )}

          {/* Other types section */}
          {otherTypes.length > 0 && favoriteTypes.length > 0 && (
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                All Types ({otherTypes.length})
              </span>
            </div>
          )}
          {otherTypes.map(renderVocabTypeItem)}
        </>
      )}
    </div>
  );
}
