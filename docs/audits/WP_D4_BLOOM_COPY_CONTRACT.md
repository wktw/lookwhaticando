# Blooming copy anchors independently reviewed

Paths below are under `src/art/plants/species/`; line numbers at `f43b5ac`. These were checked in drawing code, not inferred from the copy deck. Most art has no semantic subpart marker, so a render regression can pin a distinctive primitive/path (as the strawberry reproduction does) or a documented new semantic marker, as appropriate.

| Species | Supported observation at stage 5 | Drawing evidence |
|---|---|---|
| pothos | trailing vines | `pothos.tsx:57` vine past the foot; `:109–123` blooms lengthen two hanging vines |
| pilea | crown of round leaves; small pups | `pilea.tsx:32–43` leaf crown; `:45–65` pups; `:77–95` mature crown and bloom-driven pup rendering |
| begonia | pink flowers | `begonia.tsx:56–80` open cluster is pink petal ellipses; `:126–136` stage-5 clusters open |
| snakeplant | spike of cream flowers | `snakeplant.tsx:94–137` tubular flower clusters on stalk; `:150–154` spike opens at stage 5 |
| catgrass | thick, tall grass | `catgrass.tsx:81–92` dense BLADES clump grows taller/wider and sends up oat heads |
| monstera | split leaf | `monstera.tsx:35` split-leaf path, `:110` births >=4.6 select split; `:128–134` extra split leaves at Blooming |
| strawberry | **white flowers only; no first berries yet** | `strawberry.tsx:79–86` white flower path; `:154` fruit=0 throughout stage5, fruit starts at6; `:170–171` berry-vs-flower rendering. Both existing `BLOOM_EVENTS` and `BLOOM_LINES` berry claims are false. Independent render test fails with this wording. |
| lavender | purple spikes | `lavender.tsx:15` purple FLOWER palette; `:54–70` whorled spike; `:92–101` open spikes from stage5 |
| catnip | flowers at tips | `catnip.tsx:90–110` terminal flowerSpike; `:144–155` draws open white flowers and lilac spots at tips |
| hoya | flower cluster | `hoya.tsx:33` umbel of star flowers; `:137–139` opens umbrella clusters from bloom count |
| orchid | first flower on stem | `orchid.tsx:60` moth flower; `:87–103` arch stem and flower slots; `:168–172` stage>=5 opens flowers |
| calathea | new striped leaf | `calathea.tsx:67–79` leaf births at4.8 and5.5; `:83–94` new calatheaLeaf with striped drawing. White flowers also appear at stage5 (`:103–123`), but the leaf observation is valid |
| violet | purple flowers | `violet.tsx:15` purple PETALS; `:54–62` two upper/three lower petals; `:124–138` stage5 open heads |
| tulip | single cup | `tulip.tsx:91–106` cup bloom; `:134–136` one flower open at stage5; daughter bud only later |
| xmascactus | pink flowers at tips | `xmascactus.tsx:15` pink PETALS; `:74–87` flared petals; `:119–130` tip flowers open from bloom count |
| sunflower | one flower | `sunflower.tsx:136–142` single main open head at5; `:145–151` later side head remains a closed bud |

Each supported claim should be pinned independently of the other species. A mutation replacing lavender's `BLOOM_EVENTS` with `opened a blue umbrella` passes the current catalogue suite; `/workspace/d4-c6-bloom-mutant.log`.

Resolution: WP-D4 now checks all sixteen event lines against these art anchors. Strawberry's
Blooming line is “{Plant} has white flowers.” and its event is “flowered”. A real `PlantArt`
regression verifies stage 5 has no berry primitive at either end of its progress range, while
stage 6 does. The wording is recorded as pending owner approval in VOICE and the running ledger.
