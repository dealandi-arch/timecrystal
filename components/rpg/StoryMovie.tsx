'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { SoundEngine } from './audio';
import { CHARACTERS, type Appearance } from './pixelArt';
import { STORY_CHAPTER_COUNT, VILLAINS, getChapterTitle, getNemesis } from './story';
import StoryStage from './StoryStage';
import { CharacterSelectScreen, LEVEL_THEMES, MUTE_STORAGE_KEY } from './TimeCrystalRPG';

// Animation mode: watch a character's whole story as a cutscene movie, no gameplay.
// Chapters are 0..STORY_CHAPTER_COUNT-1, then the epilogue, then the end card.
const EPILOGUE = STORY_CHAPTER_COUNT;
const END = STORY_CHAPTER_COUNT + 1;

export default function StoryMovie() {
  const [heroId, setHeroId] = useState<string | null>(null);
  const [appearance, setAppearance] = useState<Appearance>('original');
  const [chapter, setChapter] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [muted, setMuted] = useState(false);
  const soundRef = useRef<SoundEngine | null>(null);
  if (!soundRef.current) soundRef.current = new SoundEngine();
  const sound = soundRef.current;

  useEffect(() => {
    const stored = window.localStorage.getItem(MUTE_STORAGE_KEY) === 'true';
    setMuted(stored);
    sound.setMuted(stored);
  }, [sound]);

  function toggleMuted() {
    const next = !muted;
    setMuted(next);
    sound.setMuted(next);
    window.localStorage.setItem(MUTE_STORAGE_KEY, String(next));
  }

  const hero = CHARACTERS.find((c) => c.id === heroId);

  let body: ReactNode;
  if (!hero) {
    body = (
      <CharacterSelectScreen
        title="Whose Story Will You Watch?"
        subtitle="Pick a hero and watch their whole journey play out as an animated story — no fighting required."
        appearance={appearance}
        onAppearanceChange={setAppearance}
        onChoose={(id) => {
          sound.resume();
          sound.playMenuClick();
          setHeroId(id);
          setChapter(0);
        }}
      />
    );
  } else if (chapter >= END) {
    body = (
      <div className="ability-select">
        <h1>The End</h1>
        <p>
          That was {hero.name}’s story, and their fight against {VILLAINS[getNemesis(hero.id)].name}.
        </p>
        <div className="movie-end-actions">
          <button className="ability-card" onClick={() => setChapter(0)}>Watch again</button>
          <button className="ability-card" onClick={() => setHeroId(null)}>Watch another hero</button>
        </div>
      </div>
    );
  } else {
    const isEpilogue = chapter === EPILOGUE;
    body = (
      <>
        <div className="movie-controls">
          <button className="ability-btn story-skip" onClick={() => setHeroId(null)}>◂ Heroes</button>
          <button className="ability-btn story-skip" disabled={chapter === 0} onClick={() => setChapter(chapter - 1)}>
            ◂ Prev
          </button>
          <select
            className="movie-select"
            value={chapter}
            onChange={(e) => setChapter(Number(e.target.value))}
            aria-label="Chapter"
          >
            {Array.from({ length: STORY_CHAPTER_COUNT }, (_, i) => (
              <option key={i} value={i}>{getChapterTitle(i)}</option>
            ))}
            <option value={EPILOGUE}>Epilogue — Tomorrow</option>
          </select>
          <button className="ability-btn story-skip" onClick={() => setChapter(chapter + 1)}>Next ▸</button>
          <button className={`ability-btn ${autoPlay ? '' : 'story-skip'}`} onClick={() => setAutoPlay(!autoPlay)}>
            {autoPlay ? '❚❚ Auto' : '▶ Auto'}
          </button>
        </div>
        <div className="journey-track movie-progress">
          <div className="journey-fill" style={{ width: `${(chapter / EPILOGUE) * 100}%` }} />
        </div>
        <StoryStage
          key={`${hero.id}:${chapter}`}
          chapterIndex={isEpilogue ? 'epilogue' : chapter}
          hero={hero}
          theme={LEVEL_THEMES[isEpilogue ? 9 : Math.min(chapter, LEVEL_THEMES.length - 1)]}
          sound={sound}
          appearance={appearance}
          onAppearanceChange={setAppearance}
          autoPlay={autoPlay}
          doneLabel={isEpilogue ? 'Finish' : 'Next chapter ▸'}
          onDone={() => setChapter(chapter + 1)}
        />
      </>
    );
  }

  return (
    <div>
      <button className="mute-btn" onClick={toggleMuted} aria-label={muted ? 'Unmute' : 'Mute'}>
        {muted ? '🔇' : '🔊'}
      </button>
      {body}
    </div>
  );
}
