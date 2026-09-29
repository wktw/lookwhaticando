import type {
  CollectibleDef,
  DecorDef,
  PetDef,
  PlantDef,
  PotDef,
  Rarity,
  Source,
  Species,
  TreatDef,
  TreatTag,
  WearableDef,
  WearableSlot,
  DecorSlot,
  PlantSpeciesId,
  PotId,
} from './types';

/*
 * The catkin catalog (DESIGN §7–§8). Flavor text follows the voice rules in DESIGN §12:
 * observed, specific and kind, in the present tense, with no puns, exclamation marks or emoji,
 * and at most 90 characters. Pets carry no pronouns, since every owner decides who their pet is.
 * At least 70% of pets are real coats and breeds; fantasy lives only in colour and pattern.
 * Pet safety matters to this audience: no chocolate (carob instead), cats eat only cat grass
 * and catnip, and there are no lilies anywhere.
 */

const pet = (id: string, species: Species, name: string, defaultName: string, rarity: Rarity, source: Source, flavor: string): PetDef => ({
  id: `pet-${id}`,
  category: 'pet',
  species,
  name,
  defaultName,
  rarity,
  source,
  flavor,
});
const wear = (id: string, slot: WearableSlot, name: string, rarity: Rarity, source: Source, flavor: string): WearableDef => ({
  id: `wear-${id}`,
  category: 'wearable',
  slot,
  name,
  rarity,
  source,
  flavor,
});
const treat = (id: string, tags: TreatTag[], name: string, rarity: Rarity, source: Source, flavor: string): TreatDef => ({
  id: `treat-${id}`,
  category: 'treat',
  tags,
  name,
  rarity,
  source,
  flavor,
});
/** Decor `slot` is only the default drop layer ('sky' hangs, everything else stands); placement is free. */
const decor = (id: string, slot: DecorSlot, name: string, rarity: Rarity, source: Source, flavor: string): DecorDef => ({
  id: `decor-${id}`,
  category: 'decor',
  slot,
  name,
  rarity,
  source,
  flavor,
});
const plant = (plantId: PlantSpeciesId, name: string, rarity: Rarity, source: Source, flavor: string): PlantDef => ({
  id: `plant-${plantId}`,
  category: 'plant',
  plant: plantId,
  name,
  rarity,
  source,
  flavor,
});
const pot = (potId: PotId, name: string, rarity: Rarity, source: Source, flavor: string): PotDef => ({
  id: `pot-${potId}`,
  category: 'pot',
  pot: potId,
  name,
  rarity,
  source,
  flavor,
});

/* ------------------------------------------------------------------------ */
/* Starter, exclusive, harvest                                               */
/* ------------------------------------------------------------------------ */

const STARTER: CollectibleDef[] = [
  plant('pothos', 'Golden Pothos', 'common', 'starter', 'Roots in a glass of water faster than anything. Trails once it is happy.'),
  plant('pilea', 'Chinese Money Plant', 'common', 'starter', 'Round leaves on thin stems, like coins held up to the light.'),
  plant('begonia', 'Polka-dot Begonia', 'common', 'starter', 'Olive leaves with silver spots and a red underside. Flowers pink.'),
  plant('snakeplant', 'Snake Plant', 'common', 'starter', 'Upright striped leaves. Forgives almost anything.'),
  plant('catgrass', 'Cat Grass', 'common', 'starter', 'Soft young oat grass. The cats nibble it, and so do the cows.'),
  pot('terracotta', 'Terracotta Pot', 'common', 'starter', 'Warm clay with a darker rim. Breathes.'),
  pot('cream', 'Cream Glaze Pot', 'common', 'starter', 'A soft cream glaze with a thin unglazed foot.'),
  pot('blush', 'Blush Glaze Pot', 'common', 'starter', 'Glazed the pink of strawberry milk.'),
  treat('strawberry', ['fruity', 'fresh'], 'Strawberry', 'common', 'starter', 'One strawberry, cut in half so it can be shared.'),
  treat('oat-biscuit', ['crunchy', 'savory'], 'Oat Biscuit', 'common', 'starter', 'A small plain biscuit. Everyone likes these.'),
];

const EXCLUSIVE: CollectibleDef[] = [
  decor('window-seat', 'ground-center', 'The Window Seat', 'ultra', 'exclusive', 'A cushioned seat built into the window. A year of showing up.'),
  wear('laurel-sprig', 'head', 'Laurel Sprig', 'ultra', 'exclusive', 'Tucked behind one ear. From your first plant to reach Evergreen.'),
  wear('party-hat', 'head', 'Paper Party Hat', 'rare', 'exclusive', 'Folded from a birthday card. Worn once a year.'),
  decor('birthday-cake', 'ground-center', 'Tiny Cake', 'rare', 'exclusive', 'Three layers and one candle, for your birthday.'),
  decor('reading-chair', 'ground-left', 'Reading Chair', 'ultra', 'exclusive', 'For completing the Cats page of the Field Guide.'),
  decor('pasture-fence', 'ground-right', 'Pasture Fence', 'ultra', 'exclusive', 'For completing the Cows page of the Field Guide.'),
  decor('stepping-stones', 'ground-center', 'Stepping Stones', 'ultra', 'exclusive', 'For completing the Pond Club page of the Field Guide.'),
];

/**
 * Harvest (DESIGN §8.2): a completing check-in on a Blooming-or-later edible plant drops one
 * serving into the basket. Owned from the first harvest; never from a machine.
 */
const HARVEST: CollectibleDef[] = [
  treat('cat-grass', ['fresh'], 'Cat Grass', 'common', 'harvest', 'A pinch of fresh oat grass, from your own pot.'),
  treat('catnip', ['fresh'], 'Catnip', 'common', 'harvest', 'Dried leaves from your catnip plant. Handle with care.'),
  treat('lavender-shortbread', ['sweet', 'crunchy'], 'Lavender Shortbread', 'common', 'harvest', 'Baked with a few flowers from your lavender.'),
];

