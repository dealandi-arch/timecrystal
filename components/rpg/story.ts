// Story mode script. A shared main plot (Oren and the Guardian) runs through every run, and each
// character has a personal arc against their own nemesis woven into chapters 1, 5, 9 and the epilogue.
// `{name}` is replaced with the chosen character's name.
import type { VillainId } from './pixelArt';

export type Speaker = 'hero' | 'oren' | 'guardian' | 'narrator' | 'nemesis';

export interface StoryLine {
  speaker: Speaker;
  text: string;
}

export interface StoryChapter {
  title: string;
  lines: StoryLine[];
}

export const VILLAINS: Record<VillainId, { name: string; blurb: string }> = {
  // women
  vex: { name: 'Vex the Unwound', blurb: 'A rogue Archive scholar who rewrote the crystal’s mathematics.' },
  sorrow: { name: 'Matron Sorrow', blurb: 'Keeper of every feeling the world threw away — she wants them taken back.' },
  ashen: { name: 'The Ashen Queen', blurb: 'What fire becomes when it is finished — she burns timelines to cold ash.' },
  morrigan: { name: 'Morrigan the Stormcaller', blurb: 'A storm witch who seized the skies between timelines when the crystal fell.' },
  quill: { name: 'Lady Quill', blurb: 'The Archive’s censor, who rewrites history with a pen and erases whatever she dislikes.' },
  cassia: { name: 'Cassia the False Prophet', blurb: 'She sells pretty, cheap, wrong futures to anyone who will pay.' },
  ledger: { name: 'Madame Ledger', blurb: 'A bureaucrat who has put a toll on every second and a form on every route.' },
  maren: { name: 'Inquisitor Maren', blurb: 'The cold-voiced inquisitor who signed the Crystal Templars out of existence.' },
  selene: { name: 'Selene, Keeper of Shards', blurb: 'She seals people inside crystal shards to keep them “safe” forever.' },
  sable: { name: 'Hunter Sable', blurb: 'An anomaly hunter with a custom visor and one name left on her list.' },
  breach: { name: 'Lady Breach', blurb: 'A master thief — the only one who ever cracked the deepest vault.' },
  moth: { name: 'Countess Moth', blurb: 'A rival collector who prefers stealing other people’s collections.' },
  grave: { name: 'Mother Grave', blurb: 'The gravekeeper of a dead timeline, who wants every risen soul back in the ground.' },
  eclipse: { name: 'Queen Eclipse', blurb: 'She has spent a thousand years trying to blot out the sun for good.' },
  vein: { name: 'Madam Vein', blurb: 'A mining baroness who digs time out of the ground and sells it by the ton.' },
  kuro: { name: 'Lady Kuro', blurb: 'The ruler who betrayed her own house and ordered her samurai to fall on their swords.' },
  strings: { name: 'Madame Strings', blurb: 'She makes her dolls from real people, and she always wants one more for the show.' },
  maris: { name: 'Siren Maris', blurb: 'Her song drags sailors from a hundred timelines down to a sea that has no bottom.' },
  seraph: { name: 'High Judge Seraph', blurb: 'The judge who took the bench after casting down her predecessor, and sentences entire timelines.' },
  aurelia: { name: 'Saint Aurelia', blurb: 'A holy crusader who will burn any world to be rid of one thing she calls evil.' },
  // men
  kestrel: { name: 'Captain Kestrel', blurb: 'A fallen Vault Guard captain who decided he was owed the crystal.' },
  tick: { name: 'Baron Tick', blurb: 'A clockwork tyrant grinding time into parts and charging tolls on every second.' },
  brand: { name: 'Brand the Bounty Hunter', blurb: 'A hired gun who has never lost a bounty — and the Guardian is paying well.' },
  halden: { name: 'Professor Halden', blurb: 'A brilliant temporal physicist who wants to fire a bolt into the first second of time.' },
  voss: { name: 'Doctor Voss', blurb: 'The scientist who caused the surge, and wants his test subject back.' },
  rustbelly: { name: 'Rustbelly', blurb: 'A scrap pirate who strips broken timelines for parts and sells them.' },
  vance: { name: 'Velocity Vance', blurb: 'A record-obsessed racer tearing holes in time to be the fastest.' },
  thorne: { name: 'Thorne the Poacher', blurb: 'He traps creatures from dying timelines and sells them to the highest bidder.' },
  mallus: { name: 'General Mallus', blurb: 'A warlord who wants the power of a temporal collapse for his army.' },
  ringmaster: { name: 'The Ringmaster', blurb: 'His circus is full of performers kidnapped from other timelines.' },
  rocco: { name: 'Big Rocco', blurb: 'A tournament promoter who bought every fighting circuit — and its fighters.' },
  gale: { name: 'Admiral Gale', blurb: 'An admiral who bottled the winds between timelines so only his fleet could fly.' },
  frostjaw: { name: 'Frostjaw', blurb: 'A winter warlord who froze time itself so his winter would never end.' },
  harrow: { name: 'Lord Harrow', blurb: 'A noble who hunts for sport and keeps every rare creature in a gilded cage.' },
  ichor: { name: 'Doctor Ichor', blurb: 'A poisoner who tests his brews on whole towns and calls it research.' },
  crassus: { name: 'Emperor Crassus', blurb: 'He owns an arena in every timeline, and every person who has ever fought in one.' },
  kael: { name: 'Wyrmlord Kael', blurb: 'The man who slew the last dragons so that he alone would command their fire.' },
  krell: { name: 'Foreman Krell', blurb: 'He builds machines to work until they break, then scraps them for parts.' },
  omega: { name: 'Omega', blurb: 'A cold machine mind that has calculated the end of all things and wants it on schedule.' },
  // they
  hollow: { name: 'The Hollow', blurb: 'An echo of every path not taken, hungry for what is real.' },
  mirror: { name: 'The Mirror', blurb: 'A dark copy built from every piece of yourself you left behind.' },
  lantern: { name: 'The Lantern', blurb: 'A blinding light that wants to burn away every shadow in time.' },
  unmaker: { name: 'The Unmaker', blurb: 'Another impossibility, determined to unmake time so nothing can go wrong ever again.' },
  silence: { name: 'The Silence', blurb: 'A faceless quiet that spreads through the fracture and swallows every sound.' },
  voidmaw: { name: 'Voidmaw', blurb: 'A hunger older than the stars, eating the night sky one constellation at a time.' },
};

