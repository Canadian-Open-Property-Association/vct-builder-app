/**
 * Proof Templates Builder App
 *
 * Main app component for the Proof Templates Builder.
 * Handles internal routing between templates list and template editor.
 */

import { Routes, Route } from 'react-router-dom';
import { useAppTracking } from '../../hooks/useAppTracking';
import TemplatesList from './components/TemplatesList';
import TemplateBuilder from './components/TemplateBuilder';

export default function ProofTemplatesApp() {
  useAppTracking('proofs-template-builder', 'Proof Templates Builder');

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <Routes>
        <Route path="/" element={<TemplatesList />} />
        <Route path="/new" element={<TemplateBuilder />} />
        <Route path="/edit/:id" element={<TemplateBuilder />} />
      </Routes>
    </div>
  );
}
