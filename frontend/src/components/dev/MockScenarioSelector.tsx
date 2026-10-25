import { MOCK_SCENARIOS } from '../../lib/api/mock/scenarios';
import { setMockScenario, getMockScenario } from '../../lib/api/mock';

interface MockScenarioSelectorProps {
  onScenarioChange: () => void;
}

export function MockScenarioSelector({ onScenarioChange }: MockScenarioSelectorProps) {
  const current = getMockScenario();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setMockScenario(e.target.value);
    onScenarioChange();
  }

  return (
    <div className="flex items-center gap-2 bg-yellow-300 border-b border-yellow-400 px-4 py-2 text-sm font-medium text-yellow-900">
      <span className="font-bold">[DEV]</span>
      <label htmlFor="mock-scenario-select" className="flex-shrink-0">
        Scenario:
      </label>
      <select
        id="mock-scenario-select"
        value={current}
        onChange={handleChange}
        aria-label="Developer: select mock scenario"
        className="min-h-[44px] rounded border border-yellow-500 bg-yellow-100 text-yellow-900 px-2 py-1 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-600"
      >
        {Object.keys(MOCK_SCENARIOS).map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
}

export default MockScenarioSelector;
