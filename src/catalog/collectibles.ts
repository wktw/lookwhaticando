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

/* Tiny constructors keep the table below readable. */
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
/* Starter & exclusive                                                       */
/* ------------------------------------------------------------------------ */

const STARTER: CollectibleDef[] = [
  pet('mochi', 'cat', 'Mochi', 'Mochi', 'rare', 'starter', 'Part kitty, part cow, part garden. All heart.'),
  plant('tulip', 'Tulip', 'common', 'starter', 'The classic. Opens a little more every time you show up.'),
  plant('daisy', 'Daisy', 'common', 'starter', 'Cheerful, sturdy, and not at all dramatic about it.'),
  plant('sunflower', 'Sunflower', 'common', 'starter', 'Always turning toward the bright side.'),
  plant('succulent', 'Succulent', 'common', 'starter', 'Low-maintenance. Still loves attention.'),
  plant('monstera', 'Monstera', 'common', 'starter', 'Each new leaf gets a few more windows.'),
  pot('terracotta', 'Terracotta Pot', 'common', 'starter', 'Warm, earthy, dependable.'),
  pot('cream', 'Cream Pot', 'common', 'starter', 'Soft as a latte foam.'),
  pot('blush', 'Blush Pot', 'common', 'starter', 'A little rosy, like it just got a compliment.'),
  treat('strawberry', ['fruity', 'fresh'], 'Strawberry', 'common', 'starter', 'Picked at peak cuteness.'),
  treat('biscuit', ['crunchy', 'savory'], 'Paw Biscuit', 'common', 'starter', 'Shaped like a paw. Tastes like a hug.'),
];

const EXCLUSIVE: CollectibleDef[] = [
  wear('blossom-sprout', 'head', 'Blossom Sprout', 'ultra', 'exclusive', "A whole year of showing up. Mochi's sprout grew into a tiny tree."),
  wear('evergreen-crown', 'head', 'Evergreen Crown', 'ultra', 'exclusive', 'Woven by your first Evergreen plant. Never wilts.'),
  wear('party-hat', 'head', 'Party Hat', 'rare', 'exclusive', 'For birthdays. Yours, specifically.'),
  decor('birthday-cake', 'ground-center', 'Birthday Cake', 'rare', 'exclusive', 'Three tiers, one candle, lots of love.'),
  decor('cat-cafe', 'back-left', 'Cat Café', 'ultra', 'exclusive', 'Awarded for completing the Cat Café album. Espresso not included.'),
  decor('cowprint-fence', 'back-right', 'Cow-Print Fence', 'ultra', 'exclusive', 'Awarded for gathering the whole herd.'),
  decor('lily-pond', 'ground-center', 'Lily Pond', 'ultra', 'exclusive', 'Awarded to the Pond Club. Ribbit and quack.'),
];

/**
 * Harvest treats (DESIGN §13.10): a check-in on a Blooming-or-later plant drops a serving of
 * its harvest into the meadow basket. Owned once first harvested; never from machines.
 */
const GARDEN: CollectibleDef[] = [
  treat('petal-tea', ['drink', 'fresh'], 'Petal Tea', 'common', 'garden', 'Brewed from your own blooms. Floral, warm, calming.'),
  treat('sunflower-seeds', ['crunchy', 'savory'], 'Sunflower Seeds', 'common', 'garden', 'A hamster favorite. Crack, crunch, joy.'),
  treat('lemonade', ['drink', 'fruity'], 'Pink Lemonade', 'common', 'garden', 'Squeezed from your lemon tree. Tart and sunny.'),
  treat('lavender-cookie', ['sweet', 'crunchy'], 'Lavender Cookie', 'common', 'garden', 'Buttery, floral, and a little fancy.'),
  treat('garden-greens', ['fresh'], 'Garden Greens', 'common', 'garden', 'Crisp leaves, picked this morning.'),
  treat('toasted-mushroom', ['savory'], 'Toasted Mushroom', 'common', 'garden', 'Foraged, toasted, adorable.'),
];

/* ------------------------------------------------------------------------ */
/* Kitty Capsule                                                             */
/* ------------------------------------------------------------------------ */