/* ------------------------------------------------------------------------ */
/* No. 01 Cats                                                               */
/* ------------------------------------------------------------------------ */

const CATS: CollectibleDef[] = [
  pet('cat-orange', 'cat', 'Orange Tabby', 'Pudding', 'common', 'cats', 'Apricot stripes. Loafs in the exact middle of any sunbeam.'),
  pet('cat-grey', 'cat', 'Grey Tabby', 'Earl', 'common', 'cats', 'Silver-grey, with a striped tail always tucked round the feet.'),
  pet('cat-tuxedo', 'cat', 'Tuxedo', 'Pepper', 'common', 'cats', 'Black coat, white bib, white socks. Always dressed for dinner.'),
  pet('cat-calico', 'cat', 'Calico', 'Juniper', 'uncommon', 'cats', 'Cream, apricot and graphite, in no particular order.'),
  pet('cat-black', 'cat', 'Black Cat', 'Olive', 'uncommon', 'cats', 'Plum-black and gold-eyed. Easiest to find by the eyes.'),
  pet('cat-tortie', 'cat', 'Tortoiseshell', 'Maple', 'rare', 'cats', 'Brindled brown and ginger, like toast with marmalade.'),
  pet('cat-siamese', 'cat', 'Siamese', 'Latte', 'rare', 'cats', 'Cream coat, cocoa points, blue eyes. Talks mostly with the tail.'),
  pet('cat-cowcat', 'cat', 'Cow Cat', 'Tofu', 'rare', 'cats', 'White with black patches, like a Holstein that chose to be a cat.'),
  pet('cat-oddeyed', 'cat', 'Odd-eyed White', 'Opal', 'ultra', 'cats', 'One blue eye, one gold. Keeps one on the window and one on you.'),
  pet('cat-mainecoon', 'cat', 'Maine Coon', 'Bramble', 'ultra', 'cats', 'Tufted ears, a ruff, and paws like slippers. Still a kitten, somehow.'),
  wear('bell-collar', 'neck', 'Bell Collar', 'common', 'cats', 'A soft pink collar with a bell the size of a peppercorn.'),
  wear('ribbon-bow', 'head', 'Ribbon Bow', 'common', 'cats', 'A strawberry-milk ribbon, tied just behind one ear.'),
  treat('fish-crackers', ['crunchy', 'savory'], 'Fish Crackers', 'common', 'cats', 'A handful of tiny fish-shaped crackers.'),
  decor('cardboard-box', 'ground-left', 'Cardboard Box', 'common', 'cats', 'A small box. Occupied within the minute.'),
  decor('yarn-ball', 'ground-right', 'Yarn Ball', 'common', 'cats', 'Half unwound, which is how it is meant to be.'),
  wear('knit-sweater', 'body', 'Striped Knit', 'uncommon', 'cats', 'A sock-cuff sweater in cream and blush stripes.'),
  treat('salmon', ['savory', 'fresh'], 'Salmon Flakes', 'uncommon', 'cats', 'A pinch of pink flakes on a saucer.'),
  decor('matchbox-bed', 'ground-left', 'Matchbox Bed', 'uncommon', 'cats', 'A matchbox with folded flannel inside. Exactly one cat wide.'),
  wear('thimble-hat', 'head', 'Thimble Hat', 'rare', 'cats', 'A silver thimble, worn at a slight angle.'),
  decor('spool-scratcher', 'ground-right', 'Spool Scratcher', 'rare', 'cats', 'A cotton reel wrapped in twine. Well used.'),
  decor('window-hammock', 'sky', 'Window Hammock', 'ultra', 'cats', 'A tiny hammock that holds onto the glass. Warm by three.'),
];

/* ------------------------------------------------------------------------ */
/* No. 02 Cows                                                               */
/* ------------------------------------------------------------------------ */

const COWS: CollectibleDef[] = [
  pet('cow-holstein', 'cow', 'Holstein', 'Clover', 'common', 'cows', 'White with black patches shaped like maps. Stands very still in sunbeams.'),
  pet('cow-jersey', 'cow', 'Jersey', 'Butterscotch', 'common', 'cows', 'Fawn coat, dark eyes, a pale ring around the muzzle.'),
  pet('cow-brownswiss', 'cow', 'Brown Swiss', 'Mocha', 'common', 'cows', 'Mouse-brown, with fluffy ears and a very calm way of blinking.'),
  pet('cow-beltie', 'cow', 'Belted Galloway', 'Humbug', 'uncommon', 'cows', 'Black, with a white belt all the way round.'),
  pet('cow-hereford', 'cow', 'Hereford', 'Ginger', 'uncommon', 'cows', 'Russet coat, white face, the patient look of a good neighbour.'),
  pet('cow-dexter', 'cow', 'Dexter', 'Pip', 'rare', 'cows', 'Small and dark, even for a cow this size.'),
  pet('cow-strawberry', 'cow', 'Strawberry Milk Cow', 'Milkshake', 'rare', 'cows', 'A Holstein in strawberry pink. Nobody knows how.'),
  pet('cow-redholstein', 'cow', 'Red Holstein', 'Rosie', 'rare', 'cows', 'Cream and brick-red patches, with a cream tuft on the tail.'),
  pet('cow-blueroan', 'cow', 'Blue Roan', 'Bluebell', 'ultra', 'cows', 'Speckled blue-grey, like a stone washed by rain.'),
  pet('cow-highland', 'cow', 'Highland', 'Tuppence', 'ultra', 'cows', 'Shaggy apricot fringe and wide horns.'),
  wear('cowbell', 'neck', 'Cowbell', 'common', 'cows', 'A small brass bell on a leather strap.'),
  wear('gingham-bandana', 'neck', 'Gingham Bandana', 'common', 'cows', 'Red-and-white gingham, knotted at the side.'),
  treat('strawberry-milk', ['drink', 'sweet'], 'Strawberry Milk', 'common', 'cows', 'Pink milk in a glass bottle with a paper straw.'),
  treat('clover', ['fresh'], 'Fresh Clover', 'common', 'cows', 'A little bunch of clover. One of them has four leaves.'),
  decor('hay-bale', 'ground-right', 'Hay Bale', 'common', 'cows', 'Small, square, and slightly prickly.'),
  wear('straw-hat', 'head', 'Straw Hat', 'uncommon', 'cows', 'A sun hat woven from what looks like a single stalk.'),
  treat('cheese', ['savory'], 'Cheese Wedge', 'uncommon', 'cows', 'A little wedge with a proper rind.'),
  decor('milk-crate', 'ground-left', 'Milk Crate', 'uncommon', 'cows', 'A wooden crate stamped with the name of a dairy.'),
  wear('daisy-chain', 'head', 'Daisy Chain', 'rare', 'cows', 'Six daisies, stems threaded through each other.'),
  decor('milk-can', 'ground-right', 'Milk Can', 'rare', 'cows', 'An enamel milk can with a dent on one side.'),
  wear('wool-rug', 'body', 'Tartan Cow Rug', 'ultra', 'cows', 'A little wool blanket, buckled under the chest.'),
];

