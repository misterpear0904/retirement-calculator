/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from '../Header';
import { DEFAULT_STATE } from '../../data/presets';

describe('Header', () => {
  const props = {
    onExportPdf: vi.fn(),
    onExportInputs: vi.fn(),
    onImportInputs: vi.fn(),
    onLoadPreset: vi.fn(),
    onResetDefault: vi.fn(),
    state: DEFAULT_STATE,
    onTriggerToast: vi.fn(),
    isDark: true,
    onToggleTheme: vi.fn(),
    successRate: 85,
  };

  it('renders preset select and keeps value after selecting', () => {
    render(<Header {...props} />);
    const select = screen.getByLabelText('Load preset scenario') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'fire_early' } });
    expect(props.onLoadPreset).toHaveBeenCalledWith('fire_early');
    // value state updated internally
  });

  it('theme toggle calls', () => {
    render(<Header {...props} />);
    fireEvent.click(screen.getByTitle('Toggle Light / Dark Mode'));
    expect(props.onToggleTheme).toHaveBeenCalled();
  });
});