const KITTY: CollectibleDef[] = [
  pet('cat-orange', 'cat', 'Orange Tabby', 'Marmalade', 'common', 'kitty', 'Professional sunbeam tester. Takes the job very seriously.'),
  pet('cat-grey', 'cat', 'Grey Kitty', 'Earl Grey', 'common', 'kitty', 'Steeped in calm. Best served with a nap.'),
  pet('cat-tuxedo', 'cat', 'Tuxedo Cat', 'Sir Pounce', 'uncommon', 'kitty', 'Always dressed for the occasion. The occasion is dinner.'),
  pet('cat-cream', 'cat', 'Cream Puff', 'Custard', 'common', 'kitty', 'Mostly fluff. The rest is purr.'),
  pet('cat-calico', 'cat', 'Calico', 'Patches', 'rare', 'kitty', 'Three colors, zero chill, all love.'),
  pet('cat-black', 'cat', 'Black Cat', 'Pepper', 'uncommon', 'kitty', 'Brings good luck to anyone who pets her.'),
  pet('cat-siamese', 'cat', 'Siamese', 'Mochaccino', 'rare', 'kitty', 'Has opinions. Will share them. Loudly.'),
  pet('cat-strawberry', 'cat', 'Strawberry Cat', 'Berry', 'ultra', 'kitty', 'Grew in a strawberry patch. Smells faintly of jam.'),
  pet('cat-lucky', 'cat', 'Lucky Cat', 'Fortune', 'ultra', 'kitty', 'Waves hello to good things. They usually wave back.'),
  wear('pink-bow', 'head', 'Pink Bow', 'common', 'kitty', 'Instantly 30% more adorable. Science.'),
  wear('bell-collar', 'neck', 'Bell Collar', 'common', 'kitty', 'Jingles softly so friends know you are near.'),
  wear('paw-bandana', 'neck', 'Paw Bandana', 'common', 'kitty', 'Covered in tiny paw prints. Very official.'),
  wear('fish-hat', 'head', 'Fish Hat', 'rare', 'kitty', 'A hat that is also a fish. Cats find this delicious.'),
  wear('reading-glasses', 'face', 'Reading Glasses', 'uncommon', 'kitty', 'For reading. Or looking like you were reading.'),
  wear('cozy-stripes', 'body', 'Cozy Stripes Sweater', 'rare', 'kitty', 'Knit with extra snuggle.'),
  treat('fish-crackers', ['crunchy', 'savory'], 'Fishy Crackers', 'common', 'kitty', 'Tiny fish, big crunch.'),
  treat('salmon-sushi', ['savory', 'fresh'], 'Salmon Sushi', 'uncommon', 'kitty', 'Rolled with love (and rice).'),
  decor('cardboard-box', 'ground-left', 'Cardboard Box', 'common', 'kitty', 'The finest real estate in any meadow.'),
  decor('yarn-basket', 'ground-right', 'Yarn Basket', 'uncommon', 'kitty', 'Pastel skeins, mostly un-tangled.'),
  decor('cat-tree', 'back-right', 'Cat Tree', 'ultra', 'kitty', 'Three levels of lounging luxury.'),
  pot('kitty', 'Kitty Pot', 'rare', 'kitty', 'Has little ears. Your plant looks thrilled.'),
];

/* ------------------------------------------------------------------------ */
/* Moo Moo Milk Bar                                                          */
/* ------------------------------------------------------------------------ */

const MOO: CollectibleDef[] = [
  pet('cow-holstein', 'cow', 'Classic Moo', 'Oreo', 'common', 'moo', 'Black and white and sweet all over.'),
  pet('cow-brown', 'cow', 'Chocolate Milk Cow', 'Cocoa', 'common', 'moo', 'Says "moo" in a voice like hot chocolate.'),
  pet('cow-blueberry', 'cow', 'Blueberry Milk Cow', 'Bluebell', 'common', 'moo', 'Somehow always smells like muffins.'),
  pet('cow-strawberry', 'cow', 'Strawberry Milk Cow', 'Milkshake', 'rare', 'moo', 'Pink, polite, and extremely huggable.'),
  pet('cow-banana', 'cow', 'Banana Milk Cow', 'Nana', 'uncommon', 'moo', 'Sunny disposition. Pairs well with mornings.'),
  pet('cow-matcha', 'cow', 'Matcha Latte Cow', 'Matcha', 'uncommon', 'moo', 'Calm, grounded, gently caffeinated.'),
  pet('cow-highland', 'cow', 'Highland Cow', 'Clementine', 'ultra', 'moo', 'Cannot see through her bangs. Does not mind.'),
  pet('cow-sprinkle', 'cow', 'Sprinkle Cow', 'Confetti', 'ultra', 'moo', 'Her spots are rainbow sprinkles. Every day is a party.'),
  wear('cowbell', 'neck', 'Cowbell', 'common', 'moo', 'More cowbell. Always more cowbell.'),
  wear('gingham-bandana', 'neck', 'Gingham Bandana', 'common', 'moo', 'Picnic-ready at all times.'),
  wear('milk-mustache', 'face', 'Milk Mustache', 'common', 'moo', 'Proof of a delicious decision.'),
  wear('cowgirl-hat', 'head', 'Pink Cowgirl Hat', 'rare', 'moo', 'Yeehaw, but make it pastel.'),
  wear('overalls', 'body', 'Denim Overalls', 'uncommon', 'moo', 'Farm chic. Pockets for snacks.'),
  wear('milk-carton', 'head', 'Milk Carton Hat', 'rare', 'moo', 'Best before: never.'),
  treat('strawberry-milk', ['drink', 'sweet'], 'Strawberry Milk', 'common', 'moo', 'Pink milk is objectively the best milk.'),
  treat('clover', ['fresh', 'savory'], 'Fresh Clover', 'common', 'moo', 'Might be lucky. Definitely tasty.'),
  treat('cheese', ['savory'], 'Cheese Wedge', 'uncommon', 'moo', 'Aged to perfection (about a week).'),
  decor('hay-bale', 'ground-right', 'Hay Bale', 'uncommon', 'moo', 'Scratchy, cozy, perfect for sitting.'),
  decor('picnic-blanket', 'ground-center', 'Picnic Blanket', 'rare', 'moo', 'Gingham, a basket, and nowhere to be.'),
  decor('little-barn', 'back-left', 'Little Barn', 'ultra', 'moo', 'A red barn with room for everyone.'),
  pot('cowprint', 'Cow Print Pot', 'rare', 'moo', 'Spotted and proud.'),
];