/* ------------------------------------------------------------------------ */
/* No. 03 Dogs                                                               */
/* ------------------------------------------------------------------------ */

const DOGS: CollectibleDef[] = [
  pet('dog-corgi', 'dog', 'Corgi', 'Waffles', 'common', 'dogs', 'Low, long, and entirely sure about everything.'),
  pet('dog-dachshund', 'dog', 'Dachshund', 'Frankie', 'common', 'dogs', 'Floppy ears, a long back, and firm opinions about the door.'),
  pet('dog-pom', 'dog', 'Pomeranian', 'Puff', 'common', 'dogs', 'Apricot fluff with a fox face in the middle.'),
  pet('dog-shiba', 'dog', 'Shiba Inu', 'Kinako', 'uncommon', 'dogs', 'Red coat, white cheeks, a curled tail. Pretends not to care.'),
  pet('dog-golden', 'dog', 'Golden Retriever', 'Butter', 'uncommon', 'dogs', 'Gold all over, including the personality.'),
  pet('dog-dalmatian', 'dog', 'Dalmatian', 'Domino', 'rare', 'dogs', 'White with black spots, one of them almost a heart.'),
  pet('dog-frenchie', 'dog', 'French Bulldog', 'Brie', 'rare', 'dogs', 'Bat ears, a small snore, and a very serious expression.'),
  pet('dog-bernese', 'dog', 'Bernese Puppy', 'Otto', 'ultra', 'dogs', 'Tricolour and heavy-pawed. Leans on whoever is nearest.'),
  pet('dog-samoyed', 'dog', 'Samoyed', 'Snowpuff', 'ultra', 'dogs', 'Smiling the way Samoyeds do.'),
  wear('dog-bandana', 'neck', 'Blue Bandana', 'common', 'dogs', 'Faded blue cotton, knotted loosely.'),
  wear('knit-cap', 'head', 'Knit Cap', 'common', 'dogs', 'A tiny beanie with a pom-pom on top.'),
  treat('bone-biscuit', ['crunchy', 'savory'], 'Bone Biscuit', 'common', 'dogs', 'A biscuit shaped like a bone, snapped in half to share.'),
  treat('pb-cookie', ['sweet', 'crunchy'], 'Peanut Butter Cookie', 'common', 'dogs', 'Peanut butter and oats, nothing else. Eaten without hesitation.'),
  decor('tennis-ball', 'ground-center', 'Tennis Ball', 'common', 'dogs', 'Slightly fuzzy, slightly damp.'),
  wear('tag-collar', 'neck', 'Collar with Tag', 'uncommon', 'dogs', 'A leather collar with a small brass tag.'),
  treat('pup-cup', ['sweet', 'drink'], 'Pup Cup', 'uncommon', 'dogs', 'A paper cup with a spoonful of cream in it.'),
  decor('dog-bed', 'ground-left', 'Round Dog Bed', 'uncommon', 'dogs', 'A doughnut-shaped bed with a raised edge for chins.'),
  wear('dog-raincoat', 'body', 'Yellow Raincoat', 'rare', 'dogs', 'Waxed cotton, with a hood that stays up by itself.'),
  decor('enamel-bowl', 'ground-right', 'Enamel Bowl', 'rare', 'dogs', 'White enamel with a blue rim.'),
  wear('duffle-coat', 'body', 'Duffle Coat', 'ultra', 'dogs', 'A tiny camel duffle coat with wooden toggles.'),
];

/* ------------------------------------------------------------------------ */
/* No. 04 Pond                                                               */
/* ------------------------------------------------------------------------ */

