import { mapTriggerIdsToLabels, mapTriggerTokensToIds, TRIGGER_OPTIONS } from '../moodTriggers';

describe('moodTriggers helpers', () => {
  it('maps trigger ids to localized labels', () => {
    expect(mapTriggerIdsToLabels(['work'])).toEqual(['İş']);
  });

  it('returns original value when id not found', () => {
    expect(mapTriggerIdsToLabels(['unknown'])).toEqual(['unknown']);
  });

  it('normalizes tokens from voice analysis to trigger ids', () => {
    expect(mapTriggerTokensToIds(['iş'])).toEqual(['work']);
    expect(mapTriggerTokensToIds(['Okulda zor bir gün geçirdim'])).toEqual(['work']);
  });

  it('falls back gracefully when tokens array is empty', () => {
    expect(mapTriggerTokensToIds([])).toEqual([]);
  });

  it('allows custom trigger options for id-to-label mapping', () => {
    const customOptions = TRIGGER_OPTIONS.map((option) =>
      option.id === 'work' ? { ...option, label: 'Çalışma' } : option,
    );
    expect(mapTriggerIdsToLabels(['work'], customOptions)).toEqual(['Çalışma']);
  });
});