/* ------------------------------------------------------------------------ */
/* Puppy Park                                                                */
/* ------------------------------------------------------------------------ */

const PUPPY: CollectibleDef[] = [
  pet('dog-corgi', 'dog', 'Corgi', 'Waffles', 'common', 'puppy', 'Mostly loaf. A little bit fox. Zero regrets.'),
  pet('dog-pom', 'dog', 'Pomeranian', 'Puff', 'common', 'puppy', 'A dandelion that learned to bark.'),
  pet('dog-dachshund', 'dog', 'Dachshund', 'Frankie', 'common', 'puppy', 'Floppy ears, big heart, bigger opinions about squirrels.'),
  pet('dog-shiba', 'dog', 'Shiba Inu', 'Kinako', 'uncommon', 'puppy', 'Much cute. Very good. Wow.'),
  pet('dog-golden', 'dog', 'Golden Pup', 'Butter', 'uncommon', 'puppy', 'Believes every single person is their best friend.'),
  pet('dog-dalmatian', 'dog', 'Dalmatian', 'Domino', 'rare', 'puppy', 'Counted her spots once. Got distracted by a ball.'),
  pet('dog-frenchie', 'dog', 'Frenchie', 'Brie', 'rare', 'puppy', 'Bat ears, snorty laugh, impeccable taste.'),
  pet('dog-samoyed', 'dog', 'Samoyed', 'Snowpuff', 'ultra', 'puppy', 'Smiles so hard her eyes disappear.'),
  pet('dog-cottoncandy', 'dog', 'Cotton Candy Pom', 'Floss', 'ultra', 'puppy', 'Spun from pink and blue sugar. Barks in sparkles.'),
  wear('bow-tie', 'neck', 'Bow Tie', 'common', 'puppy', 'For very good boys, girls, and friends.'),
  wear('pom-beanie', 'head', 'Pom Beanie', 'common', 'puppy', 'Knit, cozy, crowned with a pom-pom.'),
  wear('star-shades', 'face', 'Star Sunglasses', 'uncommon', 'puppy', 'Instant celebrity. Paparazzi not included.'),
  wear('cozy-hoodie', 'body', 'Cozy Hoodie', 'uncommon', 'puppy', 'Oversized, soft, with a tiny front pocket.'),
  wear('tiny-backpack', 'body', 'Tiny Backpack', 'rare', 'puppy', 'Packed with snacks and big plans.'),
  treat('bone-biscuit', ['crunchy', 'savory'], 'Bone Biscuit', 'common', 'puppy', 'The classic. Crunchy and wholesome.'),
  treat('pb-cookie', ['sweet', 'crunchy'], 'Peanut Butter Cookie', 'common', 'puppy', 'Nutty, chewy, completely irresistible.'),
  treat('pup-cup', ['sweet', 'drink'], 'Pup Cup', 'uncommon', 'puppy', 'A little cup of whipped cream. Pure bliss.'),
  decor('tennis-balls', 'ground-center', 'Tennis Balls', 'common', 'puppy', 'Three fuzzy balls, slightly slobbery.'),
  decor('dog-house', 'back-left', 'Dog House', 'rare', 'puppy', 'A cozy house with a name above the door.'),
];

/* ------------------------------------------------------------------------ */
/* Sakura Garden                                                             */
/* ------------------------------------------------------------------------ */