const POND: CollectibleDef[] = [
  pet('frog-tree', 'frog', 'Tree Frog', 'Fern', 'common', 'pond', 'Leaf green, with a pale throat that puffs when pleased.'),
  pet('duck-pekin', 'duck', 'Pekin Duckling', 'Dumpling', 'common', 'pond', 'White, round, and walks with great purpose.'),
  pet('duck-yellow', 'duck', 'Yellow Duckling', 'Sunny', 'common', 'pond', 'Fluffy yellow, still growing into those feet.'),
  pet('frog-tomato', 'frog', 'Tomato Frog', 'Poppy', 'uncommon', 'pond', 'Tomato orange and perfectly round.'),
  pet('duck-mallard', 'duck', 'Mallard', 'Jade', 'uncommon', 'pond', 'Green head, brown chest, a blue flash on each wing.'),
  pet('frog-glass', 'frog', 'Glass Frog', 'Clara', 'rare', 'pond', 'Pale green, and a little see-through at the edges.'),
  pet('duck-call', 'duck', 'Call Duck', 'Button', 'rare', 'pond', 'The smallest duck there is. Not the quietest.'),
  pet('frog-mossy', 'frog', 'Mossy Frog', 'Moss', 'ultra', 'pond', 'Textured like a patch of moss, and just as calm.'),
  pet('duck-mandarin', 'duck', 'Mandarin Duck', 'Saffron', 'ultra', 'pond', 'Orange sails and a white eye stripe, in colours that seem invented.'),
  wear('rain-hat', 'head', 'Rain Hat', 'common', 'pond', 'A yellow sou’wester with the brim turned down.'),
  treat('lettuce', ['fresh'], 'Lettuce Leaf', 'common', 'pond', 'Crisp, green, and larger than the duck.'),
  treat('blueberries', ['fruity', 'fresh'], 'Blueberries', 'common', 'pond', 'Three blueberries, rolling slightly.'),
  decor('lily-pad', 'ground-center', 'Lily Pad', 'common', 'pond', 'A single lily pad with room for one.'),
  wear('leaf-umbrella', 'head', 'Leaf Umbrella', 'uncommon', 'pond', 'A fallen leaf, held just so.'),
  decor('watering-can', 'ground-right', 'Tin Watering Can', 'uncommon', 'pond', 'Holds exactly enough for one leaf.'),
  wear('clear-raincoat', 'body', 'Clear Raincoat', 'rare', 'pond', 'A see-through raincoat with a pink trim.'),
  decor('rubber-duck', 'ground-left', 'Rubber Duck', 'rare', 'pond', 'The ducks find it very confusing.'),
  decor('glass-float', 'ground-right', 'Glass Float', 'ultra', 'pond', 'A green glass fishing float in its net. Catches the light.'),
];

/* ------------------------------------------------------------------------ */
/* No. 05 Garden                                                             */
/* ------------------------------------------------------------------------ */

const GARDEN: CollectibleDef[] = [
  pet('bunny-dutch', 'bunny', 'Dutch Rabbit', 'Toffee', 'common', 'garden', 'Brown saddle, white blaze, white collar. Very tidy.'),
  pet('bunny-lionhead', 'bunny', 'Lionhead', 'Dandelion', 'common', 'garden', 'A fluffy mane round a very small face.'),
  pet('bunny-lop', 'bunny', 'Holland Lop', 'Biscuit', 'uncommon', 'garden', 'Ears down, nose busy.'),
  pet('bunny-himalayan', 'bunny', 'Himalayan Rabbit', 'Smudge', 'rare', 'garden', 'White, with ears and nose that look dipped in cocoa.'),
  pet('bunny-angora', 'bunny', 'Angora', 'Cloud', 'ultra', 'garden', 'Mostly fluff. Somewhere in there, a rabbit.'),
  plant('monstera', 'Monstera', 'common', 'garden', 'Starts with plain heart-shaped leaves. The splits come later.'),
  plant('strawberry', 'Strawberry', 'common', 'garden', 'White flowers first, then small red berries you can harvest.'),
  pot('speckled', 'Speckled Stoneware Pot', 'common', 'garden', 'Oatmeal clay flecked with brown, like a good egg.'),
  wear('flower-crown', 'head', 'Flower Crown', 'common', 'garden', 'Forget-me-nots and one small rose.'),
  treat('carrot', ['fresh'], 'Baby Carrot', 'common', 'garden', 'A carrot about the length of a matchstick.'),
  decor('seed-packet', 'ground-left', 'Seed Packet', 'common', 'garden', 'A paper seed packet, torn open at the corner.'),
  plant('lavender', 'Lavender', 'uncommon', 'garden', 'Grey leaves, purple spikes, and a harvest you can bake with.'),
  plant('catnip', 'Catnip', 'uncommon', 'garden', 'Soft grey-green leaves. Cats have strong feelings about it.'),
  pot('ticking', 'Blue Ticking Pot', 'uncommon', 'garden', 'Striped like an old mattress, in blue and cream.'),
  wear('knit-scarf', 'neck', 'Moss-stitch Scarf', 'uncommon', 'garden', 'Sage wool, long enough to wrap twice.'),
  plant('hoya', 'Hoya', 'rare', 'garden', 'Waxy leaves, then clusters of star-shaped flowers.'),
  plant('orchid', 'Moth Orchid', 'rare', 'garden', 'One long stem, and flowers that last for months.'),
  pot('mug', 'Chipped Mug', 'rare', 'garden', 'A favourite mug, retired to a better use.'),
  decor('stacked-pots', 'ground-right', 'Stacked Pots', 'rare', 'garden', 'Three empty terracotta pots, nested and waiting.'),
  plant('calathea', 'Prayer Plant', 'ultra', 'garden', 'Striped leaves that fold upward every evening.'),
  pot('teacup', 'Teacup Pot', 'ultra', 'garden', 'A floral teacup with a drainage hole, and its saucer.'),
];

/* ------------------------------------------------------------------------ */
/* No. 06 Pantry                                                             */
/* ------------------------------------------------------------------------ */

