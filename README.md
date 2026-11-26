# Under Fuji

A cooperative trivia adventure for two players on one screen, set in old Japan.

**Play it: https://bolgacg.github.io/under-fuji/**

One of you plays an old ronin, the other a wandering shrine painter who can hear spirits. In 14 days the
sun goes dark over Mount Fuji and something under the mountain wakes. You cannot lose. What you do on
the road decides which of six endings you get. One journey takes 60 to 90 minutes. It is made for a
laptop or a television, with one keyboard and mouse passed between you.

Nothing is installed and there is no account. The journey is saved in your browser after every action,
so closing the tab or a crash costs you at most the action you were in the middle of. Settings can
write the journey to a file, which carries it to another browser or computer.

## Rules on one page

- A day has three actions. Click any place on the map to travel; the number on it is the cost in actions.
- At a place you can explore, meet people, seek the kami, gather herbs or take a quest.
- Every technique asks its user one question. Steady: four choices, a right answer gives the full effect,
  a wrong one a weak effect. Bold: a harder question for 1.5 times the effect. Blind: a typed answer for
  2 times the effect. A wrong Bold or Blind answer does nothing.
- Typed answers pass on close spelling, and a surname alone is enough. If the judge is wrong, the buttons
  "We had it" and "Too generous" overrule it.
- Every enemy has a Body bar and a Spirit bar. The Ronin cuts Body, the Spirit-Talker cuts Spirit, and
  both bars must be emptied. Each round each of you uses one technique, then the enemy strikes.
- Damage beyond an empty bar spills into the other bar at half strength. The fight log says when it does.
- When the enemy's larger bar is half down, its specialist may try a finisher (Decisive Duel or Soothe):
  one question, right ends the fight at once with better loot, wrong costs a blow.
- Each player picks two Ways (topic groups) and a difficulty per Way. Difficulty is a handicap: a harder
  question gives the same effect. Set it where each of you gets about two in three right. Shrines show
  your hit rate and suggest a change.
- Three techniques and one charm per character, four relics in the shared satchel. Swap them at shrines.
- Five regions each give a herb and a blessing. Two herbs from different regions brew into a remedy at a
  shrine. A blessing gives each of you a technique; two blessings fuse into a stronger one.
- Dangerous quests pay best (loot up to Legendary). Patience quests pay well (up to Epic).
- A Rare or better find is often a named treasure. There are seventeen, each one of a kind, and each
  changes how you play. They are at the end of `data/world.js`.
- If you are both shaken in a fight you wake at the nearest shrine, one action and a few coins poorer.
- The Journal lists blessings, quests and what you have learned. Undo takes back up to six actions.
- After an ending, "Try the endings" on the menu replays the finale on a copy of the journey with every
  path open. Nothing from a rehearsal is saved or recorded.

## Renown and records

A finished journey earns renown: points for the ending, blessings, right answers (harder and typed
ones count more), fights won, quests and treasures, minus a little for each time you were shaken.
"Records" on the menu lists the journeys finished in this browser, and the ending screen copies a
one-line result to paste to friends.

### The shared board

The game can also keep one board for everybody who plays this copy. It is switched off until
`data/config.js` names a backend, because a static page cannot store anything shared by itself. The
code expects a free Supabase project with one table:

    create table scores (
      id uuid primary key,
      team text not null check (char_length(team) between 1 and 40),
      score int not null check (score between 0 and 5000),
      ending text not null check (ending in ('sealing','calming','bargain','festival','sleep','kami')),
      blessings int not null default 0 check (blessings between 0 and 5),
      undos int not null default 0 check (undos >= 0),
      created_at timestamptz not null default now()
    );
    alter table scores enable row level security;
    create policy "anyone can read" on scores for select using (true);
    create policy "anyone can add" on scores for insert with check (true);

Put the project URL and its public ("anon") key into `board` in `data/config.js`. Rows can be added and
read by anyone with the page, and nobody can change or delete them from the page. Scores are sent by
the browser, so the board is for friends, not for strangers.

## Sound and narrator

Music and sound effects are synthesised in the browser by `js/audio.js`; there are no audio files for
them. The music is generated note by note from Japanese pentatonic scales, one mood per place and per
kind of fight. The buttons in the bottom left corner set the music (off, soft or full) and the effects.

A copy that has narrator clips in `assets/voice/` also reads the story texts aloud, and Settings lists
the voices. `tools/render_voice.py` renders them with edge-tts and names each clip after a hash of its
text. The hosted copy is published without those clips.

## Running a copy yourself

It is a folder of static files. Any web server will do:

    python3 server.py        # then open http://localhost:4592

| File | Content |
|---|---|
| `data/config.js` | Version, site address, the shared board. |
| `data/balance.js` | Every tunable number. Change the game here. |
| `data/world.js` | Places, roads, Ways, techniques, herbs, remedies, items, enemies. |
| `data/events.js` | The encounters, quests, the halls inside Fuji and the endings. |
| `data/lore_questions.js` | Questions about old Japan used by story moments. |
| `data/questions.js` | 5,295 questions from Open Trivia DB, written by `tools/fetch_questions.py`. |
| `js/engine.js`, `js/combat.js`, `js/trivia.js` | Rules with no screen code, shared with the simulator. |
| `js/ui.js`, `js/audio.js`, `index.html`, `style.css` | The screen and the sound. |
| `tools/simulate.mjs` | Plays automatic games and prints fight lengths, damage split and endings. |
| `tools/fetch_art.py` | Downloads the prints and writes `assets/prints/credits.json`. |

After changing a number in `data/balance.js` or an enemy in `data/world.js`, run
`node tools/simulate.mjs 2000` and read the lines for 70 percent right answers. The simulator plays at
random, so real players do somewhat better than it does.

## Credits and licences

- Questions: Open Trivia Database (opentdb.com), CC BY-SA 4.0. `data/questions.js` is under the same licence.
- Prints: public domain works by Hokusai, Hiroshige, Kuniyoshi, Yoshitoshi, Sharaku and Utamaro from the
  Art Institute of Chicago open access collection. Titles and links are in `assets/prints/credits.json`.
- Font: DotGothic16 by Fontworks, SIL Open Font Licence.
- The story draws on Japanese folklore: Iwanaga-hime, the rock princess, and her sister
  Konohanasakuya-hime, the blossom princess of Mount Fuji.