const SAKURA: CollectibleDef[] = [
  pet('bunny-white', 'bunny', 'Snow Bunny', 'Marshmallow', 'common', 'sakura', 'Soft enough to use as a cloud.'),
  pet('bunny-brown', 'bunny', 'Cocoa Bunny', 'Toffee', 'common', 'sakura', 'Hops first, thinks later.'),
  pet('frog-green', 'frog', 'Pond Frog', 'Lily', 'common', 'sakura', 'Ribbits in a major key.'),
  pet('bunny-lop', 'bunny', 'Lop Bunny', 'Biscuit', 'uncommon', 'sakura', 'Ears too heavy to stand up. Heart too full, probably.'),
  pet('frog-mushroom', 'frog', 'Mushroom Frog', 'Morel', 'rare', 'sakura', 'Found a tiny mushroom and decided it was a hat.'),
  pet('cat-sakura', 'cat', 'Sakura Cat', 'Hanami', 'rare', 'sakura', 'Blooms once a year. Purrs all year round.'),
  pet('bunny-sakura', 'bunny', 'Sakura Bunny', 'Blossom', 'ultra', 'sakura', 'Leaves a trail of petals wherever she hops.'),
  pet('frog-prince', 'frog', 'Frog Prince', 'Prince Ribbit', 'ultra', 'sakura', 'No kiss required. Already charming.'),
  wear('daisy-crown', 'head', 'Daisy Crown', 'common', 'sakura', 'Handmade, a little lopsided, perfect.'),
  wear('sakura-clip', 'head', 'Sakura Clip', 'common', 'sakura', 'A single blossom, worn just so.'),
  wear('garden-apron', 'body', 'Garden Apron', 'uncommon', 'sakura', 'Pockets full of seeds and good intentions.'),
  plant('cactus', 'Cactus', 'common', 'sakura', 'Prickly outside, blooms inside.'),
  plant('strawberry', 'Strawberry Plant', 'uncommon', 'sakura', 'Grows real (pretend) strawberries.'),
  plant('lavender', 'Lavender', 'uncommon', 'sakura', 'Smells like a deep breath.'),
  plant('lily', 'Lily of the Valley', 'uncommon', 'sakura', 'Tiny bells that ring very, very quietly.'),
  plant('sakura', 'Sakura Bonsai', 'rare', 'sakura', 'A whole spring, small enough to hold.'),
  pot('sage', 'Sage Glaze Pot', 'common', 'sakura', 'Glazed the color of new leaves.'),
  pot('frog', 'Frog Pot', 'rare', 'sakura', 'Your plant now lives in a frog. Lucky plant.'),
  decor('tulip-bed', 'ground-left', 'Tulip Bed', 'common', 'sakura', 'A tidy row of pastel tulips.'),
  decor('cherry-tree', 'back-right', 'Cherry Blossom Tree', 'ultra', 'sakura', 'Petals drift down all day.'),
];

/* ------------------------------------------------------------------------ */
/* Sweet Treats                                                              */
/* ------------------------------------------------------------------------ */

const SWEETS: CollectibleDef[] = [
  pet('hamster-golden', 'hamster', 'Golden Hamster', 'Nugget', 'common', 'sweets', 'Cheeks: full. Heart: fuller.'),
  pet('hamster-white', 'hamster', 'Snowball Hamster', 'Onigiri', 'common', 'sweets', 'Round, white, and legally a rice ball.'),
  pet('bear-brown', 'bear', 'Honey Bear', 'Honey', 'common', 'sweets', 'Sticky paws, sweet soul.'),
  pet('hamster-choco', 'hamster', 'Choco Hamster', 'Brownie', 'uncommon', 'sweets', 'Half chocolate, half vanilla, fully snack-sized.'),
  pet('bear-strawberry', 'bear', 'Strawberry Bear', 'Jam', 'rare', 'sweets', 'Spreads joy. Also spreads jam.'),
  pet('bear-panda', 'bear', 'Panda', 'Dumpling', 'ultra', 'sweets', 'Black, white, and bamboo-scented.'),
  pet('hamster-daifuku', 'hamster', 'Daifuku Hamster', 'Mochi Jr.', 'ultra', 'sweets', 'Squishy on the outside, sweet bean on the inside.'),
  pet('bear-cupcake', 'bear', 'Cupcake Bear', 'Frosting', 'ultra', 'sweets', 'Wears a frosting swirl. Refuses to share it.'),
  wear('bakers-hat', 'head', "Baker's Hat", 'common', 'sweets', 'Puffy, white, and full of recipes.'),
  wear('cherry-clips', 'head', 'Cherry Clips', 'common', 'sweets', 'Two cherries, one very cute hairdo.'),
  wear('strawberry-hat', 'head', 'Strawberry Hat', 'uncommon', 'sweets', 'You are now a strawberry. Congratulations.'),
  wear('frilly-apron', 'body', 'Frilly Apron', 'rare', 'sweets', 'Ruffles make everything taste better.'),
  treat('cookie', ['sweet', 'crunchy'], 'Choc Chip Cookie', 'common', 'sweets', 'Warm from the oven, chips still melty.'),
  treat('pudding', ['sweet'], 'Custard Pudding', 'common', 'sweets', 'Wiggles when you look at it.'),
  treat('donut', ['sweet'], 'Sprinkle Donut', 'common', 'sweets', 'A circle of pure happiness.'),
  treat('boba', ['drink', 'sweet'], 'Brown Sugar Boba', 'uncommon', 'sweets', 'Chewy pearls at the bottom. The best part.'),
  treat('daifuku', ['sweet', 'fruity'], 'Strawberry Daifuku', 'uncommon', 'sweets', 'A strawberry wrapped in a soft mochi blanket.'),
  treat('macarons', ['sweet', 'crunchy'], 'Macarons', 'uncommon', 'sweets', 'Pastel, delicate, gone in one bite.'),
  treat('shortcake', ['sweet', 'fruity'], 'Strawberry Shortcake', 'rare', 'sweets', 'Fluffy layers, fresh berries, celebration-grade.'),
  decor('tea-party', 'ground-center', 'Tea Party Table', 'rare', 'sweets', 'Tiny cups, tiny cakes, big conversations.'),
];