const PANTRY: CollectibleDef[] = [
  pet('hamster-syrian', 'hamster', 'Syrian Hamster', 'Nugget', 'common', 'pantry', 'Golden, round, storing something in each cheek.'),
  pet('hamster-winterwhite', 'hamster', 'Winter White', 'Onigiri', 'common', 'pantry', 'Pale grey with a dark stripe down the back.'),
  pet('bear-brown', 'bear', 'Brown Bear Cub', 'Honey', 'common', 'pantry', 'Heavy-shouldered, soft-eared, small enough for a teacup.'),
  pet('hamster-robo', 'hamster', 'Roborovski', 'Crumb', 'uncommon', 'pantry', 'Tiny, sandy, and faster than seems possible.'),
  pet('bear-panda', 'bear', 'Panda Cub', 'Bao', 'uncommon', 'pantry', 'Black and white, and mostly asleep.'),
  pet('hamster-longhair', 'hamster', 'Long-haired Syrian', 'Teddy', 'rare', 'pantry', 'Long cream fur and a very small face.'),
  pet('bear-sun', 'bear', 'Sun Bear Cub', 'Marigold', 'rare', 'pantry', 'Dark coat, with a golden crescent on the chest.'),
  pet('hamster-sapphire', 'hamster', 'Sapphire Winter White', 'Pebble', 'ultra', 'pantry', 'Soft blue-grey, like a pebble from a cold beach.'),
  pet('bear-spectacled', 'bear', 'Spectacled Bear Cub', 'Quill', 'ultra', 'pantry', 'Cream rings round the eyes, like reading glasses.'),
  treat('oat-cookie', ['sweet', 'crunchy'], 'Oat Cookie', 'common', 'pantry', 'Chewy in the middle.'),
  treat('pudding', ['sweet'], 'Custard Pudding', 'common', 'pantry', 'Wobbles a little when it is set down.'),
  treat('honey', ['sweet'], 'Honey Drop', 'common', 'pantry', 'A single drop on the end of a spoon.'),
  wear('knit-beret', 'head', 'Knit Beret', 'common', 'pantry', 'A soft beret in oatmeal wool.'),
  decor('teacup-bath', 'ground-center', 'Teacup Bath', 'common', 'pantry', 'A teacup of warm water, hamster-sized.'),
  treat('steamed-bun', ['savory'], 'Steamed Bun', 'uncommon', 'pantry', 'Soft and warm, with a little pleat on top.'),
  treat('sunflower-seeds', ['crunchy', 'savory'], 'Sunflower Seeds', 'uncommon', 'pantry', 'Cracked with great care, one at a time.'),
  decor('jam-jar', 'ground-left', 'Jam Jar Lantern', 'uncommon', 'pantry', 'A jam jar with a tea light inside.'),
  pot('tincan', 'Tomato Tin', 'uncommon', 'pantry', 'A tomato tin with holes punched in the base. The label stays on.'),
  wear('linen-apron', 'body', 'Linen Apron', 'rare', 'pantry', 'A tiny linen apron with one pocket.'),
  treat('shortcake', ['sweet', 'fruity'], 'Strawberry Shortcake', 'rare', 'pantry', 'Cream, sponge, and one strawberry on top.'),
  decor('bread-basket', 'ground-right', 'Bread Basket', 'rare', 'pantry', 'A cloth-lined basket with room for a nap.'),
  decor('copper-kettle', 'ground-left', 'Copper Kettle', 'ultra', 'pantry', 'Polished copper with a wooden handle. Whistles very softly.'),
];

/* ------------------------------------------------------------------------ */
/* No. 07 Night (stamps; better odds; Moonlit variants join dynamically)     */
/* ------------------------------------------------------------------------ */

const NIGHT: CollectibleDef[] = [
  pet('cat-smoke', 'cat', 'Smoke Cat', 'Nimbus', 'common', 'night', 'Grey that goes silver at the tips, like smoke.'),
  pet('bear-black', 'bear', 'Black Bear Cub', 'Hazel', 'common', 'night', 'Black coat, cinnamon muzzle, early to bed.'),
  wear('nightcap', 'head', 'Nightcap', 'common', 'night', 'A long knitted nightcap with a bobble on the end.'),
  wear('sleep-mask', 'face', 'Sleep Mask', 'common', 'night', 'Lavender silk, for naps in bright rooms.'),
  treat('barley-tea', ['drink'], 'Barley Tea', 'common', 'night', 'Roasted barley tea, caffeine-free, in a very small cup.'),
  pet('bunny-silverfox', 'bunny', 'Silver Fox Rabbit', 'Silvia', 'uncommon', 'night', 'Black fur tipped with silver, like frost on a hedge.'),
  wear('starry-pajamas', 'body', 'Starry Pajamas', 'uncommon', 'night', 'Navy flannel with small yellow stars.'),
  treat('honey-toast', ['sweet', 'crunchy'], 'Honey Toast', 'uncommon', 'night', 'Toast with a thin layer of honey, cut into fingers.'),
  decor('hot-water-bottle', 'ground-center', 'Hot Water Bottle', 'uncommon', 'night', 'In a knitted cover. Still warm.'),
  pet('cat-russianblue', 'cat', 'Russian Blue', 'Mist', 'rare', 'night', 'Blue-grey plush and green eyes. Prefers the lamp side.'),
  pet('hamster-black', 'hamster', 'Black Hamster', 'Soot', 'rare', 'night', 'Black all over, with a white-tipped nose.'),
  wear('crescent-pin', 'head', 'Crescent Pin', 'rare', 'night', 'A tiny brass crescent, pinned behind one ear.'),
  decor('reading-lamp', 'ground-right', 'Reading Lamp', 'rare', 'night', 'A green-shaded lamp. Makes a small warm room anywhere.'),
  pot('midnight', 'Midnight Glaze Pot', 'rare', 'night', 'Deep blue glaze with flecks of gold.'),
  pet('cow-nightsky', 'cow', 'Night-sky Cow', 'Vega', 'ultra', 'night', 'The patches are the night sky, stars and all.'),
  wear('heather-shawl', 'body', 'Heather Shawl', 'ultra', 'night', 'Heather-grey wool, pinned at the chest.'),
  decor('moon-nightlight', 'sky', 'Moon Night-light', 'ultra', 'night', 'A paper moon that glows the colour of honey.'),
];

/* ------------------------------------------------------------------------ */
/* Seasonal editions (fixed calendar dates, returning every year)            */
/* ------------------------------------------------------------------------ */

