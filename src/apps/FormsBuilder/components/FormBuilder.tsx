/**
 * FormBuilder Component
 *
 * Form editor for creating and editing forms.
 * Supports adding sections, fields, and configuring form settings.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFormsStore } from '../../../store/formsStore';
import {
  FormField,
  FormFieldType,
  FormSection,
  FIELD_TYPE_LABELS,
  createEmptyField,
  createEmptySection,
} from '../../../types/forms';
import FormPreview from './FormPreview';
import CredentialFieldConfig from './CredentialFieldConfig';
import { useAutoSave } from '../hooks/useAutoSave';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Resizable divider component
function ResizableDivider({ onDrag }: { onDrag: (delta: number) => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startXRef.current = e.clientX;
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startXRef.current;
      startXRef.current = e.clientX;
      onDrag(delta);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onDrag]);

  return (
    <div
      className={`w-1 bg-gray-200 hover:bg-blue-400 cursor-col-resize flex-shrink-0 flex items-center justify-center transition-colors ${
        isDragging ? 'bg-blue-500' : ''
      }`}
      onMouseDown={handleMouseDown}
    >
      <div className="w-0.5 h-8 bg-gray-400 rounded" />
    </div>
  );
}

// Drag handle icon component
function DragHandle() {
  return (
    <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
      <circle cx="9" cy="6" r="1.5" />
      <circle cx="15" cy="6" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="18" r="1.5" />
      <circle cx="15" cy="18" r="1.5" />
    </svg>
  );
}

// Sortable section component
interface SortableSectionProps {
  section: FormSection;
  index: number;
  isSelected: boolean;
  showFormSettings: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function SortableSection({
  section,
  index,
  isSelected,
  showFormSettings,
  onSelect,
  onDelete,
}: SortableSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`p-3 rounded-lg cursor-pointer mb-2 ${
        isSelected && !showFormSettings
          ? 'bg-blue-100 border border-blue-300'
          : 'bg-white border border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <DragHandle />
          </button>
          <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-xs font-medium text-gray-500 bg-gray-100 rounded">
            {index + 1}
          </span>
          <span className="text-sm font-medium text-gray-700 truncate">
            {section.title || `Section ${index + 1}`}
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <span className="text-xs text-gray-400 ml-7">
        {section.fields.length} field{section.fields.length !== 1 ? 's' : ''}
      </span>
    </div>
  );
}

// Sortable field component
interface SortableFieldProps {
  field: FormField;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function SortableField({
  field,
  index,
  isSelected,
  onSelect,
  onDelete,
}: SortableFieldProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`p-4 rounded-lg border cursor-pointer ${
        isSelected
          ? 'bg-blue-50 border-blue-300'
          : 'bg-white border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2 flex-1">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded transition-colors mt-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            <DragHandle />
          </button>
          <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-xs font-medium text-gray-500 bg-gray-100 rounded mt-0.5">
            {index + 1}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                {FIELD_TYPE_LABELS[field.type]}
              </span>
              {field.required && (
                <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded">
                  Required
                </span>
              )}
            </div>
            <h4 className="font-medium text-gray-900">
              {field.label || 'Untitled Field'}
            </h4>
            {field.name && (
              <p className="text-xs text-gray-400 font-mono mt-1">
                {field.name}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function FormBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    currentForm,
    isLoading,
    error,
    fetchForm,
    updateForm,
    clearCurrentForm,
    updateCurrentFormSchema,
    updateCurrentFormTitle,
  } = useFormsStore();

  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showFormSettings, setShowFormSettings] = useState(false);
  const [formSettingsTab, setFormSettingsTab] = useState<'info' | 'success' | 'submission' | null>(null);

  // Panel widths for resizable layout
  const [sectionsPanelWidth, setSectionsPanelWidth] = useState(240);
  const [fieldSettingsPanelWidth, setFieldSettingsPanelWidth] = useState(320);

  // Panel width constraints
  const MIN_SECTIONS_WIDTH = 180;
  const MAX_SECTIONS_WIDTH = 400;
  const MIN_SETTINGS_WIDTH = 280;
  const MAX_SETTINGS_WIDTH = 500;

  // DnD sensors for drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle section reordering
  const handleSectionDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || !currentForm || active.id === over.id) return;

      const oldIndex = currentForm.schema.sections.findIndex((s) => s.id === active.id);
      const newIndex = currentForm.schema.sections.findIndex((s) => s.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newSections = arrayMove(currentForm.schema.sections, oldIndex, newIndex);
        updateCurrentFormSchema({ ...currentForm.schema, sections: newSections });
        setHasUnsavedChanges(true);
      }
    },
    [currentForm, updateCurrentFormSchema]
  );

  // Handle field reordering within a section
  const handleFieldDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || !currentForm || !selectedSectionId || active.id === over.id) return;

      const section = currentForm.schema.sections.find((s) => s.id === selectedSectionId);
      if (!section) return;

      const oldIndex = section.fields.findIndex((f) => f.id === active.id);
      const newIndex = section.fields.findIndex((f) => f.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newFields = arrayMove(section.fields, oldIndex, newIndex);
        const newSchema = {
          ...currentForm.schema,
          sections: currentForm.schema.sections.map((s) =>
            s.id === selectedSectionId ? { ...s, fields: newFields } : s
          ),
        };
        updateCurrentFormSchema(newSchema);
        setHasUnsavedChanges(true);
      }
    },
    [currentForm, selectedSectionId, updateCurrentFormSchema]
  );

  const handleSectionsDividerDrag = useCallback((delta: number) => {
    setSectionsPanelWidth((prev) =>
      Math.max(MIN_SECTIONS_WIDTH, Math.min(MAX_SECTIONS_WIDTH, prev + delta))
    );
  }, []);

  const handleSettingsDividerDrag = useCallback((delta: number) => {
    // Negative delta means dragging left (making settings panel wider)
    setFieldSettingsPanelWidth((prev) =>
      Math.max(MIN_SETTINGS_WIDTH, Math.min(MAX_SETTINGS_WIDTH, prev - delta))
    );
  }, []);

  // Fetch form on mount
  useEffect(() => {
    if (id) {
      fetchForm(id);
    }
    return () => {
      clearCurrentForm();
    };
  }, [id, fetchForm, clearCurrentForm]);

  // Auto-select first section
  useEffect(() => {
    if (currentForm?.schema.sections.length && !selectedSectionId) {
      setSelectedSectionId(currentForm.schema.sections[0].id);
    }
  }, [currentForm, selectedSectionId]);

  // Save form function
  const performSave = useCallback(async () => {
    if (!currentForm || !id) return;

    await updateForm(id, {
      title: currentForm.title,
      description: currentForm.description,
      schema: currentForm.schema,
    });
    setHasUnsavedChanges(false);
  }, [currentForm, id, updateForm]);

  // Auto-save hook
  const {
    isSaving: isAutoSaving,
    lastSaved,
    error: autoSaveError,
  } = useAutoSave({
    data: currentForm?.schema,
    onSave: performSave,
    delay: 2000,
    enabled: true,
    hasChanges: hasUnsavedChanges,
  });

  // Manual save
  const handleSave = useCallback(async () => {
    if (!currentForm || !id) return;

    setIsSaving(true);
    try {
      await performSave();
    } catch (err) {
      // Error is handled in store
    } finally {
      setIsSaving(false);
    }
  }, [currentForm, id, performSave]);

  // Add a new section
  const handleAddSection = () => {
    if (!currentForm) return;
    const newSection = createEmptySection();
    const newSchema = {
      ...currentForm.schema,
      sections: [...currentForm.schema.sections, newSection],
    };
    updateCurrentFormSchema(newSchema);
    setSelectedSectionId(newSection.id);
    setHasUnsavedChanges(true);
  };

  // Delete a section
  const handleDeleteSection = (sectionId: string) => {
    if (!currentForm) return;
    if (currentForm.schema.sections.length <= 1) {
      alert('Cannot delete the last section');
      return;
    }
    const newSchema = {
      ...currentForm.schema,
      sections: currentForm.schema.sections.filter((s) => s.id !== sectionId),
    };
    updateCurrentFormSchema(newSchema);
    if (selectedSectionId === sectionId) {
      setSelectedSectionId(newSchema.sections[0]?.id || null);
    }
    setHasUnsavedChanges(true);
  };

  // Update section title
  const handleUpdateSectionTitle = (sectionId: string, title: string) => {
    if (!currentForm) return;
    const newSchema = {
      ...currentForm.schema,
      sections: currentForm.schema.sections.map((s) =>
        s.id === sectionId ? { ...s, title } : s
      ),
    };
    updateCurrentFormSchema(newSchema);
    setHasUnsavedChanges(true);
  };

  // Add a field to the selected section
  const handleAddField = (type: FormFieldType) => {
    if (!currentForm || !selectedSectionId) return;
    const newField = createEmptyField(type);
    const newSchema = {
      ...currentForm.schema,
      sections: currentForm.schema.sections.map((s) =>
        s.id === selectedSectionId
          ? { ...s, fields: [...s.fields, newField] }
          : s
      ),
    };
    updateCurrentFormSchema(newSchema);
    setSelectedFieldId(newField.id);
    setHasUnsavedChanges(true);
  };

  // Update a field
  const handleUpdateField = (sectionId: string, fieldId: string, updates: Partial<FormField>) => {
    if (!currentForm) return;
    const newSchema = {
      ...currentForm.schema,
      sections: currentForm.schema.sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              fields: s.fields.map((f) =>
                f.id === fieldId ? { ...f, ...updates } : f
              ),
            }
          : s
      ),
    };
    updateCurrentFormSchema(newSchema);
    setHasUnsavedChanges(true);
  };

  // Delete a field
  const handleDeleteField = (sectionId: string, fieldId: string) => {
    if (!currentForm) return;
    const newSchema = {
      ...currentForm.schema,
      sections: currentForm.schema.sections.map((s) =>
        s.id === sectionId
          ? { ...s, fields: s.fields.filter((f) => f.id !== fieldId) }
          : s
      ),
    };
    updateCurrentFormSchema(newSchema);
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }
    setHasUnsavedChanges(true);
  };

  // Update info screen
  const handleUpdateInfoScreen = (updates: Partial<{ enabled: boolean; title: string; content: string }>) => {
    if (!currentForm) return;
    // Handle backwards compatibility - infoScreen might be null for old forms
    const currentInfoScreen = currentForm.schema.infoScreen || { enabled: false, title: '', content: '' };
    const newSchema = {
      ...currentForm.schema,
      infoScreen: { ...currentInfoScreen, ...updates },
    };
    updateCurrentFormSchema(newSchema);
    setHasUnsavedChanges(true);
  };

  // Update success screen
  const handleUpdateSuccessScreen = (updates: Partial<{ enabled: boolean; title: string; content: string }>) => {
    if (!currentForm) return;
    // Handle backwards compatibility - ensure successScreen has enabled field
    const currentSuccessScreen = currentForm.schema.successScreen || { enabled: true, title: '', content: '' };
    // If enabled field is missing (old schema), add it with default true
    const successScreenWithEnabled = {
      enabled: currentSuccessScreen.enabled ?? true,
      title: currentSuccessScreen.title || '',
      content: currentSuccessScreen.content || '',
    };
    const newSchema = {
      ...currentForm.schema,
      successScreen: { ...successScreenWithEnabled, ...updates },
    };
    updateCurrentFormSchema(newSchema);
    setHasUnsavedChanges(true);
  };

  // Get selected section
  const selectedSection = currentForm?.schema.sections.find(
    (s) => s.id === selectedSectionId
  );

  // Get selected field
  const selectedField = selectedSection?.fields.find(
    (f) => f.id === selectedFieldId
  );

  if (isLoading && !currentForm) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      </div>
    );
  }

  if (!currentForm) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
          Form not found
        </div>
      </div>
    );
  }

  // Published forms - show read-only view
  if (currentForm.status === 'published') {
    const publicUrl = `${window.location.origin}/f/${currentForm.slug}`;

    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="border-b bg-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/apps/forms-builder')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Back to forms"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-gray-900">{currentForm.title}</h1>
                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                  Published
                </span>
              </div>
              {currentForm.description && (
                <p className="text-sm text-gray-500">{currentForm.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPreview(true)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Preview
            </button>
          </div>
        </div>

        {/* Public URL Banner */}
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <div>
                <p className="text-sm font-medium text-blue-800">Public Form URL</p>
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 hover:underline font-mono text-sm"
                >
                  {publicUrl}
                </a>
              </div>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(publicUrl);
                // Could add a toast notification here
              }}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              Copy URL
            </button>
          </div>
        </div>

        {/* Read-only info banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
          <p className="text-sm text-amber-800 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            This form is published and cannot be edited. Clone it to create a new draft for editing.
          </p>
        </div>

        {/* Main content - read-only view */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sections sidebar */}
          <div className="w-64 border-r bg-gray-50 flex flex-col">
            <div className="p-4 border-b bg-white">
              <h3 className="font-semibold text-gray-700">Sections</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {currentForm.schema.sections.map((section, index) => (
                <div
                  key={section.id}
                  onClick={() => {
                    setSelectedSectionId(section.id);
                    setSelectedFieldId(null);
                  }}
                  className={`p-3 rounded-lg cursor-pointer mb-2 ${
                    selectedSectionId === section.id
                      ? 'bg-blue-100 border border-blue-300'
                      : 'bg-white border border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-sm font-medium text-gray-700 truncate block">
                    {section.title || `Section ${index + 1}`}
                  </span>
                  <span className="text-xs text-gray-400">
                    {section.fields.length} field{section.fields.length !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Fields area - read-only */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedSection && (
              <>
                {/* Section header */}
                <div className="p-4 border-b bg-white">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {selectedSection.title || 'Untitled Section'}
                  </h2>
                  {selectedSection.description && (
                    <p className="text-sm text-gray-500 mt-1">{selectedSection.description}</p>
                  )}
                </div>

                {/* Fields list */}
                <div className="flex-1 overflow-y-auto p-4">
                  {selectedSection.fields.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>No fields in this section</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedSection.fields.map((field) => (
                        <div
                          key={field.id}
                          onClick={() => setSelectedFieldId(field.id)}
                          className={`p-4 rounded-lg border cursor-pointer ${
                            selectedFieldId === field.id
                              ? 'bg-blue-50 border-blue-300'
                              : 'bg-white border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                                  {FIELD_TYPE_LABELS[field.type]}
                                </span>
                                {field.required && (
                                  <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded">
                                    Required
                                  </span>
                                )}
                              </div>
                              <h4 className="font-medium text-gray-900">
                                {field.label || 'Untitled Field'}
                              </h4>
                              {field.name && (
                                <p className="text-xs text-gray-400 font-mono mt-1">
                                  {field.name}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Field details sidebar - read-only */}
          {selectedField && (
            <div className="w-80 border-l bg-white overflow-y-auto">
              <div className="p-4 border-b">
                <h3 className="font-semibold text-gray-700">Field Details</h3>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Label</label>
                  <p className="text-gray-900">{selectedField.label || 'Untitled Field'}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Field Name</label>
                  <p className="text-gray-900 font-mono text-sm">{selectedField.name}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                  <p className="text-gray-900">{FIELD_TYPE_LABELS[selectedField.type]}</p>
                </div>
                {selectedField.placeholder && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Placeholder</label>
                    <p className="text-gray-900">{selectedField.placeholder}</p>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Required</label>
                  <p className="text-gray-900">{selectedField.required ? 'Yes' : 'No'}</p>
                </div>
                {selectedField.description && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                    <p className="text-gray-900 text-sm">{selectedField.description}</p>
                  </div>
                )}
                {selectedField.options && selectedField.options.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Options</label>
                    <ul className="space-y-1">
                      {selectedField.options.map((option, idx) => (
                        <li key={idx} className="text-sm text-gray-900 flex items-center gap-2">
                          <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                          {option.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Preview Modal */}
        {showPreview && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
            <div className="bg-white w-full h-full max-w-4xl max-h-[90vh] rounded-xl shadow-2xl overflow-hidden flex flex-col">
              <FormPreview
                schema={currentForm.schema}
                title={currentForm.title}
                description={currentForm.description}
                onClose={() => setShowPreview(false)}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/apps/forms-builder')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Back to forms"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <input
              type="text"
              value={currentForm.title}
              onChange={(e) => {
                updateCurrentFormTitle(e.target.value);
                setHasUnsavedChanges(true);
              }}
              className="text-lg font-semibold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1 -ml-1"
              placeholder="Form Title"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Status indicator */}
          {isAutoSaving ? (
            <span className="text-sm text-blue-600 flex items-center gap-1">
              <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-600 border-t-transparent"></div>
              Saving...
            </span>
          ) : hasUnsavedChanges ? (
            <span className="text-sm text-amber-600">Unsaved changes</span>
          ) : lastSaved ? (
            <span className="text-sm text-green-600 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Saved
            </span>
          ) : null}
          {autoSaveError && (
            <span className="text-sm text-red-600" title={autoSaveError}>
              Auto-save failed
            </span>
          )}
          <button
            onClick={() => setShowPreview(true)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Preview
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || isAutoSaving || !hasUnsavedChanges}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving && (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            )}
            Save
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sections sidebar */}
        <div
          className="bg-gray-50 flex flex-col flex-shrink-0"
          style={{ width: `${sectionsPanelWidth}px` }}
        >
          <div className="p-4 border-b bg-white">
            <h3 className="font-semibold text-gray-700 mb-2">Sections</h3>
            <button
              onClick={handleAddSection}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Section
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleSectionDragEnd}
            >
              <SortableContext
                items={currentForm.schema.sections.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                {currentForm.schema.sections.map((section, index) => (
                  <SortableSection
                    key={section.id}
                    section={section}
                    index={index}
                    isSelected={selectedSectionId === section.id}
                    showFormSettings={showFormSettings}
                    onSelect={() => {
                      setSelectedSectionId(section.id);
                      setSelectedFieldId(null);
                      setShowFormSettings(false);
                    }}
                    onDelete={() => handleDeleteSection(section.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>

            {/* Form Settings Section */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              {/* Form Settings Header */}
              <button
                onClick={() => {
                  setShowFormSettings(!showFormSettings);
                  if (!showFormSettings) {
                    setSelectedFieldId(null);
                    if (!formSettingsTab) {
                      setFormSettingsTab('info');
                    }
                  } else {
                    setFormSettingsTab(null);
                  }
                }}
                className={`w-full p-3 rounded-lg cursor-pointer flex items-center justify-between ${
                  showFormSettings
                    ? 'bg-purple-100 border border-purple-300'
                    : 'bg-white border border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">Form Settings</span>
                </div>
                <svg
                  className={`w-4 h-4 text-gray-500 transition-transform ${showFormSettings ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Form Settings Sub-items */}
              {showFormSettings && (
                <div className="mt-2 space-y-1 pl-2">
                  <button
                    onClick={() => {
                      setFormSettingsTab('info');
                      setSelectedFieldId(null);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm rounded-lg flex items-center gap-2 transition-colors ${
                      formSettingsTab === 'info'
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Info Screen
                  </button>
                  <button
                    onClick={() => {
                      setFormSettingsTab('success');
                      setSelectedFieldId(null);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm rounded-lg flex items-center gap-2 transition-colors ${
                      formSettingsTab === 'success'
                        ? 'bg-green-50 text-green-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Success Screen
                  </button>
                  <button
                    onClick={() => {
                      setFormSettingsTab('submission');
                      setSelectedFieldId(null);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm rounded-lg flex items-center gap-2 transition-colors ${
                      formSettingsTab === 'submission'
                        ? 'bg-amber-50 text-amber-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Submission Logic
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Resizable divider between sections and fields */}
        <ResizableDivider onDrag={handleSectionsDividerDrag} />

        {/* Fields area / Form Settings area */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Form Settings View - Tab Content */}
          {showFormSettings && formSettingsTab && (
            <div className="flex-1 overflow-y-auto p-6">
              {/* Info Screen Tab */}
              {formSettingsTab === 'info' && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <h3 className="font-semibold text-gray-800">Info Screen</h3>
                    </div>
                    {/* Toggle Switch */}
                    <button
                      type="button"
                      onClick={() => handleUpdateInfoScreen({ enabled: !(currentForm.schema.infoScreen?.enabled ?? false) })}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        currentForm.schema.infoScreen?.enabled ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          currentForm.schema.infoScreen?.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    {currentForm.schema.infoScreen?.enabled
                      ? 'This screen will be shown before the form.'
                      : 'Enable to show an info screen before the form.'}
                  </p>
                  {currentForm.schema.infoScreen?.enabled && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Title
                        </label>
                        <input
                          type="text"
                          value={currentForm.schema.infoScreen?.title || ''}
                          onChange={(e) => handleUpdateInfoScreen({ title: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., Before You Begin"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Content
                        </label>
                        <textarea
                          value={currentForm.schema.infoScreen?.content || ''}
                          onChange={(e) => handleUpdateInfoScreen({ content: e.target.value })}
                          rows={6}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y min-h-[150px]"
                          placeholder="Instructions or information to display before the form..."
                        />
                        <p className="text-xs text-gray-400 mt-1">Markdown is supported</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Success Screen Tab */}
              {formSettingsTab === 'success' && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <h3 className="font-semibold text-gray-800">Success Screen</h3>
                    </div>
                    {/* Toggle Switch */}
                    <button
                      type="button"
                      onClick={() => {
                        const currentEnabled = currentForm.schema.successScreen?.enabled ?? true;
                        handleUpdateSuccessScreen({ enabled: !currentEnabled });
                      }}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                        (currentForm.schema.successScreen?.enabled ?? true) ? 'bg-green-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          (currentForm.schema.successScreen?.enabled ?? true) ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    {(currentForm.schema.successScreen?.enabled ?? true)
                      ? 'This screen will be shown after successful form submission.'
                      : 'Enable to show a success screen after submission.'}
                  </p>
                  {(currentForm.schema.successScreen?.enabled ?? true) && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Title
                        </label>
                        <input
                          type="text"
                          value={currentForm.schema.successScreen?.title || ''}
                          onChange={(e) => handleUpdateSuccessScreen({ title: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., Thank you!"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Content
                        </label>
                        <textarea
                          value={currentForm.schema.successScreen?.content || ''}
                          onChange={(e) => handleUpdateSuccessScreen({ content: e.target.value })}
                          rows={6}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y min-h-[150px]"
                          placeholder="Message to display after successful submission..."
                        />
                        <p className="text-xs text-gray-400 mt-1">Markdown is supported</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Submission Logic Tab */}
              {formSettingsTab === 'submission' && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <h3 className="font-semibold text-gray-800">Submission Logic</h3>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    Configure what happens after successful form submission.
                  </p>

                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-sm text-amber-800">
                        <p className="font-medium">Governance Configuration</p>
                        <p className="mt-1">These settings define what SHOULD happen on successful submission. Actual credential/badge issuance requires integration with an issuance service.</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* Credential Issuance */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                        </svg>
                        <h4 className="font-medium text-gray-800">Issue Credential</h4>
                      </div>
                      <p className="text-sm text-gray-500 mb-3">
                        Issue a verifiable credential to the form submitter.
                      </p>
                      <div className="p-4 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-center text-sm text-gray-500">
                        <svg className="w-8 h-8 mx-auto text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        <p>Credential issuance configuration coming soon</p>
                      </div>
                    </div>

                    {/* Badge Issuance */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                        <h4 className="font-medium text-gray-800">Issue Badge</h4>
                      </div>
                      <p className="text-sm text-gray-500 mb-3">
                        Award a badge to the form submitter.
                      </p>
                      <div className="p-4 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-center text-sm text-gray-500">
                        <svg className="w-8 h-8 mx-auto text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                        <p>Badge issuance configuration coming soon</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section Fields View */}
          {selectedSection && !showFormSettings && (
            <>
              {/* Section header */}
              <div className="p-4 border-b bg-white">
                <input
                  type="text"
                  value={selectedSection.title}
                  onChange={(e) => handleUpdateSectionTitle(selectedSection.id, e.target.value)}
                  className="text-lg font-semibold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1 -ml-1 w-full"
                  placeholder="Section Title"
                />
              </div>

              {/* Fields list */}
              <div className="flex-1 overflow-y-auto p-4">
                {selectedSection.fields.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p className="mb-4">No fields in this section</p>
                    <p className="text-sm">Add fields using the toolbar below</p>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleFieldDragEnd}
                  >
                    <SortableContext
                      items={selectedSection.fields.map((f) => f.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-3">
                        {selectedSection.fields.map((field, fieldIndex) => (
                          <SortableField
                            key={field.id}
                            field={field}
                            index={fieldIndex}
                            isSelected={selectedFieldId === field.id}
                            onSelect={() => setSelectedFieldId(field.id)}
                            onDelete={() => handleDeleteField(selectedSection.id, field.id)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>

              {/* Add field toolbar */}
              <div className="p-4 border-t bg-white">
                <p className="text-sm text-gray-500 mb-2">Add Field</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(FIELD_TYPE_LABELS) as [FormFieldType, string][]).map(
                    ([type, label]) => (
                      <button
                        key={type}
                        onClick={() => handleAddField(type)}
                        className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                      >
                        {label}
                      </button>
                    )
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Resizable divider between fields and settings (only when field is selected) */}
        {selectedField && <ResizableDivider onDrag={handleSettingsDividerDrag} />}

        {/* Field editor sidebar */}
        {selectedField && (
          <div
            className="bg-white flex flex-col min-h-0 flex-shrink-0"
            style={{ width: `${fieldSettingsPanelWidth}px` }}
          >
            <div className="p-4 border-b flex-shrink-0">
              <h3 className="font-semibold text-gray-700">Field Settings</h3>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* Label */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Label
                </label>
                <input
                  type="text"
                  value={selectedField.label}
                  onChange={(e) =>
                    handleUpdateField(selectedSectionId!, selectedField.id, {
                      label: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Field Label"
                />
              </div>

              {/* Name (JSON key) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Field Name (JSON key)
                </label>
                <input
                  type="text"
                  value={selectedField.name}
                  onChange={(e) =>
                    handleUpdateField(selectedSectionId!, selectedField.id, {
                      name: e.target.value.replace(/\s/g, '_').toLowerCase(),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  placeholder="field_name"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={selectedField.type}
                  onChange={(e) =>
                    handleUpdateField(selectedSectionId!, selectedField.id, {
                      type: e.target.value as FormFieldType,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {(Object.entries(FIELD_TYPE_LABELS) as [FormFieldType, string][]).map(
                    ([type, label]) => (
                      <option key={type} value={type}>
                        {label}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* Placeholder */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Placeholder
                </label>
                <input
                  type="text"
                  value={selectedField.placeholder || ''}
                  onChange={(e) =>
                    handleUpdateField(selectedSectionId!, selectedField.id, {
                      placeholder: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Placeholder text..."
                />
              </div>

              {/* Required */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="required"
                  checked={selectedField.required}
                  onChange={(e) =>
                    handleUpdateField(selectedSectionId!, selectedField.id, {
                      required: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="required" className="text-sm text-gray-700">
                  Required field
                </label>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={selectedField.description || ''}
                  onChange={(e) =>
                    handleUpdateField(selectedSectionId!, selectedField.id, {
                      description: e.target.value,
                    })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y min-h-[80px]"
                  placeholder="Help text for this field..."
                />
              </div>

              {/* Options (for select, radio, checkbox) */}
              {['select', 'radio', 'checkbox'].includes(selectedField.type) && (
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Options
                    </label>
                    <button
                      onClick={() => {
                        const currentOptions = selectedField.options || [];
                        handleUpdateField(selectedSectionId!, selectedField.id, {
                          options: [
                            ...currentOptions,
                            { label: '' },
                          ],
                        });
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      + Add Option
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(selectedField.options || []).map((option, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={option.label}
                          onChange={(e) => {
                            const newOptions = [...(selectedField.options || [])];
                            newOptions[index] = {
                              ...newOptions[index],
                              label: e.target.value,
                            };
                            handleUpdateField(selectedSectionId!, selectedField.id, {
                              options: newOptions,
                            });
                          }}
                          className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Option label"
                        />
                        <button
                          onClick={() => {
                            const newOptions = (selectedField.options || []).filter(
                              (_, i) => i !== index
                            );
                            handleUpdateField(selectedSectionId!, selectedField.id, {
                              options: newOptions,
                            });
                          }}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    {(!selectedField.options || selectedField.options.length === 0) && (
                      <p className="text-sm text-gray-400 text-center py-2">
                        No options defined
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Verifiable Credential Configuration */}
              {selectedField.type === 'verifiable-credential' && (
                <CredentialFieldConfig
                  field={selectedField}
                  onUpdate={(updates) => handleUpdateField(selectedSectionId!, selectedField.id, updates)}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {showPreview && currentForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <FormPreview
              schema={currentForm.schema}
              title={currentForm.title}
              description={currentForm.description}
              onClose={() => setShowPreview(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