/* ------------------------------------------------------------------------ */
/* Dreamy Night (premium: stars)                                             */
/* ------------------------------------------------------------------------ */

const DREAMY: CollectibleDef[] = [
  pet('cat-cloud', 'cat', 'Cloud Kitty', 'Nimbus', 'common', 'dreamy', 'Floats a tiny bit when happy.'),
  pet('bear-sleepy', 'bear', 'Sleepy Bear', 'Snooze', 'common', 'dreamy', 'Five more minutes. Every time.'),
  pet('cow-moon', 'cow', 'Moon Cow', 'Luna', 'rare', 'dreamy', 'Jumped over the moon once. Brought back a spot.'),
  pet('bunny-star', 'bunny', 'Stargazer Bunny', 'Comet', 'rare', 'dreamy', 'Makes a wish on every star, just in case.'),
  pet('cat-starry', 'cat', 'Starry Night Cat', 'Stella', 'ultra', 'dreamy', 'Has a whole galaxy in her fur.'),
  pet('cow-celestial', 'cow', 'Celestial Cow', 'Aurora', 'ultra', 'dreamy', 'Her spots are constellations. Moos in starlight.'),
  wear('nightcap', 'head', 'Sleepy Nightcap', 'common', 'dreamy', 'Comes with a pom-pom and a yawn.'),
  wear('sleep-mask', 'face', 'Sleep Mask', 'common', 'dreamy', 'Do not disturb: dreaming.'),
  wear('cloud-scarf', 'neck', 'Cloud Scarf', 'uncommon', 'dreamy', 'Knit from actual cloud. Probably.'),
  wear('crescent-clip', 'head', 'Crescent Clip', 'uncommon', 'dreamy', 'A sliver of moon, borrowed for the night.'),
  wear('starry-pajamas', 'body', 'Starry Pajamas', 'rare', 'dreamy', 'Covered in stars. Guaranteed sweet dreams.'),
  wear('halo', 'head', 'Little Halo', 'rare', 'dreamy', 'For the very, very good.'),
  treat('honey-milk', ['drink', 'sweet'], 'Warm Honey Milk', 'common', 'dreamy', 'Makes everyone a little sleepy.'),
  treat('konpeito', ['sweet', 'crunchy'], 'Star Candy', 'uncommon', 'dreamy', 'Tiny sugar stars that crunch like wishes.'),
  decor('moon-lamp', 'ground-right', 'Moon Lamp', 'uncommon', 'dreamy', 'A soft glow for night owls.'),
  decor('fairy-lights', 'sky', 'Fairy Lights', 'ultra', 'dreamy', 'Strung across the sky like little fireflies.'),
  pot('starlight', 'Starlight Pot', 'rare', 'dreamy', 'Speckled with tiny golden stars.'),
];

/* ------------------------------------------------------------------------ */
/* Seasonal machines (return every year)                                     */
/* ------------------------------------------------------------------------ */

const PUMPKIN: CollectibleDef[] = [
  pet('cow-pumpkin', 'cow', 'Pumpkin Spice Cow', 'Nutmeg', 'common', 'pumpkin', 'Basic? Maybe. Delicious? Definitely.'),
  pet('hamster-acorn', 'hamster', 'Acorn Hamster', 'Hazel', 'common', 'pumpkin', 'Hoarding acorns for a very cozy winter.'),
  pet('cat-witchy', 'cat', 'Witchy Cat', 'Salem', 'uncommon', 'pumpkin', 'Brews excellent tea. Hexes nobody.'),
  pet('bunny-boo', 'bunny', 'Boo Bunny', 'Boo', 'rare', 'pumpkin', 'Wearing a sheet. Fooling no one. Adorable.'),
  pet('cat-jack', 'cat', "Jack-o'-Kitty", 'Pumpkin', 'ultra', 'pumpkin', 'Moved into a pumpkin. Refuses to leave.'),
  pet('cow-ghost', 'cow', 'Boo-vine', 'Casper', 'ultra', 'pumpkin', 'A friendly ghost cow. Says "moooOOOoo".'),
  wear('witch-hat', 'head', 'Witch Hat', 'common', 'pumpkin', 'Pointy, purple, practically magic.'),
  wear('autumn-scarf', 'neck', 'Autumn Scarf', 'common', 'pumpkin', 'The color of falling leaves.'),
  wear('maple-crown', 'head', 'Maple Leaf Crown', 'uncommon', 'pumpkin', 'Autumn royalty.'),
  wear('pumpkin-cardigan', 'body', 'Pumpkin Cardigan', 'rare', 'pumpkin', 'Oversized, as is tradition.'),
  treat('candy-corn', ['sweet'], 'Candy Corn', 'common', 'pumpkin', 'Controversial. Beloved here.'),
  treat('pumpkin-pie', ['sweet'], 'Pumpkin Pie', 'common', 'pumpkin', 'With a swirl of whipped cream on top.'),
  treat('caramel-apple', ['fruity', 'sweet'], 'Caramel Apple', 'uncommon', 'pumpkin', 'Crunchy, gooey, festive.'),
  decor('pumpkin-pile', 'ground-left', 'Pumpkin Pile', 'common', 'pumpkin', 'Three pumpkins, perfectly imperfect.'),
  decor('jack-lantern', 'ground-right', "Jack-o'-Lantern", 'rare', 'pumpkin', 'Smiling a crooked, candlelit smile.'),
  pot('pumpkin', 'Pumpkin Pot', 'uncommon', 'pumpkin', 'Your plant, now in seasonal attire.'),
];

