import type { SurferLevel } from '../types';

interface LevelSelectorProps {
  level: SurferLevel;
  onChange: (level: SurferLevel) => void;
}

const LEVELS: { value: SurferLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

export default function LevelSelector({ level, onChange }: LevelSelectorProps) {
  return (
    <div className="flex gap-1 bg-ocean-700 rounded-lg p-0.5">
      {LEVELS.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={`flex-1 text-xs py-1.5 rounded-md transition-colors font-medium ${
            level === value
              ? 'bg-white text-ocean-800'
              : 'text-ocean-300 hover:text-white'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