const AUTUMN: CollectibleDef[] = [
  pet('bunny-cinnamon', 'bunny', 'Cinnamon Rabbit', 'Nutmeg', 'common', 'autumn', 'Rust-brown, like cinnamon on toast.'),
  pet('dog-beagle', 'dog', 'Beagle Puppy', 'Conker', 'common', 'autumn', 'Tan and white, with ears built for listening.'),
  wear('leaf-scarf', 'neck', 'Leaf Scarf', 'common', 'autumn', 'Knitted in rust and mustard.'),
  wear('witch-hat', 'head', 'Paper Witch Hat', 'common', 'autumn', 'Folded from black card for one night a year.'),
  treat('baked-apple', ['fruity', 'sweet'], 'Baked Apple', 'common', 'autumn', 'Soft all the way through, and still warm.'),
  treat('pumpkin', ['sweet'], 'Pumpkin Purée', 'common', 'autumn', 'A spoonful of plain pumpkin. Received with enthusiasm.'),
  decor('mini-pumpkin', 'ground-left', 'Mini Pumpkin', 'common', 'autumn', 'The smallest pumpkin at the market.'),
  pet('duck-cayuga', 'duck', 'Cayuga Duck', 'Rook', 'uncommon', 'autumn', 'Black feathers with a green sheen, like a beetle wing.'),
  wear('pumpkin-cardigan', 'body', 'Pumpkin Cardigan', 'uncommon', 'autumn', 'Oversized, the colour of squash soup.'),
  pot('gourd', 'Gourd Pot', 'uncommon', 'autumn', 'A small dried gourd, hollowed out and planted.'),
  decor('leaf-pile', 'ground-right', 'Leaf Pile', 'uncommon', 'autumn', 'Swept up, then immediately jumped in.'),
  pet('cat-scottishfold', 'cat', 'Scottish Fold', 'Acorn', 'rare', 'autumn', 'Folded ears and a round owl face. Sits up like a person.'),
  treat('chestnut', ['sweet'], 'Roasted Chestnut', 'rare', 'autumn', 'One chestnut, roasted and peeled, still warm.'),
  decor('jack-lantern', 'ground-center', 'Jack-o’-lantern', 'rare', 'autumn', 'A small carved pumpkin with a tea light inside.'),
  pet('cat-norwegian', 'cat', 'Norwegian Forest Cat', 'Rowan', 'ultra', 'autumn', 'A thick coat, tufted ears, and a tail like a feather duster.'),
  pet('cow-spice', 'cow', 'Pumpkin Spice Cow', 'Clove', 'ultra', 'autumn', 'Cream, with patches the colour of a pumpkin latte.'),
];

const WINTER: CollectibleDef[] = [
  pet('bear-polar', 'bear', 'Polar Bear Cub', 'Snowdrop', 'common', 'winter', 'White, sturdy, and very fond of cold floors.'),
  pet('bunny-snowshoe', 'bunny', 'Snowshoe Hare', 'Flurry', 'common', 'winter', 'White for winter, with big feet for the snow.'),
  wear('pompom-hat', 'head', 'Red Pompom Hat', 'common', 'winter', 'Red wool with a white pom-pom, for December.'),
  wear('winter-scarf', 'neck', 'Knit Scarf', 'common', 'winter', 'Cream wool, wrapped twice and tied.'),
  treat('warm-oats', ['sweet'], 'Warm Oats', 'common', 'winter', 'A spoonful of porridge with a little honey.'),
  treat('gingerbread', ['sweet', 'crunchy'], 'Gingerbread', 'common', 'winter', 'A small gingerbread star with white icing.'),
  decor('snowman', 'ground-right', 'Snowman', 'common', 'winter', 'Three snowballs and a twig. Built on the balcony.'),
  pet('cat-snowshoe', 'cat', 'Snowshoe Cat', 'Frost', 'uncommon', 'winter', 'Siamese points with white mittens on every paw.'),
  wear('earmuffs', 'head', 'Earmuffs', 'uncommon', 'winter', 'Two small pompoms on a band. Fits every kind of ear.'),
  plant('xmascactus', 'Christmas Cactus', 'uncommon', 'winter', 'Flat jointed stems, and pink flowers right on time.'),
  decor('odd-mitten', 'ground-left', 'Odd Mitten', 'uncommon', 'winter', 'One mitten, pair unknown. Now a sleeping bag.'),
  pet('hamster-pearl', 'hamster', 'Winter White in Winter', 'Pearl', 'rare', 'winter', 'A Winter White in the winter coat, gone white for the season.'),
  wear('fairisle-sweater', 'body', 'Fair Isle Sweater', 'rare', 'winter', 'Snowflakes knitted in two colours.'),
  decor('paper-star', 'sky', 'Paper Star', 'rare', 'winter', 'A folded paper star with a light inside.'),
  pet('dog-husky', 'dog', 'Husky Puppy', 'Juno', 'ultra', 'winter', 'Blue eyes, a grey mask, and a coat made for snow.'),
  pet('duck-eider', 'duck', 'Eider Duckling', 'Downy', 'ultra', 'winter', 'Soft grey down, the reason duvets exist.'),
];