const SNOW: CollectibleDef[] = [
  pet('bear-polar', 'bear', 'Polar Bear', 'Snowdrop', 'common', 'snow', 'Loves snow, hot cocoa, and you.'),
  pet('bunny-snow', 'bunny', 'Snowdrift Bunny', 'Flurry', 'common', 'snow', 'Camouflaged in snow. Found by her giggles.'),
  pet('cat-jingle', 'cat', 'Jingle Cat', 'Holly', 'uncommon', 'snow', 'Wrapped herself in ribbon. Is the present.'),
  pet('cow-reindeer', 'cow', 'Reindeer Cow', 'Rudy', 'rare', 'snow', 'Has antlers. Is not a reindeer. Do not tell her.'),
  pet('hamster-gingerbread', 'hamster', 'Gingerbread Hamster', 'Ginger', 'ultra', 'snow', 'Iced with care. Smells like cinnamon.'),
  pet('cow-candycane', 'cow', 'Candy Cane Cow', 'Peppermint', 'ultra', 'snow', 'Striped, sweet, and extremely festive.'),
  wear('santa-hat', 'head', 'Santa Hat', 'common', 'snow', 'Fluffy pom-pom included.'),
  wear('knit-scarf', 'neck', 'Knit Scarf', 'common', 'snow', 'Wrapped twice, tied with love.'),
  wear('earmuffs', 'head', 'Earmuffs', 'uncommon', 'snow', 'Keeps ears toasty. Every kind of ear.'),
  wear('festive-sweater', 'body', 'Festive Sweater', 'rare', 'snow', 'Knit with snowflakes. Ugly? Never.'),
  treat('hot-cocoa', ['drink', 'sweet'], 'Hot Cocoa', 'common', 'snow', 'Extra marshmallows, as requested.'),
  treat('gingerbread', ['sweet', 'crunchy'], 'Gingerbread Cookie', 'common', 'snow', 'Smiling back at you.'),
  treat('candy-cane', ['sweet', 'crunchy'], 'Candy Cane', 'uncommon', 'snow', 'Peppermint swirl. Snap!'),
  decor('snowman', 'ground-left', 'Snowman', 'common', 'snow', 'Carrot nose, button eyes, warm heart.'),
  decor('twinkly-tree', 'back-right', 'Twinkly Tree', 'rare', 'snow', 'Every light is a little wish.'),
  pot('snowy', 'Snowy Pot', 'uncommon', 'snow', 'Dusted with snow that never melts.'),
];

const LOVE: CollectibleDef[] = [
  pet('cat-heart', 'cat', 'Sweetheart Cat', 'Valentina', 'common', 'love', 'Has a heart-shaped spot right on her back.'),
  pet('bear-hug', 'bear', 'Hug Bear', 'Cuddles', 'common', 'love', 'Specializes in long, squishy hugs.'),
  pet('cow-lovebug', 'cow', 'Lovebug Cow', 'Smooch', 'uncommon', 'love', 'Her spots are all little hearts.'),
  pet('frog-kissy', 'frog', 'Kissy Frog', 'Romeo', 'rare', 'love', 'Puckered up and ready. Just in case.'),
  pet('bunny-rose', 'bunny', 'Rose Bunny', 'Rosie', 'ultra', 'love', 'Soft as a petal. Blushes constantly.'),
  pet('cat-cupid', 'cat', 'Cupid Kitty', 'Amour', 'ultra', 'love', 'Tiny wings, perfect aim.'),
  wear('heart-headband', 'head', 'Heart Headband', 'common', 'love', 'Two little hearts on springs. Boing.'),
  wear('heart-glasses', 'face', 'Heart Glasses', 'uncommon', 'love', 'Everything looks lovelier through these.'),
  wear('heart-locket', 'neck', 'Heart Locket', 'uncommon', 'love', 'A tiny picture of someone special inside.'),
  wear('rose-crown', 'head', 'Rose Crown', 'rare', 'love', 'A crown of pink roses. Swoon.'),
  treat('heart-cookies', ['sweet', 'crunchy'], 'Heart Cookies', 'common', 'love', 'Iced in pink with extra love.'),
  treat('chocolates', ['sweet'], 'Box of Chocolates', 'common', 'love', 'You never know what you are gonna get.'),
  treat('choco-strawberry', ['fruity', 'sweet'], 'Chocolate Strawberry', 'uncommon', 'love', 'Dipped, drizzled, divine.'),
  decor('heart-balloons', 'sky', 'Heart Balloons', 'common', 'love', 'Bobbing happily in the breeze.'),
  decor('love-mailbox', 'ground-right', 'Love Mailbox', 'rare', 'love', 'Full of little notes that say "you did great".'),
  pot('heart', 'Heart Pot', 'common', 'love', 'Grow something with love.'),
];

