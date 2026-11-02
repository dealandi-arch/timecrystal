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
  vex: { name: 'Vex the Unwound', blurb: 'A rogue Archive scholar who rewrote the crystal’s mathematics.' },
  kestrel: { name: 'Captain Kestrel', blurb: 'A fallen Vault Guard captain who decided he was owed the crystal.' },
  hollow: { name: 'The Hollow', blurb: 'An echo of every path not taken, hungry for what is real.' },
  sorrow: { name: 'Matron Sorrow', blurb: 'The warden of temporal detention, who would lock up the world to keep it safe.' },
  tick: { name: 'Baron Tick', blurb: 'A clockwork tyrant grinding time into parts and charging tolls on every second.' },
  mirror: { name: 'The Mirror', blurb: 'A dark copy built from every piece of yourself you left behind.' },
  grimsby: { name: 'Grimsby the Collector', blurb: 'A hoarder of rare moments with a net and a trophy case.' },
  ashen: { name: 'The Ashen Queen', blurb: 'What fire becomes when it is finished — she burns timelines to cold ash.' },
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
    nemesis: 'tick',
    intro: [h('I know every checkpoint route between here and the end of time. Somebody has been changing them.'), o('Changing them how?'), h('Clocking them. Like someone is charging a toll.')],
    rival: [v('Ah, the courier! Every route now runs through my gears, my dear. Tolls are due.'), h('Baron Tick. Of course you found a way to sell time.'), v('Not sell. Rent.')],
    clash: [v('Without me, nobody would ever arrive on time!'), h('Without you, nobody would have to pay to get anywhere.'), n('The Scout darts through Tick’s machinery faster than his gears can turn, and it seizes.')],
    ending: [h('All the routes are free again. Last delivery of the day — one crystal, intact.'), o('Signed, sealed, delivered.')],
  },
  phantom: {
    nemesis: 'mirror',
    intro: [n('Phantom slips between moments, never quite in one place.'), h('Something has been following me through the gaps. Something wearing my shape.'), o('Then it already knows where you are going.')],
    rival: [v('You leave a little of yourself behind every time you phase. I am made of all those pieces.'), h('Then give them back.'), v('Come and take them.')],
    clash: [v('I am more you than you are! I remember every moment you skipped.'), h('Then remember this one.'), n('Phantom stops phasing and stands completely still. The Mirror, with nothing left to copy, cracks.')],
    ending: [h('I think I will stay in one moment for a while. See what it is like.'), o('Most people find it overrated.'), h('I will be the judge of that.')],
  },
  berserker: {
    nemesis: 'sorrow',
    intro: [h('Six timelines since I broke out. Feels like someone has been following my trail.'), o('The detention wardens never give up a prisoner.'), h('And I never give up running.')],
    rival: [v('My runaway. You cannot outrun a sentence, you know. Time is the cell.'), h('Matron Sorrow. Still trying to lock up the whole world?'), v('Only the parts that misbehave.')],
    clash: [v('Come back to your cell, and I will keep you safe from yourself forever.'), h('I do not need safe. I need free.'), n('The Berserker’s charge shatters Sorrow’s chains of frozen seconds.')],
    ending: [h('No more running. Nobody left chasing.'), o('What will you do with all that energy?'), h('Find something worth charging at that is not a prison door.')],
  },
  sage: {
    nemesis: 'ashen',
    intro: [h('I have seen this before, Oren. A long time ago, in a timeline that burned.'), o('You survived a burned timeline?'), h('I survived the woman who burned it.')],
    rival: [v('Old woman. I expected you to have crumbled by now.'), h('Ashen Queen. You always did underestimate patience.'), v('And you always overestimated time.')],
    clash: [v('Everything ends in ash. I am simply honest about it.'), h('Everything ends. That is what makes the middle worth protecting.'), n('The Sage waits, and at exactly the right moment she strikes. The Queen’s crown cracks.')],
    ending: [h('The ash is settling. Things will grow here again.'), o('Will you see it?'), h('I am patient. I will see it.')],
  },
  trickster: {
    nemesis: 'grimsby',
    intro: [h('Ever been chased by a man with a butterfly net the size of a house?'), o('…No.'), h('Lucky. He wants to pin me to a board.')],
    rival: [v('The Trickster! Three places at once — what a specimen. My collection is incomplete without you.'), h('Grimsby, you have collected every rare moment in time. Give some back.'), v('Never! Mine. All mine.')],
    clash: [v('Hold still! Just hold still for one second!'), h('Never have, never will.'), n('Grimsby’s net closes on three Tricksters at once — every one of them a decoy. His vaults burst open.')],
    ending: [h('All of Grimsby’s stolen moments are flying home. Sunsets, first words, birthday candles…'), o('That is beautiful.'), h('And I nicked his net. For later.')],
  },
  warden: {
    nemesis: 'grimsby',
    intro: [n('For eleven cycles, nothing got past the Warden.'), h('Something did, once. A thief in the deepest vault. I never caught him.'), o('And now?'), h('Now I can smell his cologne.')],
    rival: [v('The great wall himself! I took one little moment from your vault, you know. You never noticed.'), h('I noticed, Grimsby. I have been waiting.'), v('Then keep waiting!')],
    clash: [v('You cannot stop me — you are too slow!'), h('I do not need to be fast. I need to be in the way.'), n('Grimsby runs straight into the Warden’s shield and bounces off.')],
    ending: [h('Every stolen moment is back in the vault. Eleven cycles, one thief. Perfect record.'), o('Will you return to your post?'), h('Someone has to.')],
  },
  chronomancer: {
    nemesis: 'vex',
    intro: [h('Somebody has been firing bolts backwards through time. I recognise the technique.'), o('Yours?'), h('My teacher’s.')],
    rival: [v('My finest student! Still aiming half a second ahead?'), h('Vex. You taught me that trick.'), v('I taught you half of it.')],
    clash: [v('You cannot hit what has already moved!'), h('I am not aiming where you are, Vex. I am aiming where you are about to be.'), n('Her bolt lands half a second before Vex arrives in its path.')],
    ending: [h('Vex taught me to bend causality. I think I will teach people to leave it alone.'), o('A wise lesson.'), h('It took me a few tries.')],
  },
  shade: {
    nemesis: 'mirror',
    intro: [n('Shade has always lived in the dark between frames. Lately, the dark has started looking back.'), h('Something is in my shadow, Oren.'), o('Shadows are your home.'), h('That is what worries me.')],
    rival: [v('Every time you stepped outside the frame, you left me there. Alone.'), h('I did not know you existed.'), v('You will.')],
    clash: [v('Give me the light! I want to be the one who gets to stand in it!'), h('Then stand in it with me.'), n('Shade steps into the light and pulls the Mirror with them. Together, there is only one shadow.')],
    ending: [h('It feels quieter now. Like I am finally all in one place.'), o('Welcome to the light, Shade.'), h('Bit bright. I will get used to it.')],
  },
  templar: {
    nemesis: 'ashen',
    intro: [h('My order was dissolved the night the first shard fell. There was a woman in grey at the ceremony.'), o('You remember her?'), h('I remember the smell of smoke.')],
    rival: [v('The last Templar. I burned your order’s oaths myself. Why do you still keep them?'), h('Because oaths are not paper, Queen. They do not burn.'), v('Everything burns.')],
    clash: [v('Your order is gone! Who are you even protecting?'), h('Everyone you would have burned next.'), n('The Templar’s measured strikes cut through the smoke, and the Ashen Queen’s fire dies.')],
    ending: [h('The order is gone. But the oath remains, and I think others will take it.'), o('I would.'), h('Then that makes two of us.')],
  },
  drifter: {
    nemesis: 'tick',
    intro: [h('I have patched a hundred timelines, and lately every break has gear-teeth marks on it.'), o('Gears?'), h('Somebody is grinding time down for parts.')],
    rival: [v('The patch-woman! You keep fixing what I take apart. Most inefficient.'), h('Baron Tick. You are the reason my toolbox is empty.'), v('And you are the reason my profits are down.')],
    clash: [v('My clockwork is perfect! Every second accounted for!'), h('Yeah? Then you will not mind if I loosen this one bolt.'), n('The Drifter twists a single screw, and Tick’s whole machine unwinds with a sad little sproing.')],
    ending: [h('That is the last patch. The timeline is running smooth.'), o('What will you do now?'), h('Retire. …Maybe. Probably not.')],
  },
  specter: {
    nemesis: 'hollow',
    intro: [n('Specter barely registers on timeline scanners. Lately, something else does not register at all.'), h('There is a gap following me. Not a shadow — an absence.'), o('The Hollow. It feeds on things that live between frames.')],
    rival: [v('Little Specter. Half here, half nowhere. Come the rest of the way. Be nothing with us.'), h('I like being half here. It is the best half.'), v('It will not last.')],
    clash: [v('Join us! No more flickering, no more fading!'), h('I am not fading. I am moving.'), n('Specter moves so fast the Hollow cannot keep its grip, and it collapses into silence.')],
    ending: [h('The scanners picked me up today. Clear as anything.'), o('How does it feel to be seen?'), h('Weird. Good weird.')],
  },
  ironclad: {
    nemesis: 'kestrel',
    intro: [h('The surge that made me like this was not an accident.'), o('Who would do such a thing?'), h('Someone who needed a test subject who would not die.')],
    rival: [v('My greatest success! Captain Kestrel’s iron soldier. I made you, you know.'), h('You broke me, Kestrel.'), v('I improved you.')],
    clash: [v('Stand down, soldier! That is an order!'), h('I do not take orders from you anymore.'), n('Ironclad plods forward through every blow until Kestrel has nowhere left to retreat.')],
    ending: [h('I am still slow. Still heavy. But I am mine.'), o('That is the strongest armour of all.')],
  },
  viper: {
    nemesis: 'grimsby',
    intro: [h('The tournament circuits are closed. Somebody bought them all out.'), o('Who would want them?'), h('A collector. And apparently I am his prize fighter.')],
    rival: [v('Viper! My champion! I own your contract, your title, your timeline.'), h('Grimsby. You do not own anything I can hit three times a second.'), v('Let us test that.')],
    clash: [v('You belong in my trophy case!'), h('I belong in the ring. And you are in it.'), n('Viper strikes three times before Grimsby can finish his sentence.')],
    ending: [h('The circuits are open again. Free entry. No promoters.'), o('And you?'), h('Reigning champion. Obviously.')],
  },
  ghost: {
    nemesis: 'mirror',
    intro: [n('No one has ever clocked the Ghost. But something has been matching their speed.'), h('There is another blur out there, Oren. Same speed as me.'), o('Nothing is as fast as you.'), h('That is what scares me.')],
    rival: [v('Race you.'), h('You are me. You would just tie.'), v('Not if you blink first.')],
    clash: [v('I am faster! I am always one step ahead!'), h('Then I will stop running.'), n('The Ghost halts. The Mirror, racing ahead, slams straight into the crystal’s light and shatters.')],
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
    nemesis: 'hollow',
    intro: [n('The Titan absorbed a temporal collapse at the core of the fracture.'), h('I did not absorb all of it. Some of it got away.'), o('And it has been growing ever since.')],
    rival: [v('We were inside you once, Titan. It was warm. Let us back in.'), h('No. You are the part of the collapse I could not hold.'), v('Then we will hold you.')],
    clash: [v('You cannot carry everything forever!'), h('Watch me.'), n('The Titan pulls the Hollow in, holds it, and does not let go. The void goes still.')],
    ending: [h('It is heavy. But it is quiet.'), o('You carry a great deal.'), h('Somebody should.')],
  },
  rift: {
    nemesis: 'sorrow',
    intro: [h('I spent so long inside a shard. When I came out, everyone I knew was gone.'), o('I am sorry.'), h('Someone else said that to me once. She has not stopped saying it.')],
    rival: [v('Rift. Poor Rift. Let me keep you inside the shard, where nothing can be lost.'), h('Matron Sorrow. I already lost everything. There is nothing left to protect me from.'), v('There is always more to lose.')],
    clash: [v('Stay sad with me! It is safe in here!'), h('Being sad is not the same as being safe.'), n('Rift’s harmonic bolts ring out, and Sorrow’s cage of grief shatters.')],
    ending: [h('I am going to make new friends. Lots of them.'), o('You can start with me.'), h('Deal.')],
  },
  oracle: {
    nemesis: 'vex',
    intro: [h('I have seen this day a thousand times. In every version, Vex is waiting.'), o('Vex?'), h('The one who broke the crystal’s mathematics.')],
    rival: [v('The blind seer! Tell me — do you see yourself winning?'), h('I see every outcome, Vex. You only win in one.'), v('Then I will make that one happen.')],
    clash: [v('Show me the future where I lose!'), h('You are standing in it.'), n('The Oracle steps aside from a spell she saw coming yesterday, and Vex’s own bolt rebounds.')],
    ending: [h('For the first time, I cannot see what happens next.'), o('Does that frighten you?'), h('No. It is wonderful.')],
  },
  ranger: {
    nemesis: 'hollow',
    intro: [h('Out on the edges, the land keeps disappearing. Not changing — vanishing.'), o('The Hollow. It eats places nobody is watching.'), h('I am watching now.')],
    rival: [v('Ranger. You map the edges. We erase them. A natural partnership.'), h('No. I make sure people can find their way home.'), v('There will be no home to find.')],
    clash: [v('You cannot shoot what is not there!'), h('I can shoot where you are going.'), n('The Ranger’s longshot hits the Hollow from across the chamber, and the edges of the world snap back into place.')],
    ending: [h('I am drawing new maps. Every edge accounted for.'), o('May I have a copy?'), h('The first one is yours.')],
  },
  tinker: {
    nemesis: 'tick',
    intro: [h('Somebody built a machine to grind up time. Shoddy work. Loose gears everywhere.'), o('You can tell from the debris?'), h('I can tell from the screws.')],
    rival: [v('A fellow engineer! Come work for me. I have a machine that eats seconds!'), h('Baron Tick. I have seen your soldering. Hard pass.'), v('How rude!')],
    clash: [v('My machine is a masterpiece!'), h('Your machine has a design flaw. It is you.'), n('Tinker rewires Tick’s machine mid-fight, and it starts giving seconds back.')],
    ending: [h('I kept a few of Tick’s gears. They will make a great clock.'), o('A clock that works?'), h('Mostly.')],
  },
  valkyrie: {
    nemesis: 'kestrel',
    intro: [h('The storm broke when the crystal did. The soldiers I was carrying fell to earth.'), o('And you came down with them.'), h('Someone is gathering them up. Making them fight again.')],
    rival: [v('The storm-rider! Your fallen soldiers make excellent guards. They never tire.'), h('Kestrel. Those soldiers earned their rest.'), v('Rest is for the weak.')],
    clash: [v('My army is endless!'), h('Your army is tired. And so are you.'), n('The Valkyrie raises her shield, and every fallen soldier lays down their arms. Kestrel stands alone.')],
    ending: [h('The storm is back. Time to carry them home.'), o('Will we see you again?'), h('Hopefully not for a long time.')],
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