const VALENTINE: CollectibleDef[] = [
  pet('cat-heartspot', 'cat', 'Heart-spot Cat', 'Valentina', 'common', 'valentine', 'White, with one grey patch shaped almost exactly like a heart.'),
  pet('dog-cavalier', 'dog', 'Cavalier King Charles', 'Romeo', 'common', 'valentine', 'Silky ears, soft eyes, a lap dog in every sense.'),
  wear('rose-clip', 'head', 'Rose Clip', 'common', 'valentine', 'A small pink rose on a hair clip.'),
  treat('heart-cookie', ['sweet', 'crunchy'], 'Heart Cookie', 'common', 'valentine', 'Iced pink, slightly lopsided.'),
  treat('carob-heart', ['sweet'], 'Carob Heart', 'common', 'valentine', 'The colour of chocolate, but pet-safe. Heart-shaped.'),
  decor('love-letter', 'ground-left', 'Love Letter', 'common', 'valentine', 'A folded note, sealed with a paper heart.'),
  decor('bud-vase', 'ground-right', 'Bud Vase', 'common', 'valentine', 'One stem in a small glass bottle.'),
  pet('bunny-minirex', 'bunny', 'Mini Rex', 'Velvet', 'uncommon', 'valentine', 'Short, velvety fur the colour of cocoa.'),
  wear('heart-knit', 'body', 'Heart Knit', 'uncommon', 'valentine', 'Cream wool with one red heart on the front.'),
  plant('violet', 'African Violet', 'uncommon', 'valentine', 'Furry leaves and small purple flowers, most of the year.'),
  pot('rosy', 'Rose Glaze Pot', 'uncommon', 'valentine', 'A deep rose glaze with a scalloped rim.'),
  pet('cat-ragdoll', 'cat', 'Ragdoll', 'Cherub', 'rare', 'valentine', 'Goes completely floppy when picked up. Blue eyes.'),
  wear('heart-locket', 'neck', 'Heart Locket', 'rare', 'valentine', 'A tiny locket with nothing inside yet.'),
  decor('tiny-bouquet', 'ground-center', 'Tiny Bouquet', 'rare', 'valentine', 'Five sweet peas tied with thread.'),
  pet('frog-strawberry', 'frog', 'Strawberry Frog', 'Berry', 'ultra', 'valentine', 'Red, with blue legs, like a pair of jeans.'),
  pet('cat-birman', 'cat', 'Lilac Birman', 'Amour', 'ultra', 'valentine', 'Lilac-grey points, white mittens, sapphire eyes.'),
];

const SPRING: CollectibleDef[] = [
  pet('duck-runner', 'duck', 'Runner Duck', 'Skittle', 'common', 'spring', 'Stands upright like a bowling pin and runs everywhere.'),
  pet('bunny-netherland', 'bunny', 'Netherland Dwarf', 'Bean', 'common', 'spring', 'The smallest rabbit, with the shortest ears.'),
  wear('blossom-clip', 'head', 'Blossom Clip', 'common', 'spring', 'A sprig of cherry blossom on a clip.'),
  treat('radish', ['fresh'], 'Radish', 'common', 'spring', 'Pink outside, white inside, crunchy all through.'),
  treat('pea-pod', ['fresh'], 'Pea Pod', 'common', 'spring', 'Split open, with four peas in a row.'),
  plant('tulip', 'Tulip', 'common', 'spring', 'A bulb in a forcing glass. Roots first, then a single cup.'),
  decor('paper-umbrella', 'ground-right', 'Paper Umbrella', 'common', 'spring', 'Oiled paper on bamboo spokes. Keeps off one raindrop.'),
  pet('frog-peeper', 'frog', 'Spring Peeper', 'Peep', 'uncommon', 'spring', 'A tiny frog with an X on the back. Loud, for the size.'),
  wear('petal-collar', 'neck', 'Petal Collar', 'uncommon', 'spring', 'A ruff of felt petals in blush and cream.'),
  pot('eggshell', 'Eggshell Pot', 'uncommon', 'spring', 'Half an eggshell in an egg cup. For small beginnings.'),
  decor('robin-nest', 'ground-left', 'Robin’s Nest', 'uncommon', 'spring', 'Three blue eggs, left well alone.'),
  pet('bunny-harlequin', 'bunny', 'Harlequin Rabbit', 'Patches', 'rare', 'spring', 'Orange on one side, black on the other, divided down the middle.'),
  wear('blossom-crown', 'head', 'Blossom Crown', 'rare', 'spring', 'A ring of cherry blossom, fresh this morning.'),
  decor('seed-tray', 'ground-center', 'Seed Tray', 'rare', 'spring', 'Twelve cells, eleven sprouted.'),
  pet('frog-blue', 'frog', 'Blue Frog', 'Indigo', 'ultra', 'spring', 'Bright blue and entirely real. Lives in one small patch of forest.'),
  pet('duck-crested', 'duck', 'Crested Duck', 'Pom', 'ultra', 'spring', 'White, with a pom-pom of feathers on top of the head.'),
];

const SUMMER: CollectibleDef[] = [
  pet('cat-turkishvan', 'cat', 'Turkish Van', 'Sandy', 'common', 'summer', 'White with an auburn head and tail. Likes water, oddly.'),
  pet('dog-labrador', 'dog', 'Labrador Puppy', 'Bramley', 'common', 'summer', 'Sandy yellow, and fond of any water at all.'),
  wear('sun-hat', 'head', 'Sun Hat', 'common', 'summer', 'A wide brim with a pink ribbon.'),
  wear('striped-tee', 'body', 'Striped Tee', 'common', 'summer', 'Navy and white stripes, like a small sailor.'),
  treat('watermelon', ['fruity', 'fresh'], 'Watermelon', 'common', 'summer', 'A wedge with the seeds taken out.'),
  treat('frozen-yoghurt', ['sweet'], 'Frozen Yoghurt', 'common', 'summer', 'A little frozen yoghurt on a tiny stick.'),
  decor('sandcastle', 'ground-left', 'Sandcastle', 'common', 'summer', 'One tower and a moat. Made with a thimble.'),
  pet('frog-redeyed', 'frog', 'Red-eyed Tree Frog', 'Mango', 'uncommon', 'summer', 'Green body, orange feet, red eyes. Mostly sleeps by day.'),
  wear('flower-lei', 'neck', 'Flower Lei', 'uncommon', 'summer', 'Paper flowers on a thread, in every pastel.'),
  plant('sunflower', 'Sunflower', 'uncommon', 'summer', 'A dwarf sunflower. Turns its face toward the window.'),
  decor('beach-umbrella', 'ground-right', 'Beach Umbrella', 'uncommon', 'summer', 'Striped, and just big enough for a nap.'),
  pet('cat-abyssinian', 'cat', 'Abyssinian', 'Sable', 'rare', 'summer', 'A ticked golden coat, like warm sand.'),
  wear('heart-shades', 'face', 'Heart Sunglasses', 'rare', 'summer', 'Pink plastic, for the brightest part of the sill.'),
  decor('seashell', 'ground-center', 'Seashell', 'rare', 'summer', 'A scallop shell, used as a very small bath.'),
  pet('cat-sphynx', 'cat', 'Sphynx', 'Peach', 'ultra', 'summer', 'Hardly any fur, which explains all the sunbathing.'),
  pet('frog-golden', 'frog', 'Golden Frog', 'Aurum', 'ultra', 'summer', 'Golden yellow with dark spots. Found in one valley in Panama.'),
];