const RAINY: CollectibleDef[] = [
  pet('duck-yellow', 'duck', 'Puddle Duck', 'Sunny', 'common', 'rainy', 'Jumps in every puddle. Every single one.'),
  pet('duck-white', 'duck', 'Dumpling Duck', 'Dumpling', 'common', 'rainy', 'Round, white, and waddles with purpose.'),
  pet('frog-lilypad', 'frog', 'Lily Pad Frog', 'Pad', 'common', 'rainy', 'Wears a lily pad umbrella. Stays mostly dry.'),
  pet('duck-mallard', 'duck', 'Mallard', 'Jade', 'uncommon', 'rainy', 'Shimmery green head, very dapper.'),
  pet('cat-drizzle', 'cat', 'Drizzle Cat', 'Misty', 'rare', 'rainy', 'Likes watching rain from a cozy window.'),
  pet('frog-sunshower', 'frog', 'Sunshower Frog', 'Rainbow', 'ultra', 'rainy', 'Appears when it rains and shines at once.'),
  pet('duck-rainbow', 'duck', 'Rainbow Duck', 'Prism', 'ultra', 'rainy', 'Waddled through a rainbow. Kept the colors.'),
  wear('raincoat', 'body', 'Yellow Raincoat', 'common', 'rainy', 'Splash-proof and sunshine-colored.'),
  wear('bucket-hat', 'head', 'Bucket Hat', 'common', 'rainy', 'Soft, floppy, and very in right now.'),
  wear('frog-hat', 'head', 'Frog Bucket Hat', 'rare', 'rainy', 'A hat with eyes. It is watching. Lovingly.'),
  wear('leaf-umbrella', 'head', 'Leaf Umbrella', 'uncommon', 'rainy', 'Nature provides.'),
  treat('lettuce', ['fresh'], 'Crunchy Lettuce', 'common', 'rainy', 'Fresh from the garden, dewdrops included.'),
  treat('blueberries', ['fruity', 'fresh'], 'Blueberries', 'common', 'rainy', 'Tiny, round, bursting.'),
  decor('puddle', 'ground-center', 'Lily Pad Puddle', 'common', 'rainy', 'Perfect for splashing.'),
  decor('rainbow', 'sky', 'Rainbow', 'uncommon', 'rainy', 'The reward for every rainy day.'),
  decor('mushroom-house', 'back-left', 'Mushroom House', 'rare', 'rainy', 'A cozy cottage with a spotted roof.'),
  plant('mushroom', 'Mushroom Patch', 'uncommon', 'rainy', 'Pops up overnight after a good rain.'),
];

const BEACH: CollectibleDef[] = [
  pet('cat-sandy', 'cat', 'Sandy Cat', 'Sandy', 'common', 'beach', 'Built a sandcastle. Sat in it.'),
  pet('hamster-sunny', 'hamster', 'Sunny Hamster', 'Sunny Side', 'common', 'beach', 'Sun-kissed cheeks, ice-cream dreams.'),
  pet('frog-tropical', 'frog', 'Tropical Frog', 'Mango', 'uncommon', 'beach', 'Bright, cheerful, vacation-mode always.'),
  pet('cow-melon', 'cow', 'Watermelon Cow', 'Melon', 'rare', 'beach', 'Sweet, refreshing, and a little seedy.'),
  pet('duck-sailor', 'duck', 'Sailor Duck', 'Captain', 'ultra', 'beach', 'Ahoy! Navigates by snack.'),
  pet('cat-mermaid', 'cat', 'Mermaid Kitty', 'Marina', 'ultra', 'beach', 'Half kitty, half fish. Fully fabulous.'),
  wear('sun-hat', 'head', 'Sun Hat', 'common', 'beach', 'Wide brim, pink ribbon, beach ready.'),
  wear('flower-lei', 'neck', 'Flower Lei', 'common', 'beach', 'Aloha from the meadow.'),
  wear('heart-shades', 'face', 'Heart Shades', 'uncommon', 'beach', 'Sunny days, lovely views.'),
  wear('duck-float', 'body', 'Duck Floatie', 'rare', 'beach', 'Safety first, cuteness always.'),
  treat('watermelon', ['fruity', 'fresh'], 'Watermelon Slice', 'common', 'beach', 'Juicy. Drippy. Perfect.'),
  treat('ice-cream', ['sweet'], 'Ice Cream Cone', 'common', 'beach', 'Eat it before it melts!'),
  treat('shave-ice', ['sweet', 'fruity'], 'Shave Ice', 'uncommon', 'beach', 'Rainbow syrup on a snowy mountain.'),
  decor('beach-umbrella', 'ground-right', 'Beach Umbrella', 'common', 'beach', 'Striped shade for sunny naps.'),
  decor('sandcastle', 'ground-left', 'Sandcastle', 'uncommon', 'beach', 'Towers, a moat, and a tiny flag.'),
  plant('lemon', 'Lemon Tree', 'rare', 'beach', 'When life gives you lemons, grow more lemons.'),
];

