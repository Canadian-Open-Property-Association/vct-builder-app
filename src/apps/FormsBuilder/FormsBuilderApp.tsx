/**
 * Forms Builder App
 *
 * Main app component for the Forms Builder.
 * Build forms with standard fields and credential verification.
 * Forms can select proof templates from the VDR for VC verification.
 * Handles internal routing between forms list, form editor, submissions, etc.
 */

import { Routes, Route } from 'react-router-dom';
import { useAppTracking } from '../../hooks/useAppTracking';
import FormsList from './components/FormsList';
import FormBuilder from './components/FormBuilder';
import SubmissionsList from './components/SubmissionsList';
import SubmissionDetail from './components/SubmissionDetail';

export default function FormsBuilderApp() {
  useAppTracking('forms-builder', 'Forms Builder');

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <Routes>
        <Route path="/" element={<FormsList />} />
        <Route path="/new" element={<FormBuilder />} />
        <Route path="/edit/:id" element={<FormBuilder />} />
        <Route path="/submissions" element={<SubmissionsList />} />
        <Route path="/submissions/:id" element={<SubmissionDetail />} />
      </Routes>
    </div>
  );
}