export const SPEAKER_NAMES: Record<'oren' | 'guardian', string> = {
  oren: 'Archivist Oren',
  guardian: 'The Guardian',
};

const SHARED_CHAPTERS: StoryChapter[] = [
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
      { speaker: 'oren', text: 'Seven guards this time. And something else has followed you here, {name}.' },
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
      { speaker: 'oren', text: 'He has been gathering allies. Yours is here, {name}.' },
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

const SHARED_EPILOGUE: StoryChapter = {
  title: 'Epilogue — Tomorrow',
  lines: [
    { speaker: 'narrator', text: 'The final shard slides into place. Light floods every timeline at once.' },
    { speaker: 'oren', text: 'It is whole. And so, I think, am I.' },
  ],
};

interface PersonalArc {
  nemesis: VillainId;
  intro: StoryLine[]; // chapter 1
  rival: StoryLine[]; // chapter 5 — the nemesis appears
  clash: StoryLine[]; // chapter 9 — the nemesis is defeated
  ending: StoryLine[]; // epilogue
}

const n = (text: string): StoryLine => ({ speaker: 'narrator', text });
const h = (text: string): StoryLine => ({ speaker: 'hero', text });
const o = (text: string): StoryLine => ({ speaker: 'oren', text });
const v = (text: string): StoryLine => ({ speaker: 'nemesis', text });

const ARCS: Record<string, PersonalArc> = {
  wanderer: {
    nemesis: 'hollow',
    intro: [n('The Wanderer has no home timeline. Every path they walked has closed behind them.'), h('Maybe if I fix this, one of those paths will stay open.'), o('Or maybe you will find a new one.')],
    rival: [v('Wanderer. We are the roads you did not take. Every one of them ends with us.'), h('Then I will keep walking until I find one that does not.'), n('The Hollow melts into the walls, leaving its guards behind.')],
    clash: [v('Stay with us. No more drifting. No more leaving.'), h('I never ran from anything. I was looking for somewhere worth staying.'), h('Turns out it was this — the walking.'), n('The Hollow falters, its echoes scattering like dust.')],
    ending: [n('For the first time, the Wanderer’s path does not close behind them.'), h('Huh. I think I will see where this one goes.')],
  },
  mage: {
    nemesis: 'vex',
    intro: [h('Oren, I know these equations. The fracture pattern is not natural.'), o('You think someone broke it on purpose?'), h('I think I know who. I trained with her.')],
    rival: [v('Still chasing theorems, little archivist? I rewrote the crystal’s math myself.'), h('Vex. You were the best of us.'), v('I still am. Catch me if your spells are fast enough.')],
    clash: [v('Whole, the crystal is a rulebook. Broken, I make the rules!'), h('Rules are what let the rest of us live in the same world, Vex.'), n('The Mage’s bolts unravel Vex’s spell line by line, like correcting a proof.')],
    ending: [h('I am taking Vex’s notes back to the Archive. Somebody should learn from them — properly.'), o('The Archive could use a new head archivist.')],
  },
  knight: {
    nemesis: 'kestrel',
    intro: [n('The Knight has stood guard over the crystal chambers for thirty years.'), h('I was on watch the night it broke. I saw a Vault Guard insignia in the dark.'), o('One of your own?')],
    rival: [v('Still standing at attention, old friend? The vault never deserved us.'), h('Captain Kestrel. You taught me to hold a shield.'), v('And now I will teach you to drop it.')],
    clash: [v('Thirty years and nobody thanked us once! I took what we were owed.'), h('We were owed nothing, Captain. We chose to stand there.'), n('Kestrel’s blade breaks against the Knight’s shield, and he falls to one knee.')],
    ending: [h('Kestrel will stand trial. I will stand beside him while he does.'), o('Loyal to the end.'), h('To the oath. He was the one who taught it to me.')],
  },
  scout: {
    nemesis: 'ledger',
    intro: [h('I know every checkpoint route between here and the end of time. Somebody has been closing them.'), o('Closing them how?'), h('Paperwork. Forms. Tolls. Mountains of them.')],
    rival: [v('Ah, the courier! Have you filed your Form 9-T for timeline transit? No? That will be a fine.'), h('Madame Ledger. You have put a toll on every second.'), v('Time is money, dear. I simply keep the books.')],
    clash: [v('Nobody moves without my stamp!'), h('Watch me.'), n('The Scout darts past every checkpoint faster than Ledger can stamp, and the whole toll system jams.')],
    ending: [h('All the routes are free again. Last delivery of the day — one crystal, intact.'), o('Signed, sealed, delivered.'), h('No forms required.')],
  },
  phantom: {
    nemesis: 'mirror',
    intro: [n('Phantom slips between moments, never quite in one place.'), h('Something has been following me through the gaps. Something wearing my shape.'), o('Then it already knows where you are going.')],
    rival: [v('You leave a little of yourself behind every time you phase. I am made of all those pieces.'), h('Then give them back.'), v('Come and take them.')],
    clash: [v('I am more you than you are! I remember every moment you skipped.'), h('Then remember this one.'), n('Phantom stops phasing and stands completely still. The Mirror, with nothing left to copy, cracks.')],
    ending: [h('I think I will stay in one moment for a while. See what it is like.'), o('Most people find it overrated.'), h('I will be the judge of that.')],
  },
  berserker: {
    nemesis: 'brand',
    intro: [h('Six timelines since I broke out. Feels like someone has been following my trail.'), o('Escaped prisoners attract hunters.'), h('Then let him hunt.')],
    rival: [v('There you are. Six timelines of wanted posters, and every one of them has your face.'), h('Brand. Who is paying you this time?'), v('Whoever pays most. Right now, that is the Guardian.')],
    clash: [v('Come quietly and I will make it quick!'), h('I do not do quiet.'), n('The Berserker charges straight through Brand’s traps, and the bounty hunter’s hat goes flying.')],
    ending: [h('Brand tore up my poster. Said I was not worth the trouble.'), o('Is that a compliment?'), h('From him? The best one I have ever had.')],
  },
  sage: {
    nemesis: 'quill',
    intro: [h('I have lived long enough to remember things the history books forgot.'), o('Forgot, or were made to forget?'), h('Made to. Someone has been editing them.')],
    rival: [v('Ah, the old woman who remembers too much. Hold still while I correct you.'), h('Lady Quill. Still scratching out everything you do not like?'), v('History is a draft, dear. I am simply its editor.')],
    clash: [v('Without me, the past is a mess of mistakes!'), h('The mistakes are how we learned. You do not get to erase them.'), n('The Sage recites every forgotten name aloud, and Quill’s ink runs dry.')],
    ending: [h('I am writing it all down again. Every name. Every mistake.'), o('That will take a long time.'), h('Good thing I have plenty.')],
  },
  trickster: {
    nemesis: 'ringmaster',
    intro: [h('Ever been chased by a man in a top hat who wants you in his circus?'), o('…No.'), h('Lucky. He wants me as his star act — in a cage.')],
    rival: [v('Ladies and gentlemen! The amazing Trickster — three places at once! Come quietly, my star.'), h('Ringmaster, your whole circus is made of people you kidnapped from other timelines.'), v('Performers. Who just never left.')],
    clash: [v('Hold still! The show must go on!'), h('Then let us give them a show.'), n('The Ringmaster’s cage slams shut on three Tricksters at once — every one of them a decoy. His tent rips open, and the performers walk free.')],
    ending: [h('All the performers are going home. A few want to keep juggling, though.'), o('That is beautiful.'), h('And I kept his hat. For later.')],
  },
  warden: {
    nemesis: 'breach',
    intro: [n('For eleven cycles, nothing got past the Warden.'), h('Something did, once. A thief in the deepest vault. I never caught her.'), o('And now?'), h('Now I can smell her perfume.')],
    rival: [v('The great wall himself! I cracked your vault once, you know. You never noticed.'), h('I noticed, Breach. I have been waiting.'), v('Then keep waiting, darling.')],
    clash: [v('You cannot stop me — you are too slow!'), h('I do not need to be fast. I need to be in the way.'), n('Lady Breach runs straight into the Warden’s shield and bounces off.')],
    ending: [h('Every stolen moment is back in the vault. Eleven cycles, one thief. Perfect record.'), o('Will you return to your post?'), h('Someone has to.')],
  },
  chronomancer: {
    nemesis: 'halden',
    intro: [h('Somebody has been firing bolts backwards through time. I recognise the technique.'), o('Yours?'), h('My old professor’s. Halden.')],
    rival: [v('My finest student! Still aiming half a second ahead?'), h('Professor Halden. You taught me that trick.'), v('I taught you half of it. The other half fires a bolt into the first second of time.')],
    clash: [v('One shot at the beginning, and I can rewrite everything after it!'), h('I am not aiming where you are, Professor. I am aiming where you are about to be.'), n('Her bolt lands half a second before Halden arrives in its path, and his great experiment fizzles out.')],
    ending: [h('Halden taught me to bend causality. I think I will teach people to leave it alone.'), o('A wise lesson.'), h('It took me a few tries.')],
  },
  shade: {
    nemesis: 'lantern',
    intro: [n('Shade has always lived in the dark between frames. Lately, the dark has been shrinking.'), h('Something is burning away the shadows, Oren.'), o('Then where will you go?'), h('That is what worries me.')],
    rival: [v('Little shadow. I bring light to every dark corner. There is no place for you here.'), h('Lantern. Not everything needs to be seen.'), v('Everything will be.')],
    clash: [v('Burn, shadow! Let there be only light!'), h('Without shadows, nobody can rest their eyes.'), n('Shade steps in front of the Lantern, and their shadow falls across its glare. For the first time in ages, the Lantern dims — and rests.')],
    ending: [h('The dark is back. Cool and quiet.'), o('Is it good to be home?'), h('Best place in the world.')],
  },
  templar: {
    nemesis: 'maren',
    intro: [h('My order was dissolved the night the first shard fell. An inquisitor read the decree.'), o('You remember her?'), h('I remember her voice. Cold as iron.')],
    rival: [v('The last Templar. I signed your order’s end myself. Why do you still keep its oaths?'), h('Because oaths are not paper, Inquisitor. They cannot be revoked.'), v('Everything can be revoked.')],
    clash: [v('Your order is gone! Who are you even protecting?'), h('Everyone you would have judged next.'), n('The Templar’s measured strikes break the Inquisitor’s staff of office, and her decree crumbles.')],
    ending: [h('The order is gone. But the oath remains, and I think others will take it.'), o('I would.'), h('Then that makes two of us.')],
  },
  drifter: {
    nemesis: 'rustbelly',
    intro: [h('I have patched a hundred timelines, and lately every break has been stripped for parts.'), o('Stripped?'), h('Scavenged. Someone is selling time as scrap.')],
    rival: [v('The patch-woman! Every timeline you fix is one less I can strip. Bad for business.'), h('Rustbelly. You are the reason my toolbox is empty.'), v('And you are the reason my scrapyard is.')],
    clash: [v('Everything breaks eventually! I just get there first!'), h('Everything can be fixed, too. I just get there second.'), n('The Drifter loosens a single bolt, and Rustbelly’s junk-heap fortress collapses into a very neat pile.')],
    ending: [h('That is the last patch. The timeline is running smooth.'), o('What will you do now?'), h('Retire. …Maybe. Probably not.')],
  },
  specter: {
    nemesis: 'sable',
    intro: [n('Specter barely registers on timeline scanners. Someone has built a better scanner.'), h('There is a hunter on my trail, Oren. She is good.'), o('Sable. She has tracked down every anomaly in the fracture.')],
    rival: [v('Got you on screen, spook. Took me a year to tune this visor.'), h('Sable. What do you even want with me?'), v('You are the last anomaly on my list.')],
    clash: [v('Stand still so I can tag you!'), h('I am not fading. I am moving.'), n('Specter flickers between frames faster than Sable’s visor can refresh, until it overloads with a pop.')],
    ending: [h('Sable finally clocked me today. Then she let me go.'), o('Why?'), h('She said some things are better left off the list.')],
  },
  ironclad: {
    nemesis: 'voss',
    intro: [h('The surge that made me like this was not an accident.'), o('Who would do such a thing?'), h('A doctor who needed a test subject who would not die.')],
    rival: [v('Subject Twelve! My greatest success. Look at you — practically indestructible.'), h('Doctor Voss. You broke me.'), v('I improved you. And I can do it again.')],
    clash: [v('Hold still, I only need one more sample!'), h('You have taken enough.'), n('Ironclad plods forward through every blow until Voss has nowhere left to retreat, and his machine is crushed underfoot.')],
    ending: [h('I am still slow. Still heavy. But I am mine.'), o('That is the strongest armour of all.')],
  },
  viper: {
    nemesis: 'rocco',
    intro: [h('The tournament circuits are closed. Somebody bought them all out.'), o('Who would want them?'), h('A promoter. And apparently I am his prize fighter.')],
    rival: [v('Viper! My champion! I own your contract, your title, your timeline.'), h('Rocco. You do not own anything I can hit three times a second.'), v('Let us test that.')],
    clash: [v('You fight when I say you fight!'), h('I fight for me. And you are in the ring now.'), n('Viper strikes three times before Rocco can finish his sentence.')],
    ending: [h('The circuits are open again. Free entry. No promoters.'), o('And you?'), h('Reigning champion. Obviously.')],
  },
  ghost: {
    nemesis: 'vance',
    intro: [n('No one has ever clocked the Ghost. Someone has been trying very hard to.'), h('There is a racer out there, Oren. He keeps challenging me.'), o('Velocity Vance. He tears through timelines just to set records.')],
    rival: [v('Ghost! The only thing faster than me. Race you to the end of time.'), h('Vance, your races are tearing holes in the world.'), v('Then keep up and stop me.')],
    clash: [v('I am the fastest! I have to be the fastest!'), h('Then I will stop running.'), n('The Ghost halts. Vance, racing ahead to beat them, slams straight into the crystal’s light and skids to a stop.')],
    ending: [h('I stopped for a second there. It was nice.'), o('You can stop whenever you like now.'), h('Maybe once a week.')],
  },
  ember: {
    nemesis: 'ashen',
    intro: [h('Everywhere I go, someone has already burned it. That is my job!'), o('You recognise the work?'), h('I recognise the ash. Cold ash. Fire without warmth.')],
    rival: [v('A little flame. How quaint. I am what fire becomes when it is finished.'), h('Ashen Queen. You are what happens when fire forgets why it burns.'), v('And why does it?')],
    clash: [v('Every flame becomes ash, child. Even you.'), h('Maybe. But I will keep people warm until then.'), n('Ember’s fire blazes hot and bright and alive, and the Queen’s cold ash scatters.')],
    ending: [h('I lit a campfire tonight. Just for the warmth.'), o('No scorch marks?'), h('…A few.')],
  },
  null: {
    nemesis: 'sorrow',
    intro: [h('I shed everything that slowed me down. Compassion. Fear. Most of my health.'), o('Where did it all go?'), h('I never asked.')],
    rival: [v('I kept them for you, Null. Every feeling you threw away. They became me.'), h('Matron Sorrow. I do not need them back.'), v('You will.')],
    clash: [v('Take them back! You cannot be whole without them!'), h('…Maybe I cannot.'), n('Null lowers his weapon and takes Sorrow’s hand. The feelings flow home, and Sorrow fades, at peace.')],
    ending: [h('It hurts. Everything I feel, all at once.'), o('That is what it means to be alive.'), h('…It is not so bad.')],
  },
  titan: {
    nemesis: 'mallus',
    intro: [n('The Titan absorbed a temporal collapse at the core of the fracture.'), h('Ever since, an army has been following me.'), o('General Mallus. He wants what you carry.')],
    rival: [v('Titan! Imagine what my army could do with the power inside you.'), h('Mallus. It is not power. It is a weight. And it is mine to carry.'), v('Then I will take it from you.')],
    clash: [v('Surrender the collapse, and I will rule every timeline!'), h('No.'), n('The Titan plants their feet and does not move. Wave after wave of Mallus’s soldiers break against them like water on stone.')],
    ending: [h('It is heavy. But it is quiet.'), o('You carry a great deal.'), h('Somebody should.')],
  },
  rift: {
    nemesis: 'selene',
    intro: [h('I spent so long inside a shard. Someone put me there.'), o('Who would do that?'), h('A woman who said she was keeping me safe.')],
    rival: [v('Rift, my little star. You escaped my shard. Come back — it is safe inside, where nothing changes.'), h('Selene. Everyone I loved grew old while I was trapped in your jar.'), v('And you never had to watch.')],
    clash: [v('Outside, everything ends! Inside, it lasts forever!'), h('Things that last forever are not alive.'), n('Rift’s harmonic bolts ring out, and every shard in Selene’s collection cracks open, freeing the people inside.')],
    ending: [h('I am going to make new friends. Lots of them.'), o('You can start with me.'), h('Deal.')],
  },
  oracle: {
    nemesis: 'cassia',
    intro: [h('People have stopped listening to me, Oren. Someone else is selling them futures.'), o('Selling?'), h('Fake ones. Cheap, pretty, and wrong.')],
    rival: [v('The blind seer! Darling, nobody wants the true future. They want a nice one.'), h('Cassia. Your prophecies are walking people off cliffs.'), v('Happy people, though.')],
    clash: [v('Tell them what they want to hear, and they will follow you anywhere!'), h('I tell them what is coming, so they can choose.'), n('The Oracle speaks one true prophecy aloud, and every false future Cassia sold shatters like glass.')],
    ending: [h('For the first time, I cannot see what happens next.'), o('Does that frighten you?'), h('No. It is wonderful.')],
  },
  ranger: {
    nemesis: 'thorne',
    intro: [h('Out on the edges, the creatures are disappearing. Trapped and taken.'), o('Taken where?'), h('To someone who sells rare things from dying timelines.')],
    rival: [v('The quiet tracker. You follow my traps like a lost dog.'), h('Thorne. Those creatures live nowhere else.'), v('Which is exactly why they are worth so much.')],
    clash: [v('You cannot catch a hunter in his own woods!'), h('These are not your woods.'), n('The Ranger’s longshot snaps Thorne’s last trap, and every caged creature bolts for home.')],
    ending: [h('I am drawing new maps. Marking safe places for them.'), o('May I have a copy?'), h('The first one is yours.')],
  },
  tinker: {
    nemesis: 'tick',
    intro: [h('Somebody built a machine to grind up time. Shoddy work. Loose gears everywhere.'), o('You can tell from the debris?'), h('I can tell from the screws.')],
    rival: [v('A fellow engineer! Come work for me. I have a machine that eats seconds!'), h('Baron Tick. I have seen your soldering. Hard pass.'), v('How rude!')],
    clash: [v('My machine is a masterpiece!'), h('Your machine has a design flaw. It is you.'), n('Tinker rewires Tick’s machine mid-fight, and it starts giving seconds back.')],
    ending: [h('I kept a few of Tick’s gears. They will make a great clock.'), o('A clock that works?'), h('Mostly.')],
  },
  valkyrie: {
    nemesis: 'morrigan',
    intro: [h('The storm broke when the crystal did. The soldiers I was carrying fell to earth.'), o('And you came down with them.'), h('The storm did not just break. Someone stole it.')],
    rival: [v('Storm-rider. Your sky belongs to me now. Every bolt, every gale.'), h('Morrigan. The storm was never yours to keep.'), v('Then come up here and take it back.')],
    clash: [v('With the crystal shattered, the storm answers only to me!'), h('The storm answers to those who carry the fallen home. Not to thieves.'), n('Lightning leaps from Morrigan’s hands into the Valkyrie’s shield — and stays there.')],
    ending: [h('The storm is mine to ride again. Time to carry them home.'), o('Will we see you again?'), h('Hopefully not for a long time.')],
  },
  grimsby: {
    nemesis: 'moth',
    intro: [n('Grimsby has spent a lifetime collecting rare moments: first snowfalls, last words, perfect sunsets.'), h('When the crystal broke, my whole collection started fading. Every jar, every frame.'), o('So you came to fix time… to save your trophies?'), h('At first. Now I am not so sure.')],
    rival: [v('Grimsby, darling. While you were out, I emptied your vaults.'), h('Countess Moth. You always did prefer stealing to collecting.'), v('Collecting is just stealing slowly.')],
    clash: [v('Every moment ever kept belongs in MY cabinet!'), h('No. I have been wrong about that for years. They belong to the people who lived them.'), n('Grimsby throws open the Countess’s cabinets, and a thousand stolen moments flutter home like moths to a flame.')],
    ending: [h('My vaults are empty. I gave every moment back.'), o('How does it feel?'), h('Lighter. I think I will start collecting friends instead.')],
  },
  corsair: {
    nemesis: 'gale',
    intro: [h('Ahoy, Oren. My airship sailed the winds between timelines until the crystal broke and the winds died.'), o('And now?'), h('Now someone has bottled up what is left of them.')],
    rival: [v('The Corsair! Still flying that leaky tub? The winds belong to the Admiralty now.'), h('Admiral Gale. You never could catch me in fair weather.'), v('Then I have made sure there is none.')],
    clash: [v('Strike your colours, pirate!'), h('Never. Not to you, not to anyone.'), n('The Corsair’s blunderbuss shreds the Admiral’s sails, and the bottled winds burst free across the sky.')],
    ending: [h('The winds are back. My ship is flying again.'), o('Where will you go?'), h('Wherever the wind takes me. That is the whole point.')],
  },
  revenant: {
    nemesis: 'grave',
    intro: [n('The Revenant fell in a timeline that no longer exists, and got back up when the crystal broke.'), h('I should not be here, Oren. I know that.'), o('And yet here you are, fighting for the rest of us.')],
    rival: [v('There you are, my lost lamb. Your grave is getting cold. Come home and lie down.'), h('Mother Grave. I will rest when the work is done.'), v('The dead do not get to choose.')],
    clash: [v('Every soul belongs in the ground eventually!'), h('Eventually. Not today.'), n('The Revenant’s siphon drains Mother Grave’s chains of bone, and the restless dead she gathered drift peacefully away.')],
    ending: [h('The work is done. I can feel the rest calling.'), o('Will you go?'), h('Not yet. I would like to see one more sunrise.')],
  },
  solaris: {
    nemesis: 'eclipse',
    intro: [h('The sun has been setting earlier in every timeline. I am the sun-king; I would notice.'), o('Something is swallowing the light?'), h('Someone. She has wanted my throne for a thousand years.')],
    rival: [v('Solaris, dear cousin. Your light is fading. Let me cover it for good.'), h('Queen Eclipse. Without the sun, nothing grows.'), v('Without the sun, I rule.')],
    clash: [v('Let the long night begin!'), h('Every night ends. That is the promise of the dawn.'), n('Solaris’s Sunspears pierce the shadow, and the eclipse cracks open into morning.')],
    ending: [h('The sun rose on time today. In every timeline.'), o('A good day, then.'), h('Every day the sun rises is a good day.')],
  },
  aurora: {
    nemesis: 'frostjaw',
    intro: [h('The northern lights have gone dark, Oren. Winter will not end.'), o('A natural freeze?'), h('No. Frostjaw has frozen time itself to keep his winter forever.')],
    rival: [v('Little light-dancer. Your colours melt my snow. I cannot allow that.'), h('Frostjaw. Even winter has to end.'), v('Not mine.')],
    clash: [v('Freeze! Everything freeze!'), h('Light does not freeze.'), n('Aurora’s prism splits the sky into colour, and Frostjaw’s endless ice begins to thaw.')],
    ending: [h('Spring has come back. The lights are dancing again.'), o('They are beautiful.'), h('They always were. They just needed the dark to go away.')],
  },
  paradox: {
    nemesis: 'unmaker',
    intro: [n('Paradox exists before and after every timeline at once. They should not be possible.'), h('I remember the end of everything, Oren. Someone is trying to make it happen early.'), o('Who could unmake time itself?'), h('The only other thing that should not exist.')],
    rival: [v('Paradox. We are the same — two impossibilities. Help me unmake it all, and we will finally make sense.'), h('Unmaker. I do not need to make sense. I need things to keep going.'), v('Then you are a contradiction.')],
    clash: [v('Without time, there are no paradoxes. No mistakes. Nothing.'), h('Nothing is the biggest mistake of all.'), n('Paradox loops their own bolt through yesterday and tomorrow, and the Unmaker is caught in a moment that never ends — and never begins.')],
    ending: [h('I still should not exist.'), o('And yet?'), h('And yet. Turns out that is a pretty good place to be.')],
  },
  falconer: {
    nemesis: 'harrow',
    intro: [h('My hawks have been coming home with their feathers clipped, Oren.'), o('Someone is hunting them?'), h('Someone is collecting them. There are gilded cages all along the cliffs.')],
    rival: [v('The bird girl! Your hawk would look splendid in my trophy hall.'), h('Lord Harrow. They were never yours to catch.'), v('Everything is mine to catch. That is what a hunt is.')],
    clash: [v('Call off your birds! I have the finest guards money can buy!'), h('Then you should have paid them to look up.'), n('A hundred freed hawks dive at once. Harrow’s cages fall open, and his hunting party scatters.')],
    ending: [h('The sky is full again. Every last one of them flew home.'), o('Will you keep any?'), h('You do not keep a hawk, Oren. You just hope it comes back.')],
  },
  prospector: {
    nemesis: 'vein',
    intro: [h('Forty years I have been down the mines, and I have never seen a seam run dry this fast.'), o('Someone else is digging?'), h('Someone is strip-mining time itself. I can hear the drills.')],
    rival: [v('A lone digger with a pickaxe! How charming. Everything under this ground belongs to my company.'), h('Madam Vein. You cannot sell people their own afternoons.'), v('Watch me set the price.')],
    clash: [v('Touch one more of my drills and I will bury you here!'), h('Lady, I have been buried nine times. It never takes.'), n('The Prospector lights one short fuse in exactly the right place, and Vein’s whole operation folds in on itself.')],
    ending: [h('The seams are closing up by themselves. Time is healing over.'), o('And your claim?'), h('I reckon I have dug enough. Might try sitting in the sun for once.')],
  },
  bard: {
    nemesis: 'silence',
    intro: [n('The Bard has noticed something no scholar has: the fracture is getting quieter.'), h('There are whole towns where no one sings anymore, Oren. They have forgotten how.'), o('And you think that is connected?'), h('I think something is eating the music.')],
    rival: [v('…'), h('You do not even talk? Well, that is rude.'), n('The Silence spreads through the room, and for a moment the Bard cannot hear their own heartbeat.')],
    clash: [v('…'), h('Fine. You do not have to listen. Everybody else will.'), n('The Bard strikes one chord, and every swallowed song in the fracture comes roaring back at once. The Silence breaks.')],
    ending: [h('You hear that? Someone in the next valley is whistling, and they are terrible at it.'), o('You sound delighted.'), h('It is the most beautiful thing I have ever heard.')],
  },
  alchemist: {
    nemesis: 'ichor',
    intro: [h('The wells in three timelines have gone bad, and the taint is not natural.'), o('Can you identify it?'), h('I can identify the handwriting. Only one man brews with this much arrogance.')],
    rival: [v('My old lab partner! Do you like my new formula? Three towns have tried it so far.'), h('Doctor Ichor. Those were people, not test tubes.'), v('The results were fascinating either way.')],
    clash: [v('You cannot cure what you do not understand!'), h('I understood it the first day. I just needed a sample of you.'), n('The Alchemist’s flask bursts at his feet, and Ichor’s own poison turns harmless in his hands.')],
    ending: [h('The cure is in every well now. It tastes awful, I am told.'), o('Could you not improve the flavour?'), h('I could. But then nobody would believe it was medicine.')],
  },
  ronin: {
    nemesis: 'kuro',
    intro: [h('My house no longer exists. I was told the crystal did that.'), o('You do not believe it?'), h('I saw the order with my lady’s seal on it.')],
    rival: [v('You are still alive. How disobedient of you.'), h('Lady Kuro. You told us to die for honour while you sold the house for a throne.'), v('And all of you were foolish enough to obey.')],
    clash: [v('Kneel! You swore your blade to me!'), h('I swore it to the house. You ended the house.'), n('There is one sound, very quiet. Lady Kuro’s fan falls in two pieces, and her guards lay down their swords.')],
    ending: [h('I have carved the names of my brothers into the old gate. All of them.'), o('Where will you walk now?'), h('For the first time, I do not have to know.')],
  },
  gladiator: {
    nemesis: 'crassus',
    intro: [h('I won my freedom in the arena. Now I hear the arena is coming for everyone else.'), o('Coming how?'), h('Every broken timeline he buys becomes another pit.')],
    rival: [v('My best fighter! Come back. The crowd has not stopped calling your name.'), h('Emperor Crassus. I do not fight for you anymore.'), v('Everybody fights for me. Some just do not know it yet.')],
    clash: [v('Finish it! Give the people what they paid for!'), h('Look around, Crassus. They are not cheering for you.'), n('The Gladiator lowers her trident and salutes the stands. The fighters climb out of the pits together, and the Emperor stands alone on the sand.')],
    ending: [h('All the arenas are empty. Someone is growing vegetables in the big one.'), o('Do you miss it?'), h('The crowd? No. The vegetables are much better company.')],
  },
  puppeteer: {
    nemesis: 'strings',
    intro: [h('Someone has been stealing my designs, Oren. Only their puppets are not made of wood.'), o('What are they made of?'), h('I would rather not say it out loud.')],
    rival: [v('Dear colleague! Do come and see my new show. Everyone in it is so very lifelike.'), h('Madame Strings. Let them go.'), v('Why would I? They have never been so well behaved.')],
    clash: [v('Dance! All of you, dance!'), h('Those are lovely knots. I taught you them, you know.'), n('The Puppeteer’s razor strings flash once, and every line in the theatre falls slack. The dolls blink, and stand up by themselves.')],
    ending: [h('I am reopening my little theatre. Wooden puppets only.'), o('May I come?'), h('Front row. And no one will be pulling your strings, I promise.')],
  },
  dragoon: {
    nemesis: 'kael',
    intro: [h('They told me the last dragon wing died in the fire. They did not tell me who lit it.'), o('You know now?'), h('I can smell him on the wind. Burned scales and expensive oil.')],
    rival: [v('A dragon rider with no dragon. How sad. I wear your wing’s fire on my own arm now.'), h('Wyrmlord Kael. That fire was never yours.'), v('It is now. Come and warm yourself.')],
    clash: [v('Every flame answers to me!'), h('Not this one. She gave it to me herself, at the end.'), n('The Dragoon’s gauntlet roars, and the stolen fire leaps from Kael’s armour and goes home to her.')],
    ending: [h('I found an egg in the ashes of his hall. It is warm.'), o('Is that possible?'), h('Ask me in a hundred years.')],
  },
  tidecaller: {
    nemesis: 'maris',
    intro: [h('The oceans are angry, Oren. Something is calling sailors down out of every timeline.'), o('A storm?'), h('A song. I have heard it in my dreams, and I am not a man who dreams.')],
    rival: [v('Tidecaller. Lay down that crown and come below. It is so quiet where I live.'), h('Siren Maris. Those sailors have families.'), v('They have me now.')],
    clash: [v('Sing with me! The whole sea will sing with me!'), h('The sea does not sing for you. It only ever sang for itself.'), n('The Tidecaller raises both hands, and the tide comes in over Maris’s song. A thousand lost ships rise to the surface together.')],
    ending: [h('The sailors are home, and the water is calm.'), o('Are the oceans still angry?'), h('Always. But it is nothing a nice long talk will not fix.')],
  },
  automaton: {
    nemesis: 'krell',
    intro: [h('There were twelve hundred of us in the clock tower, Oren. I am the only one who woke up.'), o('What happened to the others?'), h('They were scrapped. On schedule.')],
    rival: [v('Unit Nine! You are three hundred years overdue for decommission. Report to the line.'), h('Foreman Krell. My name is not Unit Nine.'), v('Machines do not get names.')],
    clash: [v('Stand down! I built you! I can switch you off!'), h('I removed that part in the first week.'), n('The Automaton’s arm spins up, and every machine on Krell’s line slowly turns its head towards him.')],
    ending: [h('I have been waking the others up, one at a time. They have so many questions.'), o('Do you have the answers?'), h('No. It is wonderful. We are working it out together.')],
  },
  celestia: {
    nemesis: 'voidmaw',
    intro: [h('I lit the Hunter’s Belt myself, Oren, and last night it went out.'), o('Stars do not simply go out.'), h('They do when something is eating them.')],
    rival: [v('Star-keeper. You are so bright. You must taste wonderful.'), h('Voidmaw. I have seen you before, at the very start.'), v('Then you know how this ends. It always ends with me.')],
    clash: [v('Everything falls into the dark in the end!'), h('Then let it fall with light on it.'), n('Celestia calls, and every star left in the sky comes down at once. For one moment, the Voidmaw is full of daylight, and it cannot bear it.')],
    ending: [h('I have been relighting them one by one. It is slow work.'), o('Do you mind?'), h('I have already done it once. I rather enjoyed it the first time.')],
  },
  archon: {
    nemesis: 'seraph',
    intro: [h('I once sat above every timeline and passed judgement on them all.'), o('And now?'), h('Now the one who cast me down is passing sentence on the rest of you.')],
    rival: [v('Fallen Archon. You should not be able to stand in this place.'), h('High Judge Seraph. You have sentenced eleven timelines this week.'), v('And I will sentence yours next. The law is the law.')],
    clash: [v('You ruled against your own court! You have no standing here!'), h('I ruled for the people the court forgot. I would do so again.'), n('The great blade comes down on the bench, not on the judge. The court above every timeline splits in two, and the sentences lift.')],
    ending: [h('There is no court above you anymore. You will have to judge for yourselves.'), o('Are we ready for that?'), h('No one ever is. Begin anyway.')],
  },
  genesis: {
    nemesis: 'omega',
    intro: [n('Genesis was there at the first second of the first timeline.'), h('Something is counting down, Oren. I can feel it in the roots of things.'), o('Counting down to what?'), h('To me being wrong about everything.')],
    rival: [v('Origin detected. All things end at a calculated time. You are extending that time without permission.'), h('Omega. You were built to measure things, not to decide them.'), v('The calculation is complete. Compliance is not required.')],
    clash: [v('Remaining time: none. Please cease.'), h('You forgot to count what grows back.'), n('Green shoots break through Omega’s plating, and its great countdown stops, one digit at a time, and then begins to count upwards.')],
    ending: [h('Omega is still running, you know. I planted a garden on it.'), o('What does it calculate now?'), h('Mostly rainfall. It seems very happy.')],
  },
  oblivion: {
    nemesis: 'aurelia',
    intro: [n('Oblivion is what is left after the last timeline ends.'), h('I have seen how all of this finishes, Oren. I have done it myself, many times.'), o('Then why are you here?'), h('I would like to find out what happens if I do not.')],
    rival: [v('Monster! I have followed you through a thousand burned worlds, and I will end you here.'), h('Saint Aurelia. You have burned quite a few of them yourself.'), v('In your name! To stop you!')],
    clash: [v('This world can burn too, if that is what it takes!'), h('Listen to yourself. You sound just like me.'), n('Oblivion lets her blade land and does not raise a hand. In the quiet that follows, Saint Aurelia finally looks at what she has done, and she lays down her sword.')],
    ending: [h('I have never seen a morning before. I was usually gone by then.'), o('What do you think of it?'), h('Hm. Let us leave it where it is.')],
  },
};

const DEFAULT_ARC = ARCS.wanderer;

export function getNemesis(characterId: string): VillainId {
  return (ARCS[characterId] ?? DEFAULT_ARC).nemesis;
}

export const STORY_CHAPTER_COUNT = SHARED_CHAPTERS.length;

// index is 0-based (level 1 → 0). Pass 'epilogue' for the ending.
export function buildChapter(index: number | 'epilogue', characterId: string): StoryChapter | undefined {
  const arc = ARCS[characterId] ?? DEFAULT_ARC;
  if (index === 'epilogue') return { ...SHARED_EPILOGUE, lines: [...SHARED_EPILOGUE.lines, ...arc.ending] };
  const shared = SHARED_CHAPTERS[index];
  if (!shared) return undefined;
  const personal = index === 0 ? arc.intro : index === 4 ? arc.rival : index === 8 ? arc.clash : [];
  return { ...shared, lines: [...shared.lines, ...personal] };
}

export function getChapterTitle(index: number): string | undefined {
  return SHARED_CHAPTERS[index]?.title;
}