/* ------------------------------------------------------------------------ */

/** Each series has exactly one Secret (shown as a '?' on its lineup card until pulled). */
export const SECRET_IDS: ReadonlySet<string> = new Set([
  'pet-cat-lucky',
  'pet-cow-sprinkle',
  'pet-dog-cottoncandy',
  'pet-frog-prince',
  'pet-bear-cupcake',
  'pet-cow-celestial',
  'pet-cow-ghost',
  'pet-cow-candycane',
  'pet-cat-cupid',
  'pet-duck-rainbow',
  'pet-cat-mermaid',
]);

export const COLLECTIBLES: readonly CollectibleDef[] = [
  ...STARTER,
  ...EXCLUSIVE,
  ...GARDEN,
  ...KITTY,
  ...MOO,
  ...PUPPY,
  ...SAKURA,
  ...SWEETS,
  ...DREAMY,
  ...PUMPKIN,
  ...SNOW,
  ...LOVE,
  ...RAINY,
  ...BEACH,
];

export const COLLECTIBLE_BY_ID: ReadonlyMap<string, CollectibleDef> = new Map(COLLECTIBLES.map((c) => [c.id, c]));

export const MOONLIT_PREFIX = 'moonlit:';

/** 'moonlit:pet-cat-calico' → 'pet-cat-calico' (or null if not a moonlit id). */
export function moonlitBase(id: string): string | null {
  return id.startsWith(MOONLIT_PREFIX) ? id.slice(MOONLIT_PREFIX.length) : null;
}

/**
 * Resolves any collectible id, including code-drawn Moonlit pet variants
 * ('moonlit:<petId>', rare, Dreamy Night pool; DESIGN §13.6).
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
    source: 'dreamy',
    flavor: `${def.defaultName}, dressed in starlight. Only visits after dark.`,
  };
}

export const PETS = COLLECTIBLES.filter((c): c is PetDef => c.category === 'pet');
export const WEARABLES = COLLECTIBLES.filter((c): c is WearableDef => c.category === 'wearable');
export const TREATS = COLLECTIBLES.filter((c): c is TreatDef => c.category === 'treat');
export const DECOR = COLLECTIBLES.filter((c): c is DecorDef => c.category === 'decor');
export const PLANTS = COLLECTIBLES.filter((c): c is PlantDef => c.category === 'plant');
export const POTS = COLLECTIBLES.filter((c): c is PotDef => c.category === 'pot');

/** Which harvest treat each plant species yields once Blooming (DESIGN §13.10). */
export const HARVEST_BY_PLANT: Readonly<Record<string, string>> = {
  tulip: 'treat-petal-tea',
  daisy: 'treat-petal-tea',
  lily: 'treat-petal-tea',
  sakura: 'treat-petal-tea',
  sunflower: 'treat-sunflower-seeds',
  strawberry: 'treat-strawberry',
  lemon: 'treat-lemonade',
  lavender: 'treat-lavender-cookie',
  succulent: 'treat-garden-greens',
  monstera: 'treat-garden-greens',
  cactus: 'treat-garden-greens',
  mushroom: 'treat-toasted-mushroom',
};

/** Decor pets can play with (Playful/Curious pets wander over; DESIGN §13.10). */
export const TOY_IDS: ReadonlySet<string> = new Set([
  'decor-cardboard-box',
  'decor-yarn-basket',
  'decor-tennis-balls',
  'decor-puddle',
  'decor-sandcastle',
  'decor-hay-bale',
]);

/** Species albums in the collection book, with their completion reward (DESIGN §13.7). */
export const ALBUMS = [
  { id: 'cats', name: 'Cat Café', species: ['cat'], reward: 'decor-cat-cafe' },
  { id: 'cows', name: 'The Whole Herd', species: ['cow'], reward: 'decor-cowprint-fence' },
  { id: 'dogs', name: 'Puppy Pack', species: ['dog'], reward: null },
  { id: 'bunnies', name: 'Bunny Burrow', species: ['bunny'], reward: null },
  { id: 'pond', name: 'Pond Club', species: ['frog', 'duck'], reward: 'decor-lily-pond' },
  { id: 'bears', name: 'Teddy Den', species: ['bear'], reward: null },
  { id: 'hamsters', name: 'Hamster Hideout', species: ['hamster'], reward: null },
] as const;

/** Items every save owns from the start. */
export const STARTER_IDS: readonly string[] = STARTER.map((c) => c.id);

/** The mascot, given during onboarding. */
export const MOCHI_ID = 'pet-mochi';
export const BLOSSOM_SPROUT_ID = 'wear-blossom-sprout';
export const PARTY_HAT_ID = 'wear-party-hat';
export const BIRTHDAY_CAKE_ID = 'decor-birthday-cake';
export const EVERGREEN_CROWN_ID = 'wear-evergreen-crown';

export function itemsInMachine(machine: string): CollectibleDef[] {
  return COLLECTIBLES.filter((c) => c.source === machine);
}
