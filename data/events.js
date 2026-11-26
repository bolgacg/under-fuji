// Encounters, quests, the mountain and the endings.
// A choice is [label, test, text if passed, effects if passed, text if failed, effects if failed, requirement].
(function () {
  const UF = globalThis.UF = globalThis.UF || {};
  UF.EV = {};
  const ev = (id, place, slot, kind, title, img, text, c) => { UF.EV[id] = { id, place, slot, kind, title, img, text, c }; };
  const Q = (who, n, lives, x) => Object.assign({ who: who || 'lead', n: n || 1, lives: lives || 1 }, x);
  const F = id => ({ fight: id });
  const KAMI = { n: 2, lives: 2 };

  // ---------------- Edo ----------------
  ev('edo_cat', 'edo', 'talk', 'funny', "The Fortune-Teller's Cat", 'oni',
    `An old woman sells fortunes at a folding table. She does not choose them. Her white cat does, with one slow paw. It has been staring at you since you turned into the street.`, [
      ['Pay 2 coins for a fortune', null, `The cat pushes a slip toward you. "What sleeps under the mountain was a sister once." The old woman shrugs. "He is never wrong about rain either."`, { coins: -2, flag: 'rumour', mirth: 1 }, , , { coins: 2 }],
      ['Pet the cat instead', Q(), `It allows this. The old woman is so astonished that she gives you her lunch.`, { hp: 4, mirth: 1 }, `It bites you, calmly, like someone signing a letter.`, { hp: -2, mirth: 1 }]]);
  ev('edo_sumo', 'edo', 'talk', 'funny', 'The Sumo Stable', 'edo',
    `A stable of wrestlers is practising in the street because their roof fell in. The largest, who is perhaps nineteen and perhaps a hill, bows to the ronin. "Grandfather. One bout. For the honour of our roof."`, [
      ['Accept the bout', Q('ronin'), `You use his weight against him, as the old masters taught. He sits down in a puddle and laughs until the whole street laughs.`, { coins: 8, mirth: 1 }, `You wake under an awning. The wrestlers have left rice cakes and an apology.`, { hp: -3, coins: 2, mirth: 1 }],
      ['Decline with dignity', null, `He looks relieved. So does your back.`, { free: 1 }]]);
  ev('edo_print', 'edo', 'talk', 'story', "The Print Seller's Boy", 'bg',
    `Behind a print stall a boy is drawing waves on scrap paper. Hundreds of waves. "They are all wrong," he says without looking up. "The foam should look like hands."`, [
      ['Show him a brushstroke', Q('talker'), `You show him how a claw of ink can curl. He stares, then draws it better than you did. He presses a sketch on you as payment.`, { item: 'sketch' }, `"No," he says kindly. "But thank you." He goes back to his waves.`, { mirth: 1 }],
      ['Buy a print (5 coins)', null, `A red mountain under a mackerel sky. It makes the road feel shorter.`, { coins: -5, hp: 5 }, , , { coins: 5 }]]);
  ev('edo_soba', 'edo', 'talk', 'eerie', 'The Night Soba Cart', 'pass',
    `Late, near the moat, one soba cart is still lit. The broth smells wonderful. The cook turns to greet you and has no face at all, smooth as an egg. He is holding out two bowls.`, [
      ['Compliment the broth', Q(), `You eat. It is the best soba in Edo. The faceless cook cannot smile, but somehow the cart does. He refuses payment and adds an egg.`, { hp: 6, harmony: 1, mirth: 1 }, `You compliment it in a voice two octaves too high. He serves you anyway. You eat very fast.`, { hp: 3, mirth: 1 }],
      ['Run', null, `You run. Behind you a polite voice from no mouth calls that you forgot your change.`, { coins: 3, dread: 1 }]]);
  ev('edo_haggle', 'edo', 'quest', 'patience', 'The Merchant Who Never Loses', 'oni',
    `Daikokuya Jubei has not sold anything at the asking price in forty years, and has not lost a haggle either. On his top shelf sits a lacquer box he will not put a price on. "Wear me down," he says, pouring himself tea. "Many have tried."`, [
      ['Haggle: five good arguments, two slips allowed', Q('alt', 5, 3), `At the fifth counter-offer his eye twitches. At the sixth he laughs, takes the box down and names a price of one coin. "Tell no one."`, { coins: -1, loot: 'patience', mirth: 1, done: 'edo_haggle' }, `He wins, as he has for forty years, and sells you a very ordinary comb at a very special price.`, { coins: -3, mirth: 1 }],
      ['Another day', null, `He waves you off without looking up. "They always come back."`, { free: 1 }]]);

  // ---------------- Lantern Town ----------------
  ev('fest_fish', 'festival', 'quest', 'patience', 'Goldfish Scooping', 'festival',
    `A stall of paper scoops and a tub of goldfish that seem, on close inspection, to be watching you back. Nobody has ever caught the big black one. "Five fish wins a prize. Your scoop tears when your attention does." The questions here are true or false.`, [
      ['Play: five catches, the scoop survives two mistakes', Q('alt', 5, 3, { m: 'b' }), `Five fish, and the last is the big black one, which gives you a look of professional respect. The prize is real.`, { loot: 'patience', mirth: 1, done: 'fest_fish' }, `The paper tears. The black fish blows a single bubble. It sounds like a laugh.`, { mirth: 1 }],
      ['Watch the fish for a while', null, `They watch you for a while too. Fair is fair.`, { free: 1 }]]);
  ev('fest_drum', 'festival', 'quest', 'eerie', 'The Drum Without a Drummer', 'cloudshrine',
    `After midnight the festival drum plays itself. Slow, patient, a rhythm nobody taught it. The townspeople have stopped sleeping. The drum is a hundred years old this year, and things that reach a hundred wake up.`, [
      ['Keep time with it until it is satisfied', Q('alt', 2, 2), `You play alongside a hundred-year-old drum until dawn. When the sun comes up it sighs like a tired child and lets you lift it. It wants to travel.`, { item: 'drum', flag: 'drum', harmony: 1, done: 'fest_drum' }, `You lose the rhythm. The drum plays on, a little disappointed, and the town stays awake another night.`, { hp: -2 }],
      ['Cut the drumskin', null, `The blade goes through. The sound it makes is not a drum sound. The town sleeps that night. You do not.`, { dread: 2, loot: 'danger', done: 'fest_drum' }],
      ['Leave it playing', null, `It keeps the beat as you go, as if counting something down.`, { free: 1 }]]);
  ev('fest_mask', 'festival', 'talk', 'funny', 'The Mask Stall', 'festival',
    `Fox masks, demon masks, masks of fat happy gods. One fox mask in the back row blinks. The stallkeeper follows your eyes and sighs. "That one is six coins and it chooses who wears it."`, [
      ['Buy it (6 coins)', null, `It is warm on the inside, as if someone had just taken it off.`, { coins: -6, item: ['mask', 1] }, , , { coins: 6 }],
      ['Blink back at it', Q(), `It winks. A coin purse you did not have is now in your sleeve.`, { coins: 7, mirth: 1 }, `It sticks out a wooden tongue. The children nearby are delighted.`, { mirth: 1 }]]);
  ev('fest_tanuki', 'festival', 'quest', 'patience', "The Tanuki's Seven Questions", 'teahouse',
    `A round gentleman in a straw hat is drinking behind the sake stall. His shadow has a tail. "Seven questions," he says. "True or false. Miss one and we start again from the first, and I pour myself another. I have all night. I have all century."`, [
      ['Sit down: seven right in a row', Q('alt', 7, 1, { m: 'b' }), `Seven. He stares into his cup, then at you, then hands over the flask itself. "It never empties. I was getting bored of it anyway." This is a lie. He loved that flask.`, { item: 'flask', mirth: 2, done: 'fest_tanuki' }, `"Wrong!" He is so happy. He pours. "From the top, whenever you like."`, { free: 1 }],
      ['Not tonight', null, `"Coward," he says warmly.`, { free: 1 }]]);
  ev('fest_dance', 'festival', 'talk', 'eerie', 'The Dance for the Dead', 'cloudshrine',
    `The whole town is dancing in a slow ring around the drum tower, and some of the dancers are a little see-through. Nobody minds. Tonight the dead are guests. An old lady who is certainly one of them beckons you into the ring.`, [
      ['Join the ring', Q(), `You dance badly and are forgiven. The old lady pats your cheek with a hand like cool air. You feel lighter for days.`, { hp: 6, harmony: 1, mirth: 1 }, `You step on a ghost's foot. There is no foot. You both apologise anyway.`, { hp: 2, mirth: 1 }],
      ['Watch from the edge', null, `From here you can count the dancers who cast no shadow. You stop at twelve.`, { dread: 1 }]]);

  // ---------------- Crossroads Teahouse ----------------
  ev('tea_master', 'teahouse', 'quest', 'patience', 'The Tea Master', 'teahouse',
    `They say she was the last student of the great Rikyu. She kneels by the kettle and does nothing at all. The water is not yet hot. "Tea," she says, "is mostly waiting." There is no question here. There is only the kettle.`, [
      ['Sit and wait for the tea', { wait: { secs: 14, lines: ['A leaf falls in the garden. It takes its time.', 'The kettle ticks once, like a thought.', 'A sparrow considers the wall, and decides against it.', 'Steam, at last. She lifts the ladle as if it weighed a year.'] } },
        `She sets one bowl between you. It is the best thing either of you has ever tasted, and it is mostly the waiting. When you leave, the bowl is in your pack. She seems not to notice.`, { item: 'cup', mirth: 1, harmony: 1, done: 'tea_master' },
        `"Sake is next door," she says, without opening her eyes. The kettle, behind you, begins to sing.`, { mirth: 1 }],
      ['Come back when you have more patience', null, `She nods, which takes a while.`, { free: 1 }]]);
  ev('tea_biwa', 'teahouse', 'x', 'eerie', 'The Blind Biwa Player', 'snow',
    `A blind musician plays in the corner, an old war ballad about a drowned clan. He plays every night, the owner says, but lately he comes home with mud on his knees and no memory of where he has been singing.`, [
      ['Follow him tonight', Q('talker'), `He plays in a graveyard, to an audience of pale flames. You wait for the last verse, then lead him home by the sleeve. The flames bow. One of them whispers a name as you pass: Iwanaga.`, { flag: 'name1', harmony: 1, dread: 1 }, `The flames notice you. You get him out, but something cold follows you back as far as the gate.`, { hp: -4, dread: 1 }],
      ['Paint sutras on him for protection', null, `You remember the old story and paint every part of him. Including the ears. Especially the ears. He is confused but grateful.`, { mirth: 1, coins: 4 }]]);
  ev('tea_pilgrim', 'teahouse', 'x', 'story', 'Rumours on the Road', 'teahouse',
    `A pilgrim in white, bound for the summit, will go no further. "The mountain goddess is the blossom princess, everyone knows that. Nobody asks what became of her sister. The plain one. The one the heavenly prince sent home." He lowers his voice. "Stone does not forget."`, [
      ['Buy him a meal and listen (3 coins)', null, `He tells it all. The prince chose the blossom and refused the rock, and so human lives are short, like flowers. The rock princess went under the mountain with her shame. Her name was Iwanaga. The eclipse is the anniversary.`, { coins: -3, flag: 'name1' }, , , { coins: 3 }],
      ['Trade road stories', Q(), `You swap tales until the lamps burn low. He gives you something from his pack for luck.`, { loot: 'road', mirth: 1 }, `He has heard them all, and better told.`, {}]]);

  // ---------------- Shrines ----------------
  ev('shr_fox', 'shrine', 'x', 'funny', 'The Thief at the Offering Box', 'foxshrine',
    `Something has been stealing the fried tofu from the offering box. You catch it in the act: a fox, very small, very embarrassed, with tofu on its nose.`, [
      ['Leave your own tofu beside it (2 coins)', null, `The fox bows, which foxes do not do. That night you both dream of a white gate, and wake with something in your hand.`, { coins: -2, harmony: 1, loot: 'road' }, , , { coins: 2 }],
      ['Chase it off', Q('ronin'), `It drops what it was carrying. Not tofu. Somebody's lost charm.`, { loot: 'road' }, `It is faster than you. It is faster than anything. It laughs like a kettle.`, { mirth: 1 }]]);
  ev('shr_ema', 'shrine', 'x', 'eerie', 'The Unwritten Plaque', 'market',
    `Among the wooden prayer plaques hangs one with nothing on it. As you watch, characters appear, slowly, as if an invisible brush were thinking. It is your two names. Then a third line begins.`, [
      ['Read the third line', Q('talker', 1, 1, { lore: 1 }), `It says: "Come before the sun goes dark. Bring patience. I have had to." The ink is still wet.`, { flag: 'rumour', harmony: 1 }, `The line blurs before you can read it. Your fingers come away black.`, { dread: 1 }],
      ['Take it down and burn it', null, `It burns green. Something under the mountain turns over in its sleep. In the ashes lies a thing that was not in the wood.`, { dread: 2, loot: 'danger' }]]);
  ev('cloud_name', 'cloudshrine', 'quest', 'story', 'The Second Sister', 'cloudshrine',
    `The Cloud Shrine honours the blossom princess of the mountain. Behind it, almost lost in cedar roots, stands a second and smaller shrine. Its nameplate has been chiselled blank. If you have heard her name on the road, you could carve it back. It must be typed.`, [
      ['Carve the name back', Q('talker', 1, 1, { m: 't', lore: 'name' }), `Iwanaga. As the last stroke is cut the cedars go still. Far below, something that has been called "it" for a thousand years hears its own name.`, { flag: 'truename', harmony: 2, done: 'cloud_name' }, `The chisel slips. The name will not come. Perhaps someone on the road knows it.`, { free: 1 }],
      ['Leave it blank for now', null, `Moss has begun to fill the chisel marks.`, { free: 1 }]]);

  // ---------------- Sea of Trees ----------------
  ev('for_compass', 'forest', 'x', 'eerie', 'Sleeping Compass', 'forest',
    `In the Sea of Trees the compass needle turns slowly, like a sleeper. Somewhere close, something is knocking on wood. Three knocks, a pause, three knocks. The tree spirits are either guiding you or playing.`, [
      ['Follow the knocking', Q('talker'), `It leads you to a clearing thick with mugwort and then, courteously, back to the path.`, { herb: ['mugwort', 2], harmony: 1 }, `They were playing. You walk in a circle for half a day.`, { act: 1, mirth: 1 }],
      ['Mark the trees and trust your blade', Q('ronin'), `Your cuts in the bark hold true. You find a dead traveller's pack, and bury the traveller.`, { loot: 'road', coins: 4 }, `The cuts close behind you like mouths. You find the path by luck.`, { hp: -3, dread: 1 }]]);
  ev('for_sandals', 'forest', 'x', 'eerie', 'The Hanging Sandals', 'ghost',
    `A row of straw sandals hangs from a low branch, neatly paired, the way they are left at a door. A pale figure stands beneath, looking up, trying to remember which pair was hers.`, [
      ['Help her find her pair', Q('talker'), `The smallest pair. She steps into them and is simply not there any more, the way a held breath is let go.`, { harmony: 1, loot: 'road' }, `You choose wrong. She turns, and her face is the worst part.`, { fight: 'yurei' }],
      ['Draw steel', F('yurei'), `The blade passes through grief as through mist, but it does pass. The sandals fall.`, { dread: 1 }]]);
  ev('for_woodcutter', 'forest', 'x', 'story', 'The Woodcutter Who Is Not', 'forest',
    `A woodcutter offers to guide you through. His axe is clean. His hands are soft. Three more woodcutters are doing a poor job of hiding behind a fallen cedar.`, [
      ['Spring the ambush first', F('bandit'), `They were better at hiding than at fighting, and they were bad at hiding.`, { coins: 4 }],
      ['Pay the "toll" (5 coins)', null, `They take the coins and, disarmed by your politeness, really do guide you through.`, { coins: -5, herb: ['mugwort', 1] }, , , { coins: 5 }],
      ['Talk them out of it', Q('talker'), `You describe, in detail, what else lives in this forest. They decide to become real woodcutters.`, { mirth: 1, harmony: 1, coins: 3 }, `They are not listeners.`, { fight: 'bandit' }]]);
  ev('kami_forest', 'forest', 'kami', 'kami', 'The Oldest Tree', 'forest',
    `At the heart of the forest stands a cedar wider than a house, hung with rope and paper. Small white figures with rattling heads sit along its roots like sparrows. The kodama have been expecting someone. They are not sure it is you.`, [
      ["Answer the forest: two right before two wrong", Q('alt', KAMI.n, KAMI.lives), `The white heads rattle all together, a sound like rain on bamboo. Something green and patient settles into your hands. As you leave, one kodama speaks in a voice like a twig. "She is called Iwanaga. Be kind."`, { bless: 'forest', flag: 'name1', harmony: 1 }, `The rattling stops. The tree is not offended. Trees have time. Come back.`, { hp: -2 }]]);

  // ---------------- Miho Pine Shore ----------------
  ev('coast_robe', 'coast', 'x', 'story', 'The Feather Robe', 'coast',
    `On a pine by the shore hangs a robe of feathers, lighter than the wind that moves it. In the shallows a woman is bathing, and she has just noticed that you have noticed the robe.`, [
      ['Return it and ask for a dance', Q('talker'), `She dances the dance of the moon palace on the sand, rising as she turns, and is gone into the light. A single feather comes down. It is enough.`, { item: ['feather', 2], harmony: 1 }, `She takes the robe and leaves at once, the way you would leave a party full of strangers.`, { harmony: 1 }],
      ['Keep it', null, `She cannot go home without it. She says so, once, quietly. The robe is the finest thing you have ever stolen.`, { item: 'robe', dread: 2 }]]);
  ev('coast_kappa', 'coast', 'x', 'funny', 'The Wrestler on the Tide Rocks', 'marsh',
    `A kappa sits on the tide rocks, challenging passers-by to wrestle. It is the size of a child and has thrown two fishermen into the sea already. The dish of water on its head gleams.`, [
      ['Bow very deeply', Q(), `It is polite. It bows back. The water spills from its head and it sits down, helpless and furious. You refill the dish. It owes you now, and kappa pay their debts.`, { loot: 'road', mirth: 1, harmony: 1 }, `You bow. It does not. It has met your kind before.`, { fight: 'kappa' }],
      ['Wrestle it', F('kappa'), `You win, narrowly, against something that weighs as much as a wet dog.`, { mirth: 1 }]]);
  ev('coast_net', 'coast', 'x', 'story', 'The Bell in the Net', 'coast',
    `Fishermen haul up a temple bell in their net, green with a century of sea. Before they can decide whose it is, men with swords arrive who have already decided.`, [
      ['Defend the fishermen', F('duelist'), `The swordsmen leave faster than they came. The fishermen give you the best of the catch.`, { hp: 4, herb: ['kelp', 2] }],
      ['Ring the bell', Q('talker'), `One note, low as the seabed. The swordsmen remember urgent business elsewhere. So do several crabs.`, { harmony: 1, coins: 4, herb: ['kelp', 2] }, `It makes a wet clunk. The swordsmen laugh, then stop laughing and draw.`, { fight: 'duelist' }]]);
  ev('kami_coast', 'coast', 'kami', 'kami', "The Dragon's Tide", 'bg',
    `At the lowest tide of the month a stair of wet stone leads down into the sea, and at its foot is a gate of coral. The Dragon King does not come up. He sends his tide, and the tide asks.`, [
      ['Answer the tide: two right before two wrong', Q('alt', KAMI.n, KAMI.lives), `The water draws back and leaves a jewel on the last step, the kind that rules the tides. It will not obey you. It will, now and then, agree with you.`, { bless: 'coast' }, `The tide comes in early and firmly. You are escorted, soaked, back up the beach.`, { hp: -3 }]]);

  // ---------------- Ukishima Marsh ----------------
  ev('marsh_wisps', 'marsh', 'x', 'eerie', 'Lights over the Reeds', 'snow',
    `Blue fires drift over the reeds at dusk, the kind that mean either a fox wedding or the dead. They move away when you approach and wait when you stop.`, [
      ['Follow them', Q(), `A fox wedding. You are given a cup of something and a seat at the back, and wake at dawn in the reeds holding a gift.`, { loot: 'road', mirth: 1, harmony: 1 }, `The dead. You wade back to the road with something cold holding your ankle until the last step.`, { hp: -4, dread: 1 }],
      ['Dig lotus root by their light', null, `The fires hold still for you, almost kindly.`, { herb: ['lotus', 2] }]]);
  ev('marsh_bridge', 'marsh', 'quest', 'danger', 'The Bridge at Night', 'spider',
    `On the old bridge stands a warrior monk as tall as a doorway, with a bundle of swords on his back. Nine hundred and ninety-nine, he says. He needs one more. He has needed one more for six hundred years. Two fights, no rest between them.`, [
      ['Duel for the bridge', F('benkei'), `He kneels. "At last. A thousand." But he means his own, which he lays at your feet. The armour is empty before it hits the planks. Then the armour stands up again without him.`, { next: 'marsh_bridge2' }],
      ['Turn back', null, `He watches you go. He has time.`, { free: 1 }]]);
  ev('marsh_bridge2', 'marsh', 'chain', 'danger', 'What Wore the Monk', 'spider',
    `Six hundred years of wanting one more sword, with nobody left inside to want it. It raises all nine hundred and ninety-nine at once.`, [
      ['Stand your ground', F('armour'), `It comes apart into moths. In the fallen bundle, one blade is still bright.`, { item: 'thousandth', dread: 1, done: 'marsh_bridge' }]]);
  ev('marsh_beans', 'marsh', 'x', 'funny', 'The Sound by the Stream', 'marsh',
    `By the stream at night, a sound: shoki, shoki, shoki. Someone is washing something in the dark and singing, cheerfully, "Shall I wash my beans, or catch a human to eat?"`, [
      ['Go and look', Q(), `A tiny old man washing red beans. He is mortified to have an audience. He has never caught a human in his life. He gives you sweet bean paste to keep the singing between you.`, { hp: 5, mirth: 1 }, `You slip on the bank and go in headfirst. The singing stops. Then, very quietly, laughter.`, { hp: -2, mirth: 1 }],
      ['Sing the next line back', null, `A long silence. Then a delighted, cracked voice starts a duet. You are still singing at dawn.`, { mirth: 2, act: 1 }]]);
  ev('kami_marsh', 'marsh', 'kami', 'kami', 'The Kappa Elder', 'marsh',
    `The elder of the marsh kappa is the size of a temple bell and has moss on his shell. He will give his blessing to anyone who can beat him at sumo, or to anyone who brings a good enough reason why not.`, [
      ['Step into the ring', F('kappaelder'), `He goes over like a felled tree and lies there laughing at the sky. "Three hundred years! Take it, take it."`, { bless: 'marsh', mirth: 1 }],
      ['Give him a reason: two right before two wrong', Q('alt', KAMI.n, KAMI.lives), `He considers your argument through one entire sunset. "Acceptable," he says, and presses a wet green thumb to each of your foreheads.`, { bless: 'marsh', harmony: 1 }, `"Insufficient," he says. He seems glad. He wanted to wrestle.`, { hp: -2 }]]);

  // ---------------- Hakone Pass ----------------
  ev('pass_gate', 'pass', 'x', 'funny', 'The Checkpoint', 'pass',
    `The checkpoint at Hakone searches everyone going west for weapons and everyone going east for runaway wives. The captain looks at a ronin and a wandering painter and cannot decide which crime you are.`, [
      ['Present your "papers"', Q('talker'), `You paint a travel permit while he watches, then hand it to him. He is so impressed by the nerve that he stamps it.`, { mirth: 1, coins: 3 }, `He reads it twice. "This is a poem about a frog."`, { coins: -4 }],
      ['Bribe him (6 coins)', null, `He was hoping you would.`, { coins: -6 }, , , { coins: 6 }],
      ['Go over the ridge at night', F('ashigaru'), `The patrol that finds you will be telling a different story tomorrow.`, { herb: ['ginseng', 1] }]]);
  ev('pass_tengu', 'pass', 'x', 'eerie', 'The Long-Nosed Stranger', 'tengu',
    `A mountain priest with a very long nose is sitting on a rock nobody could have climbed. "A game," he says. "I ask one thing. No choices offered. The mountain does not offer choices." This answer must be typed.`, [
      ['Accept', Q('lead', 1, 1, { m: 't' }), `He claps once and is a crow, and the crow is gone, and on the rock is your prize.`, { loot: 'danger', harmony: 1 }, `He laughs for some time. He is still laughing when the fog takes him.`, { mirth: 1 }],
      ['Decline politely', null, `"Wise," he says, in the tone of someone who means "dull".`, { free: 1 }]]);
  ev('pass_snow', 'pass', 'x', 'danger', 'The Hut in the Snow', 'springs',
    `Snow comes down on the pass out of a clear sky. There is a hut. In the night the door opens and a woman in white stands over you, her breath like frost on your faces. "You are too interesting to freeze," she says. "Promise never to speak of this, and live."`, [
      ['Promise', null, `She is gone. In the morning there is frost on the inside of the door, and a small cold gift on the sill. You do not speak of it. You are speaking of it now, to each other, with your eyes.`, { flag: 'promise', dread: 1, loot: 'road' }],
      ['Refuse to promise what you cannot keep', F('yukionna'), `She melts like a held breath. Where she stood, something glitters in the meltwater.`, { loot: 'danger', dread: 1 }],
      ['Offer her tea', Q('talker'), `No one has ever offered. She sits. The tea freezes in the cup and she drinks it anyway. She leaves at dawn by the door, like a guest.`, { harmony: 2, loot: 'road' }, `She looks at the cup. "Hot," she says, with real hatred.`, { fight: 'yukionna' }]]);
  ev('kami_pass', 'pass', 'kami', 'kami', 'The Great Tengu of the Cedars', 'tengu',
    `Above the pass, where the cedars are older than the road, the king of the tengu keeps a school of the sword for those who can reach it. Admission is by examination. The examination is him.`, [
      ['Stand the examination', F('tengu'), `He fights like weather. At the end he tucks his fan into his belt and nods once, which from him is a parade.`, { bless: 'pass' }],
      ['Ask for riddles instead: two right before two wrong, harder', Q('alt', KAMI.n, KAMI.lives, { d: 1 }), `"Tiresome. Correct, but tiresome." The wind that follows you down the mountain is his.`, { bless: 'pass', harmony: 1 }, `"Then we do it the honest way another day," he says, and is a crow.`, { hp: -2 }]]);

  // ---------------- Yumoto Hot Springs ----------------
  ev('spr_monkeys', 'springs', 'x', 'funny', 'Monkeys in the Bath', 'springs',
    `The outdoor bath is full of snow monkeys, pink-faced and blissful. One of them is wearing the ronin's hat. Another has the painter's brush case and is considering it as food.`, [
      ['Negotiate', Q('talker'), `You trade two persimmons for all of it. The monkeys throw in a bath. It is the best hour of the month.`, { hp: 8, mirth: 1 }, `You are out-negotiated by a monkey. You get the hat back.`, { hp: 3, coins: -2, mirth: 1 }],
      ['Charge', Q('ronin'), `The monkeys scatter. Your things are returned in the manner of things thrown from trees.`, { hp: 2, mirth: 1 }, `There is a short battle. Officially, nobody won.`, { hp: -2, mirth: 2 }]]);
  ev('spr_room', 'springs', 'x', 'danger', 'The Thirteenth Room', 'springs',
    `The inn has twelve rooms and thirteen doors. The innkeeper gives you room twelve and asks you, twice, not to mind any knocking from the wall.`, [
      ['Open the thirteenth door', F('armour'), `A suit of armour sat in there in the dark, waiting to be asked what it was guarding. Now it is quiet, you can see: a small chest, never claimed.`, { loot: 'danger', dread: 1 }],
      ['Knock back', Q(), `Three knocks, then three from the other side, then a kind of settling. It only wanted an answer. In the morning the thirteenth door is a wall.`, { harmony: 1, hp: 4 }, `The knocking does not stop until dawn. Neither of you sleeps.`, { hp: -3, dread: 1 }]]);
  ev('spr_licker', 'springs', 'x', 'funny', 'The Midnight Cleaner', 'springs',
    `At midnight something with a very long tongue is cleaning the bathhouse. It is small, red and extremely thorough. It freezes when it sees you, tongue still on the tiles.`, [
      ['Thank it for its work', null, `Nobody has ever thanked it. It cleans your sandals, your scabbard and, before you can stop it, your ears.`, { mirth: 2, hp: 3 }],
      ['Ask what it has overheard in the baths', Q(), `It hears everything. It tells you where a rich guest hid a purse and forgot it, and what the pilgrims whisper about a rock princess under the mountain.`, { coins: 8, flag: 'rumour' }, `It only speaks in slurps.`, { mirth: 1 }]]);
  ev('kami_springs', 'springs', 'kami', 'kami', 'The Ember Under the Water', 'springs',
    `The spring is going cold. Deep in the source cave, the fire child who heats it has curled up small as a coal, frightened of what is waking under the mountain. Someone will have to coax it back to burning.`, [
      ['Coax the ember: two right before two wrong', Q('alt', KAMI.n, KAMI.lives), `It flares, shy and then proud. The water steams again. It rides in your lantern for a while and leaves a little of itself in each of you.`, { bless: 'springs', harmony: 1 }, `It shrinks from your voice. The water stays lukewarm. Tomorrow, maybe.`, { hp: -1 }]]);

  // ---------------- Field of Broken Banners ----------------
  ev('bat_banners', 'battlefield', 'quest', 'danger', 'When the Armour Gets Up', 'spider',
    `Two armies died here in an afternoon and nobody won. At dusk the armour gets up. It does not know the war is over. Beyond the rows of the dead, something very large is assembling itself out of what they left behind. Two fights, no rest between them.`, [
      ['Walk into the field', F('armour'), `The first rank falls back into rust. The ground shakes. Bone by bone, the hungry skeleton stands up taller than a castle gate.`, { next: 'bat_boss' }],
      ['Not today', null, `The banners stir, though there is no wind.`, { free: 1 }]]);
  ev('bat_boss', 'battlefield', 'chain', 'danger', 'Gashadokuro', 'snow',
    `It is made of everyone who was never buried. Its teeth chatter like a thousand dice. It bends down to look at you, and it is so hungry, and so tired.`, [
      ['Stand', F('gasha'), `It comes down like a house. In the silence after, the field is only a field. Where its heart would have been lies what the dead had left to give.`, { loot: 'deep', dread: 2, done: 'bat_banners' }]]);
  ev('bat_bearer', 'battlefield', 'x', 'eerie', 'The Standard Bearer', 'snow',
    `A boy in a dead army's colours sits by the road holding a banner pole with no banner. He asks, politely, whether you are going toward his village. He has asked everyone for two hundred years.`, [
      ['Carry the pole home for him (two extra actions)', null, `You plant it in a village that has forgotten his name, and say the name aloud. The boy bows from the road, and then the road is empty.`, { act: 2, harmony: 2, loot: 'danger' }],
      ['Tell him the war is over', Q('talker'), `He thinks about it for a long time. "Who won?" Nobody, you say. He nods as if that were what he expected, and fades.`, { harmony: 1 }, `He does not believe you. He asks whether you are going toward his village.`, { dread: 1 }]]);

  // ---------------- The road ----------------
  ev('road_umbrella', 'road', 'x', 'funny', 'The Hopping Umbrella', 'pass',
    `An old paper umbrella is hopping down the road on one leg, with one eye and a long tongue, enjoying the rain. It has been an umbrella for a hundred years and a creature for one week, and it is new at being frightening.`, [
      ['Scream obligingly', null, `It is thrilled. It follows you for a mile, practising, and keeps the rain off the whole way.`, { mirth: 1, hp: 2 }],
      ['Open it', Q(), `It lets you. Tucked in the ribs is something its last owner hid from the tax collector.`, { loot: 'road' }, `It closes on your head. You are dry, and briefly blind.`, { mirth: 1, hp: -1 }]]);
  ev('road_bandits', 'road', 'x', 'story', 'Men at the Ford', 'fox',
    `Men step out at the ford with the confidence of people who have never been told no by anyone armed.`, [
      ['Tell them no', F('bandit'), `They learn.`, { coins: 3 }],
      ['Pay them (6 coins)', null, `They count it twice and let you by.`, { coins: -6 }, , , { coins: 6 }],
      ['Recruit them to honest work', Q('talker'), `By the end of your speech two are crying and one has gone home to his mother. They give you their takings to return to the village.`, { coins: 9, harmony: 1 }, `Your speech needs work.`, { fight: 'bandit' }]]);
  ev('road_peddler', 'road', 'x', 'story', 'The Peddler of Charms', 'teahouse',
    `A peddler with a chest of drawers on his back sells charms against everything: fire, foxes, mothers-in-law. Most are paper and hope. One drawer he does not open unless asked twice.`, [
      ['Ask twice (10 coins)', null, `He opens it a finger's width. You choose by feel.`, { coins: -10, loot: 'patience' }, , , { coins: 10 }],
      ['Buy a paper charm (3 coins)', null, `It is against "minor misfortune". You feel slightly better at once, which may be the whole trick.`, { coins: -3, hp: 4 }, , , { coins: 3 }],
      ['Walk on', null, `He tips his hat. The drawers rattle like teeth.`, { free: 1 }]]);
  ev('road_lantern', 'road', 'x', 'eerie', 'The Lantern Opens an Eye', 'battlefield',
    `Your lantern goes out. Then it opens an eye.`, [
      ['Deal with it', F('lantern'), `It only wanted attention. Lanterns are like that.`, { coins: 2 }],
      ['Compliment its glow', Q('talker'), `It relights itself, flattered, and burns brighter than oil can explain for the rest of the journey.`, { harmony: 1, hp: 3 }, `It is not that kind of lantern.`, { fight: 'lantern' }]]);
  ev('road_jizo', 'road', 'x', 'story', 'Six Stone Travellers', 'cave',
    `Six stone Jizo statues stand by the road, and five have straw hats. The sixth has snow on his bare head, though it is snowing nowhere else.`, [
      ['Give him your hat', null, `That night something heavy is set down outside your door, with the sound of stone feet walking away.`, { loot: 'road', harmony: 1 }],
      ['Share out your rice (2 coins)', null, `Six small portions. In the morning the bowls are clean and your pack is heavier.`, { coins: -2, hp: 5, herb: ['ginseng', 1] }, , , { coins: 2 }]]);

  // ---------------- Inside Fuji ----------------
  ev('fuji1', 'fuji', 'floor', 'danger', 'First Hall: The Wind Cave', 'fuji',
    `The mouth of Fuji breathes. Pilgrims' candles line the first hall, all blown flat by a wind from below that smells of cold stone. Where the candles end stands a dead man's armour, grey with ash. It was a guardian once. It still is.`, [
      ['Go down past the guardian', F('ashsamurai'), `The ash falls away from a warrior's bow. Behind him, a stair.`, { loot: 'danger', floor: 1 }],
      ['Climb back to the light', null, `The wind follows you out, patient.`, { free: 1 }]]);
  ev('fuji2', 'fuji', 'floor', 'danger', 'Second Hall: The Ice Cave', 'cave',
    `The second hall is ice in midsummer. In it, frozen like insects in amber, hang the lanterns of every pilgrim who came this far and turned back. One lantern is still lit. It is following you.`, [
      ['Turn and face it', F('wraith'), `It gutters and goes out, and for a moment every lantern in the ice glows, like a thanks.`, { loot: 'danger', dread: 1, floor: 2 }],
      ['Climb back to the light', null, `The lit lantern sees you to the door.`, { free: 1 }]]);
  ev('fuji3', 'fuji', 'floor', 'danger', 'Third Hall: The Womb Cave', 'cave',
    `The passage narrows until you must crawl, as pilgrims have crawled for centuries to be born again on the far side. On the far side waits a woman of grey stone holding a mirror. She is a handmaiden. She is still serving.`, [
      ['Fight your way past', F('handmaiden'), `She cracks, and bows as she falls, as if the bow had been waiting in her all along.`, { loot: 'deep', floor: 3 }],
      ['Ask whom she serves', Q('talker', 1, 1, { lore: 1 }), `"The elder princess," says the stone, in a voice like a millstone. "Who was sent home. Who waits." She steps aside, and gives you the mirror to carry down.`, { floor: 3, harmony: 2, item: 'mirror', flag: 'rumour' }, `She does not answer questions asked that way.`, { fight: 'handmaiden' }],
      ['Climb back to the light', null, `Being born backwards is undignified.`, { free: 1 }]]);
  ev('fuji4', 'fuji', 'floor', 'danger', 'Fourth Hall: The Stair of Ash', 'moon',
    `A stair goes down through warm ash. An oni sits on it, enormous and red, mending a sandal. "Nobody has come this far since I was posted," he says. "I have forgotten whether I am meant to stop you or announce you."`, [
      ['"You are meant to stop us."', F('oni'), `He was very good at it. Not good enough. He seems pleased to have been useful.`, { loot: 'deep', floor: 4, dread: 1 }],
      ['"You are meant to announce us." (harder)', Q('lead', 1, 1, { d: 1 }), `He stands, bangs his club on the stair and roars your names down into the dark. Something far below says: "Let them come."`, { floor: 4, mirth: 1, harmony: 1 }, `"No, I think it was stopping," he says, and picks up the club.`, { fight: 'oni' }],
      ['Climb back to the light', null, `"Come again," he calls. "It is quiet here."`, { free: 1 }]]);

  ev('finale', 'fuji', 'finale', 'finale', 'The Heart of the Mountain', 'fuji',
    `The last chamber is the size of the sky. In it, seated, patient as rock, is a woman of stone as tall as a pagoda, and around her the dark is rising like water. Above, through a thousand fathoms of mountain, you can feel the sun begin to go out. She opens her eyes. "Blossoms," she says. "Even now he would choose blossoms."`, [
      ['Draw steel and brush. Seal her again.', F('iwanaga'), `The shadow tears like wet paper.`, { end: 'fight' }, `The dark closes over you both like a tide.`, { end: 'fight' }],
      ['Speak her true name (typed)', Q('talker', 1, 1, { m: 't', lore: 'name' }), `"Iwanaga." The dark stops rising.`, { end: 'calming' }, `The name catches in your throat. Her eyes harden.`, { finalFight: 1 }, { flag: 'truename' }],
      ['Accept the bargain she is offering', null, `She had been waiting for someone frightened enough to listen.`, { end: 'bargain' }, , , { dread: 4 }],
      ['Strike the drum. Invite her to the festival.', Q('alt', 2, 2), `The Hundred-Year Drum has waited a century for this audience.`, { end: 'festival' }, `The rhythm falters. The dark surges.`, { finalFight: 1 }, { flag: 'drum', mirth: 4 }],
      ['Raise the two treasures', null, `Two Legendary things, held up together, begin to sing.`, { end: 'kami' }, , , { legend: 2 }]]);
  UF.EV.finale.finale = 1;

  UF.INTRO = [
    `The astronomers of Edo agree on one thing: in fourteen days the sun will go dark over Mount Fuji. The priests agree on another: something under the mountain has begun to wake, and it will be fully awake when the light fails.`,
    `Nobody sent for an old ronin and a wandering shrine painter. You are simply the two who are going.`,
    `Seek the kami of forest, shore, marsh, pass and spring for their blessings. Listen for a name. Each day gives you three actions. On the last day, the mountain calls you whether you are ready or not.`];
  UF.ECLIPSE = `Whatever you were doing, you stop. The light has turned the colour of old brass. The mountain is calling, and you find you are already walking.`;

  UF.ENDINGS = {
    sealing: { t: 'The Sealing', img: 'fuji', x: `Blade and brush move as one, and the blessings of forest, tide and stone answer. The shadow folds back into the rock, and the rock into silence. The sun returns over a mountain that will sleep for a thousand years. In the villages they ring bells. Nobody below will ever know there was a princess, or that she wept as the seal closed. You know. You carry it down the mountain between you, like a bowl filled to the brim.` },
    calming: { t: 'The Calming', img: 'ghost', x: `Nobody has spoken her name in a thousand years. The stone face moves like a landslide in reverse. "Say it again," she whispers, and you do, and the painter sets it down in ink on the cave wall where it will stay. The dark drains away. Above, the sun comes out of eclipse onto a mountain with two goddesses, the blossom and the rock, and from that year the cherry trees on Fuji bloom a little longer than anywhere else.` },
    bargain: { t: 'The Bargain', img: 'battlefield', x: `She offers what her sister never could: lives as long as stone. You take her cold hand. The eclipse passes. The world goes on, and so do you, and so do you, through the reigns of emperors, through the falling of every blossom you ever loved. On clear nights two travellers who do not age are seen on the roads around Fuji, walking slowly. They have all the time in the world. It is what they asked for.` },
    festival: { t: 'The Great Festival', img: 'cloudshrine', x: `Long ago the sun goddess hid in a cave, and they lured her out with dancing and laughter. So you laugh. You strike the Hundred-Year Drum in the heart of the mountain, and you dance, badly, the way you danced with the dead in Lantern Town. The stone princess stares. Then, for the first time since the age of the gods, she laughs, and the laugh brings the sun back. She comes down for the festival every year after, in disguise. She is terrible at goldfish scooping.` },
    sleep: { t: 'The Long Sleep', img: 'cave', x: `It is not enough to end it, but it is enough to hold it. The shadow sinks back, unsatisfied, and the mountain breathes smoke for a season. The sun returns thin and pale. She will wake again when the next eclipse comes, in your grandchildren's time or theirs. You walk down through falling ash, alive, together, already arguing about what you would do differently. Somebody will have to. Perhaps you will write it down for them.` },
    kami: { t: 'The Two Who Stayed', img: 'bg', x: `The two treasures blaze in your hands, and the mountain recognises them. The princess looks at you both for a long time. "You could keep watch with me," she says. "It is less lonely with three." The eclipse ends over a Fuji with two new small shrines on its shoulder, one with a sword laid across the step, one with a brush. Travellers who leave an offering at both are said to never lose their way, or each other.` },
  };
})();
