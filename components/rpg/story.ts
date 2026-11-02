// Story mode script. One chapter plays before each level; the epilogue plays after the last.
// `{name}` is replaced with the chosen character's name.

export interface StoryLine {
  speaker: 'hero' | 'oren' | 'guardian' | 'narrator';
  text: string;
}

export interface StoryChapter {
  title: string;
  lines: StoryLine[];
}

export const SPEAKER_NAMES: Record<Exclude<StoryLine['speaker'], 'hero'>, string> = {
  oren: 'Archivist Oren',
  guardian: 'The Guardian',
  narrator: '',
};

export const STORY_CHAPTERS: StoryChapter[] = [
  {
    title: 'Chapter 1 — First Spark',
    lines: [
      { speaker: 'narrator', text: 'The Time Crystal held every timeline together. Then, one night, it shattered into eleven shards.' },
      { speaker: 'oren', text: 'You there — {name}! You can see the shard moving? Good. Most people cannot.' },
      { speaker: 'hero', text: 'It keeps slipping away from me. Who are you?' },
      { speaker: 'oren', text: 'Oren, keeper of the Temporal Archive. The shards are guarded. Clear the guards, then catch the shard as it passes.' },
    ],
  },
  {
    title: 'Chapter 2 — The Crypt of Echoes',
    lines: [
      { speaker: 'oren', text: 'One shard restored. Already the air feels steadier.' },
      { speaker: 'hero', text: 'This crypt is full of voices. They sound like… me.' },
      { speaker: 'oren', text: 'Echoes of timelines that almost happened. Ignore them. Watch the walls — some are not as solid as they look.' },
    ],
  },
  {
    title: 'Chapter 3 — Overgrown Ruins',
    lines: [
      { speaker: 'narrator', text: 'Centuries passed here in an instant. Moss swallowed the halls.' },
      { speaker: 'hero', text: 'The guards are getting smarter. Or there are just more of them.' },
      { speaker: 'oren', text: 'Something is gathering them. Something that wants the shards scattered.' },
    ],
  },
  {
    title: 'Chapter 4 — Sands of the Hourglass',
    lines: [
      { speaker: 'oren', text: 'This desert is the inside of a broken hourglass. Every grain is a lost second.' },
      { speaker: 'hero', text: 'Then let us not waste any more of them.' },
    ],
  },
  {
    title: 'Chapter 5 — The Molten Hour',
    lines: [
      { speaker: 'narrator', text: 'Heat rolls off the walls. Time runs fast here, and burns.' },
      { speaker: 'oren', text: 'Seven guardians this time. The one gathering them has noticed you, {name}.' },
      { speaker: 'hero', text: 'Good. Let it come.' },
    ],
  },
  {
    title: 'Chapter 6 — Frozen Moment',
    lines: [
      { speaker: 'hero', text: 'Everything here is frozen mid-motion. Even the snow.' },
      { speaker: 'oren', text: 'A single second, preserved forever. The shard is the only thing still moving. Follow it.' },
    ],
  },
  {
    title: 'Chapter 7 — The Teal Depths',
    lines: [
      { speaker: 'oren', text: 'I have a confession. I was the one guarding the crystal the night it broke.' },
      { speaker: 'hero', text: 'What happened?' },
      { speaker: 'oren', text: 'I tried to use it to undo one mistake. Just one. It could not bear it.' },
    ],
  },
  {
    title: 'Chapter 8 — The Void Between',
    lines: [
      { speaker: 'narrator', text: 'No floor, no sky — only the paths the shards remember.' },
      { speaker: 'guardian', text: 'Turn back, little traveller. A whole crystal is a cage. Broken, every moment is free.' },
      { speaker: 'hero', text: 'Broken, every moment is falling apart.' },
    ],
  },
  {
    title: 'Chapter 9 — The Golden Temple',
    lines: [
      { speaker: 'oren', text: 'The Guardian was born from my wish — the part of me that never wanted time to be fixed.' },
      { speaker: 'hero', text: 'Then we finish this together, Oren.' },
    ],
  },
  {
    title: 'Chapter 10 — The Crystal Chamber',
    lines: [
      { speaker: 'narrator', text: 'The chamber where it all began. Twelve guards stand where there were once none.' },
      { speaker: 'guardian', text: 'Ten shards. You are so close. Do you even know what happens when it is whole?' },
      { speaker: 'hero', text: 'Tomorrow happens.' },
    ],
  },
  {
    title: 'Chapter 11 — The Last Crystal',
    lines: [
      { speaker: 'guardian', text: 'Then come. Take the last shard from me, if you can.' },
      { speaker: 'oren', text: '{name} — whatever happens, thank you.' },
    ],
  },
];

export const STORY_EPILOGUE: StoryChapter = {
  title: 'Epilogue — Tomorrow',
  lines: [
    { speaker: 'narrator', text: 'The final shard slides into place. Light floods every timeline at once.' },
    { speaker: 'oren', text: 'It is whole. And so, I think, am I.' },
    { speaker: 'hero', text: 'What now?' },
    { speaker: 'oren', text: 'Now, {name}, time moves forward. That is all it ever needed to do.' },
  ],
};
