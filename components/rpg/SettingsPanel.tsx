'use client';

import { useEffect } from 'react';
import type { GameSettings } from './settings';

interface SettingsPanelProps {
  settings: GameSettings;
  onChange: (settings: GameSettings) => void;
  onClose: () => void;
}

export default function SettingsPanel({ settings, onChange, onClose }: SettingsPanelProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="settings-backdrop" onClick={onClose}>
      <div className="settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="settings-title">Settings</h2>
        <p className="settings-paused">The game is paused while this is open.</p>
        <label className="settings-row">
          <input
            type="checkbox"
            autoFocus
            checked={settings.autoSpeciality}
            onChange={(e) => onChange({ ...settings, autoSpeciality: e.target.checked })}
          />
          <span>
            <strong>Auto-activate speciality</strong>
            <small>Your hero’s speciality turns on as soon as you choose them. Once on, it stays on until you restart.</small>
          </span>
        </label>
        <label className="settings-row">
          <input
            type="checkbox"
            checked={settings.autoWeapon}
            onChange={(e) => onChange({ ...settings, autoWeapon: e.target.checked })}
          />
          <span>
            <strong>Auto-equip special weapon</strong>
            <small>Start every level holding your hero’s special weapon. You can still switch with Q.</small>
          </span>
        </label>
        <label className="settings-row">
          <input
            type="checkbox"
            checked={settings.musicOn}
            onChange={(e) => onChange({ ...settings, musicOn: e.target.checked })}
          />
          <span>
            <strong>Music</strong>
            <small>The soundtrack. It dips briefly whenever a sound effect plays.</small>
          </span>
        </label>
        <label className="settings-row">
          <input
            type="checkbox"
            checked={settings.sfxOn}
            onChange={(e) => onChange({ ...settings, sfxOn: e.target.checked })}
          />
          <span>
            <strong>Sound effects</strong>
            <small>Shots, hits, pickups and menu clicks.</small>
          </span>
        </label>
        <button className="ability-btn settings-done" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}