/* ------------------------------------------------------------------------ */

/** Each series has exactly one Secret (a "?" on its lineup until pulled). */
export const SECRET_IDS: ReadonlySet<string> = new Set([
  'pet-cat-mainecoon',
  'pet-cow-highland',
  'pet-dog-samoyed',
  'pet-duck-mandarin',
  'pet-bunny-angora',
  'pet-bear-spectacled',
  'pet-cow-nightsky',
  'pet-cow-spice',
  'pet-duck-eider',
  'pet-cat-birman',
  'pet-duck-crested',
  'pet-frog-golden',
]);

export const COLLECTIBLES: readonly CollectibleDef[] = [
  ...STARTER,
  ...EXCLUSIVE,
  ...HARVEST,
  ...CATS,
  ...COWS,
  ...DOGS,
  ...POND,
  ...GARDEN,
  ...PANTRY,
  ...NIGHT,
  ...AUTUMN,
  ...WINTER,
  ...VALENTINE,
  ...SPRING,
  ...SUMMER,
];

export const COLLECTIBLE_BY_ID: ReadonlyMap<string, CollectibleDef> = new Map(COLLECTIBLES.map((c) => [c.id, c]));

export const MOONLIT_PREFIX = 'moonlit:';

/** 'moonlit:pet-cat-calico' → 'pet-cat-calico' (or null if not a moonlit id). */
export function moonlitBase(id: string): string | null {
  return id.startsWith(MOONLIT_PREFIX) ? id.slice(MOONLIT_PREFIX.length) : null;
}

/**
 * Resolves any collectible id, including the code-drawn Moonlit pet variants
 * ('moonlit:<petId>', rare, in the No. 07 Night pool; DESIGN §7.1).
 */
export function getCollectible(id: string): CollectibleDef | undefined {
  const direct = COLLECTIBLE_BY_ID.get(id);
  if (direct) return direct;
  const base = moonlitBase(id);
  const def = base ? COLLECTIBLE_BY_ID.get(base) : undefined;
  if (!def || def.category !== 'pet') return undefined;
  return {
    ...def,
    id,
    name: `Moonlit ${def.name}`,
    rarity: 'rare',
    source: 'night',
    flavor: `${def.defaultName}, in night colours. Visits after the lamp is on.`,
  };
}

export const PETS = COLLECTIBLES.filter((c): c is PetDef => c.category === 'pet');
export const WEARABLES = COLLECTIBLES.filter((c): c is WearableDef => c.category === 'wearable');
export const TREATS = COLLECTIBLES.filter((c): c is TreatDef => c.category === 'treat');
export const DECOR = COLLECTIBLES.filter((c): c is DecorDef => c.category === 'decor');
export const PLANTS = COLLECTIBLES.filter((c): c is PlantDef => c.category === 'plant');
export const POTS = COLLECTIBLES.filter((c): c is PotDef => c.category === 'pot');

/** Items every save owns from the start. */
export const STARTER_IDS: readonly string[] = STARTER.map((c) => c.id);

/** The Showing-up ladder's 365-day reward, the first-Evergreen reward, and the birthday items. */
export const WINDOW_SEAT_ID = 'decor-window-seat';
export const LAUREL_SPRIG_ID = 'wear-laurel-sprig';
export const PARTY_HAT_ID = 'wear-party-hat';
export const BIRTHDAY_CAKE_ID = 'decor-birthday-cake';

/**
 * Which harvest each EDIBLE plant yields once Blooming (DESIGN §8.2). Ornamental houseplants
 * yield nothing: pothos, monstera and the rest are not for eating.
 */
export const HARVEST_BY_PLANT: Readonly<Partial<Record<PlantSpeciesId, string>>> = {
  catgrass: 'treat-cat-grass',
  catnip: 'treat-catnip',
  strawberry: 'treat-strawberry',
  lavender: 'treat-lavender-shortbread',
};

/** Decor that pets play with (Playful and Curious pets wander over to it). */
export const TOY_IDS: ReadonlySet<string> = new Set([
  'decor-cardboard-box',
  'decor-yarn-ball',
  'decor-tennis-ball',
  'decor-rubber-duck',
  'decor-leaf-pile',
  'decor-odd-mitten',
  'decor-spool-scratcher',
]);

/** Field Guide pages (one per species; frogs and ducks share the Pond Club), with completion rewards (DESIGN §8.5). */
export const ALBUMS = [
  { id: 'cats', name: 'Cats', species: ['cat'], reward: 'decor-reading-chair' },
  { id: 'cows', name: 'Cows', species: ['cow'], reward: 'decor-pasture-fence' },
  { id: 'dogs', name: 'Dogs', species: ['dog'], reward: null },
  { id: 'bunnies', name: 'Rabbits', species: ['bunny'], reward: null },
  { id: 'pond', name: 'Pond Club', species: ['frog', 'duck'], reward: 'decor-stepping-stones' },
  { id: 'bears', name: 'Bears', species: ['bear'], reward: null },
  { id: 'hamsters', name: 'Hamsters', species: ['hamster'], reward: null },
] as const;

export function itemsInMachine(machine: string): CollectibleDef[] {
  return COLLECTIBLES.filter((c) => c.source === machine);
}
