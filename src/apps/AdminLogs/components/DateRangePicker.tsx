import { useState } from 'react';
import { DateRange } from '../../../store/adminStore';

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

type Preset = 'today' | '7d' | '30d' | '90d' | 'custom';

const presets: { key: Preset; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: '90d', label: '90 Days' },
  { key: 'custom', label: 'Custom' },
];

const getPresetDates = (preset: Preset): { startDate: string; endDate: string } => {
  const end = new Date();
  const start = new Date();
  const endStr = end.toISOString().split('T')[0] + 'T23:59:59.999Z';

  switch (preset) {
    case 'today':
      return {
        startDate: end.toISOString().split('T')[0],
        endDate: endStr,
      };
    case '7d':
      start.setDate(start.getDate() - 7);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: endStr,
      };
    case '30d':
      start.setDate(start.getDate() - 30);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: endStr,
      };
    case '90d':
      start.setDate(start.getDate() - 90);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: endStr,
      };
    default:
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: endStr,
      };
  }
};

export default function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [showCustom, setShowCustom] = useState(value.preset === 'custom');
  const [customStart, setCustomStart] = useState(value.startDate.split('T')[0]);
  const [customEnd, setCustomEnd] = useState(value.endDate.split('T')[0]);

  const handlePresetClick = (preset: Preset) => {
    if (preset === 'custom') {
      setShowCustom(true);
      return;
    }

    setShowCustom(false);
    const dates = getPresetDates(preset);
    onChange({
      ...dates,
      preset,
    });
  };

  const handleApplyCustom = () => {
    onChange({
      startDate: customStart,
      endDate: customEnd + 'T23:59:59.999Z',
      preset: 'custom',
    });
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Date Range:</span>

        {presets.map((preset) => (
          <button
            key={preset.key}
            onClick={() => handlePresetClick(preset.key)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              value.preset === preset.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {preset.label}
          </button>
        ))}

        {showCustom && (
          <div className="flex items-center gap-2 ml-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={handleApplyCustom}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Apply
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
