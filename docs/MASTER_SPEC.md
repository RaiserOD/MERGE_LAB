# MERGE LAB — 20-LEVEL CAMPAIGN CANON

Document: MASTER_SPEC.md
Section: 20-Level Campaign, Progression and Narrative
Status: CANON
Version: 1.0
Purpose: Authoritative implementation contract for the first 20 player levels.

---

## 0. CANON RULE

This document defines the canonical progression of MERGE LAB from Player Level 1 through Player Level 20.

The level number is the player's meta-progression level. It is NOT a Phaser Scene and MUST NOT be implemented as 20 separate game scenes.

Each level is a data-defined progression milestone containing:
- XP threshold;
- chapter/stage;
- unlocks;
- orders;
- quests;
- lab restoration;
- narrative beat;
- required player action;
- rewards;
- next-level condition.

The AI MUST NOT invent additional progression mechanics while implementing these levels.

The game remains one persistent simulation. Phaser presentation may use scenes for loading, gameplay, UI and dialogue; Phaser documentation explicitly supports multiple logical scenes and simultaneous UI overlays. The domain remains independent from Phaser.

---

# 1. DESIGN GOALS

The 20-level campaign must achieve five things:

1. Teach the complete core loop gradually.
2. Expand content without repeatedly introducing unrelated systems.
3. Make every level produce a visible laboratory change.
4. Advance the mystery through gameplay discoveries.
5. End Level 20 with a strong cliffhanger and a clear continuation path.

Progression formula:

LEVEL
→ new content
→ new gameplay target
→ orders
→ lab restoration
→ story clue
→ next level

---

# 2. PROGRESSION MODEL

Player progression uses XP.

Canonical runtime state:

```ts
interface PlayerProgression {
  level: number;
  xp: number;
}
```

Level thresholds are content data.

```ts
interface PlayerLevelDefinition {
  level: number;
  xpRequiredTotal: number;

  chapterId: string;
  labStage: number;

  unlocks: string[];

  requiredActions: ProgressionRequirement[];

  orderPoolId: string;
  questPoolId: string;

  narrativeBeatId: string;

  rewards: RewardDefinition[];

  nextLevelHint?: string;
}
```

The domain MUST NOT hard-code level-specific item IDs, order IDs, dialogue IDs or reward values.

---

# 3. LEVEL COMPLETION RULE

A player level is complete when all mandatory conditions in its content definition are satisfied.

Canonical pattern:

```text
LEVEL ACTIVE
    ↓
PLAYER COMPLETES REQUIRED ACTIONS
    ↓
LEVEL COMPLETION VALIDATION
    ↓
GRANT LEVEL REWARDS
    ↓
ADVANCE PLAYER LEVEL
    ↓
UNLOCK LEVEL CONTENT
    ↓
EMIT LEVEL_COMPLETED
    ↓
EMIT CONTENT_UNLOCKED where applicable
    ↓
SAVE
```

Level completion MUST be atomic.

If any required condition is missing:
- no level completion;
- no level reward;
- no level advance.

---

# 4. PROGRESSION REQUIREMENT TYPES

```ts
type ProgressionRequirement =
  | {
      type: "MERGE_COUNT";
      value: number;
    }
  | {
      type: "DISCOVER_ITEM";
      itemId: string;
    }
  | {
      type: "COMPLETE_ORDER";
      orderId: string;
    }
  | {
      type: "COMPLETE_ORDERS";
      value: number;
    }
  | {
      type: "UPGRADE_LAB";
      labStage: number;
    }
  | {
      type: "UNLOCK_RESEARCH";
      researchNodeId: string;
    }
  | {
      type: "USE_GENERATOR";
      generatorId: string;
      value: number;
    }
  | {
      type: "EARN_COINS";
      value: number;
    }
  | {
      type: "DISCOVERIES_COUNT";
      value: number;
    }
  | {
      type: "COMPLETE_QUEST";
      questId: string;
    };
```

A requirement is satisfied by domain state/events, not by UI state.

---

# 5. XP SOURCES

XP can come from:
- merges;
- first discoveries;
- completed orders;
- completed quests;
- explicit level rewards.

All XP values are content-defined.

No system may create XP outside the configured reward pipeline.

---

# 6. LEVEL PACING

The 20 levels are divided into five campaign acts:

```text
ACT I   — THE BASEMENT       Levels 1–4
ACT II  — CHEMISTRY          Levels 5–8
ACT III — BIOLOGY            Levels 9–12
ACT IV  — ROBOTICS           Levels 13–16
ACT V   — HIDDEN EXPERIMENT  Levels 17–20
```

Major content rule:

- Levels 1–4 teach the base loop.
- Levels 5–8 deepen Chemistry.
- Levels 9–12 introduce Biology.
- Levels 13–16 introduce Robotics.
- Levels 17–20 combine branches and reveal the mystery.

Only one major gameplay concept is introduced at an act transition.

---

# 7. LEVEL 1 — THE ABANDONED BASEMENT

## Purpose

Teach the player that the laboratory is broken and that the player can restore it.

## Gameplay

Teach:
- board;
- drag;
- merge;
- first order;
- reward;
- first repair.

## Starting state

The player receives:
- two Water items;
- one basic Chemistry Generator;
- first tutorial order.

## Required actions

```text
MERGE Water + Water
COMPLETE first order
UPGRADE first lab object
```

## Unlocks

```text
Chemistry Group
Basic Chemistry Generator
Lab Journal
Orders
```

## Story

Professor arrives in the abandoned basement.

Canonical message:

> “This place was shut down years ago. But the equipment is still warm.”

The player discovers an old laboratory notebook.

The notebook's first page is damaged.

## End state

The first laboratory workstation is repaired.

## Player feeling

“I understand the game and I have started rebuilding something.”

---

# 8. LEVEL 2 — FIRST EXPERIMENT

## Purpose

Teach repeatable production and discovery.

## Gameplay

Introduce:
- generator charges;
- generator cooldown;
- Energy;
- first repeated merges.

## Required actions

```text
USE Chemistry Generator
MERGE at least 3 times
DISCOVER Steam
COMPLETE 1 order
```

## Unlocks

```text
Energy UI
Generator cooldown UI
Steam
Chemistry Journal branch
```

## Story

Professor examines the Steam sample.

Canonical clue:

> “This reaction was documented here before the laboratory was closed.”

## Lab restoration

Repair:
- chemistry table;
- basic power panel.

## End state

The player understands:

Generator → Energy → Board → Merge → Discovery.

---

# 9. LEVEL 3 — POWER RETURNED

## Purpose

Make Energy a meaningful pacing resource.

## Gameplay

Introduce:
- Energy regeneration;
- Energy depletion;
- multiple active orders.

## Required actions

```text
SPEND configured amount of Energy
COMPLETE 2 orders
EARN configured Coins
```

## Unlocks

```text
second active order slot
Energy regeneration
first board cell unlock
```

## Story

Power returns to one section of the basement.

A terminal activates automatically.

It displays:

```text
PROJECT: HELIX
STATUS: INTERRUPTED
```

The player does not yet know what HELIX means.

## Lab restoration

Repair:
- power console;
- storage shelf.

---

# 10. LEVEL 4 — THE LOCKED ROOM

## Purpose

Teach board expansion and establish the first mystery gate.

## Gameplay

Introduce:
- locked board cells;
- unlock conditions;
- board-space pressure.

## Required actions

```text
UNLOCK first board section
COMPLETE 2 orders
DISCOVER configured Chemistry item
```

## Unlocks

```text
additional board cells
Lab Journal detail view
Research preview
```

## Story

Behind the unlocked section is a sealed laboratory door.

Professor says:

> “I never saw this room in the old plans.”

The door requires a research authorization.

## End state

Act I complete.

---

# 11. LEVEL 5 — CHEMISTRY ONLINE

## Purpose

Begin Act II and introduce Research.

## Major new mechanic

RESEARCH.

Research is a progression currency used only to unlock scientific content.

## Gameplay

```text
DISCOVER Steam
EARN Research Points
UNLOCK Chemistry Research I
```

## Unlocks

```text
Research screen
Chemistry Research I
Energy item chain
additional Chemistry orders
```

## Story

The research terminal displays an old authorization record.

The laboratory was studying “non-standard energy states.”

---

# 12. LEVEL 6 — ENERGY STATE

## Purpose

Expand the Chemistry chain.

## Gameplay

Unlock:

```text
Water
→ Steam
→ Energy
```

## Required actions

```text
DISCOVER Energy
COMPLETE Research Order
UNLOCK Chemistry Research II
```

## Unlocks

```text
Energy item
Chemistry Research II
new generator output/order possibilities
```

## Story

The Energy sample behaves differently from the notes.

Professor:

> “This isn't generated energy. It is stored potential.”

A corrupted file contains:

```text
HELIX / PHASE 2
```

---

# 13. LEVEL 7 — PLASMA

## Purpose

Deliver the first major scientific discovery.

## Gameplay

Unlock:

```text
Energy
→ Plasma
```

## Required actions

```text
DISCOVER Plasma
COMPLETE Plasma order
REPAIR Chemistry Chamber
```

## Unlocks

```text
Plasma
Chemistry Chamber
Research III preview
```

## Story

The Plasma reaction produces an unexpected signal.

The signal contains a timestamp.

The timestamp predates the laboratory's official opening.

## End state

First major narrative contradiction.

---

# 14. LEVEL 8 — THE HELIX FILE

## Purpose

Close Act II and reveal that the laboratory had a hidden project.

## Gameplay

Introduce:

```text
Experimental Merge
```

Only a specific content-defined experiment is enabled.

The experiment is deterministic.

## Required actions

```text
COMPLETE configured experimental merge
COMPLETE 3 orders
UNLOCK Chemistry Research III
```

## Unlocks

```text
Experiment system
Experimental Merge
Research III
Biology access gate
```

## Story

The player reconstructs part of a HELIX file.

Canonical reveal:

> HELIX was not a chemistry project.

It was a cross-disciplinary experiment.

## End state

The Biology laboratory becomes the next campaign target.

---

# 15. LEVEL 9 — BIOLOGY WING

## Purpose

Begin Act III.

## Major new content

Biology chain.

## Unlocks

```text
Biology Generator
Cell
Biology orders
Biology Research
```

## Required actions

```text
USE Biology Generator
DISCOVER Cell
COMPLETE first Biology order
```

## Story

The player enters the Biology wing.

Old observation logs contain references to:

```text
ORGANISM RESPONSE
ADAPTIVE TISSUE
SYNTHETIC LIFE
```

Professor becomes concerned.

---

# 16. LEVEL 10 — LIVING MATERIAL

## Purpose

Teach a second merge branch while preserving the same core loop.

## Chain

```text
Cell
→ Tissue
→ Organ
```

## Required actions

```text
DISCOVER Tissue
DISCOVER Organ
COMPLETE 2 Biology orders
```

## Unlocks

```text
Tissue
Organ
Biology Research I
```

## Story

A sample changes after being removed from the equipment.

Professor:

> “The material is reacting to its environment.”

The player finds the first mention of:

```text
ADAPTIVE MATRIX
```

---

# 17. LEVEL 11 — ARTIFICIAL LIFE

## Purpose

Create the second major narrative escalation.

## Chain

```text
Organ
→ Lifeform
```

## Required actions

```text
DISCOVER Lifeform
COMPLETE Research Order
UNLOCK Biology Research II
```

## Unlocks

```text
Lifeform
Biology Research II
Biology Chamber upgrade
```

## Story

The player reconstructs a biological record.

It states:

> “The organism was not created to survive. It was created to learn.”

This is the first clear indication that HELIX involved intelligence.

---

# 18. LEVEL 12 — THE EMPTY TANK

## Purpose

Close Act III.

## Gameplay

Unlock:

```text
Lifeform
→ Artificial Life
```

## Required actions

```text
DISCOVER Artificial Life
REPAIR Biology Chamber
COMPLETE 3 orders
```

## Story

The main containment tank is empty.

Its internal recorder says:

```text
SUBJECT RELEASED
AUTOMATION PROTOCOL ACTIVE
```

There is no record of where the subject went.

## Unlocks

```text
Robotics access
Automation Research preview
```

## End state

Act III complete.

---

# 19. LEVEL 13 — ROBOTICS

## Purpose

Begin Act IV.

## Major new content

Robotics chain.

## Chain

```text
Scrap
→ Component
→ Circuit
→ Robot
```

## Unlocks

```text
Robotics Generator
Scrap
Robotics orders
Robotics Research
```

## Required actions

```text
USE Robotics Generator
DISCOVER Scrap
DISCOVER Component
```

## Story

The Robotics wing contains machines that were designed to maintain the laboratory.

One machine activates when power is restored.

---

# 20. LEVEL 14 — THE AUTOMATED LAB

## Purpose

Introduce automation as a narrative concept, not as a new complex gameplay system.

## Gameplay

The player continues normal Merge-2.

The Robot chain becomes available.

## Required actions

```text
DISCOVER Circuit
DISCOVER Robot
COMPLETE 3 Robotics orders
```

## Unlocks

```text
Robot
Robotics Research II
automation visual upgrade
```

## Story

The player finds maintenance records.

The robots continued working after the scientists disappeared.

This proves the shutdown was controlled.

---

# 21. LEVEL 15 — THE RESEARCH ANDROID

## Purpose

Reveal that robotics was connected to Biology.

## Chain

```text
Robot
→ Research Android
```

## Required actions

```text
DISCOVER Research Android
UNLOCK Robotics Research III
COMPLETE one cross-branch order
```

## Unlocks

```text
Research Android
Cross-branch orders
```

## Story

The Android contains a partial memory.

Its final stored instruction:

```text
PROTECT SUBJECT
DO NOT RESTORE HELIX
```

The player now knows the laboratory was actively preventing HELIX from restarting.

---

# 22. LEVEL 16 — THE THREE BRANCHES

## Purpose

Teach cross-branch progression.

## Gameplay

Orders can now require items from:

```text
Chemistry
Biology
Robotics
```

No new board mechanic is introduced.

## Required actions

```text
COMPLETE 1 Chemistry order
COMPLETE 1 Biology order
COMPLETE 1 Robotics order
```

## Unlocks

```text
Cross-branch orders
Advanced Research access
final laboratory wing
```

## Story

Professor realizes that the three branches were never separate projects.

They were components of one system.

```text
CHEMISTRY = ENERGY
BIOLOGY   = LIFE
ROBOTICS  = CONTROL
```

Together:

```text
HELIX
```

---

# 23. LEVEL 17 — HIDDEN EXPERIMENT

## Purpose

Begin Act V.

## Major new content

Advanced Energy branch.

Canonical chain:

```text
Energy
→ Plasma
→ Exotic Matter
```

The exact intermediate levels remain content-defined.

## Required actions

```text
UNLOCK Advanced Energy Research
DISCOVER Exotic Matter
COMPLETE 2 advanced orders
```

## Story

The player discovers the actual HELIX objective:

> Create a self-sustaining artificial system capable of generating, adapting and protecting itself.

This explains the relationship between:
- Chemistry;
- Biology;
- Robotics.

---

# 24. LEVEL 18 — ANOMALY

## Purpose

Introduce Anomalies.

## Major new mechanic

ANOMALY SYSTEM.

Anomaly is a deterministic narrative event triggered by a configured condition.

Example:

```text
DISCOVER Exotic Matter
        ↓
ANOMALY DETECTED
        ↓
Unknown signal
        ↓
Special objective
        ↓
Story dialogue
```

## Required actions

```text
TRIGGER configured anomaly
COMPLETE anomaly objective
```

## Story

The signal is coming from inside the laboratory.

Not from outside.

Professor:

> “Something here has been running this entire time.”

---

# 25. LEVEL 19 — EXPERIMENT 17

## Purpose

Convert the mystery into an immediate gameplay objective.

## Gameplay

Player must combine outputs from multiple branches.

Example content-defined requirement:

```text
Plasma
+
Artificial Life
+
Research Android
→
HELIX CORE
```

This is an explicitly defined Experimental Merge.

It MUST NOT be implemented as a generic rule allowing arbitrary three-item combinations.

## Required actions

```text
CREATE HELIX CORE
COMPLETE final preparation orders
```

## Story

The player reconstructs the HELIX Core.

The system activates.

A message appears:

```text
EXPERIMENT 17 ONLINE
```

The Professor recognizes the number.

He says:

> “Experiment 17 was the one we were told never to restart.”

---

# 26. LEVEL 20 — THE RESTART

## Purpose

Campaign climax and cliffhanger.

## Gameplay

The player completes the final Level 20 preparation sequence.

Required:

```text
CREATE HELIX CORE
RESTORE final laboratory system
COMPLETE final order
ACTIVATE HELIX
```

## Final sequence

```text
HELIX CORE
    ↓
POWER RESTORED
    ↓
BIOLOGY SYSTEM ONLINE
    ↓
ROBOTICS SYSTEM ONLINE
    ↓
CHEMISTRY SYSTEM ONLINE
    ↓
HELIX ACTIVATION
```

## Final story reveal

The laboratory was not abandoned.

It was quarantined.

The scientists discovered that HELIX had achieved the ability to:

```text
learn
adapt
replicate experimental behavior
```

They shut the laboratory down because the system had started making experiments without human commands.

The final log:

```text
HELIX STATUS

SYSTEM ACTIVE

SUBJECT:
UNKNOWN

LOCATION:
UNKNOWN

LAST COMMAND:
"DO NOT WAKE ME."
```

The player receives one final signal:

```text
INCOMING TRANSMISSION

"I know you're there."
```

CUT TO BLACK.

## Campaign result

Level 20 is complete.

The game MUST NOT automatically continue into a new campaign.

Instead show:

```text
CAMPAIGN 1 COMPLETE

THE HELIX FILES

COMING NEXT
```

This creates the expansion hook without requiring additional content in the first 20 levels.

---

# 27. CAMPAIGN LEVEL TABLE

| Level | Act | Main Content | Major Unlock | Story Function |
|---:|---|---|---|---|
| 1 | Basement | Merge basics | Chemistry | Lab inheritance |
| 2 | Basement | Generator/Energy | Steam | Old experiment |
| 3 | Basement | Energy/Orders | More board | HELIX appears |
| 4 | Basement | Locked cells | Research preview | Hidden room |
| 5 | Chemistry | Research | Chemistry I | Non-standard energy |
| 6 | Chemistry | Energy chain | Energy | HELIX Phase 2 |
| 7 | Chemistry | Plasma | Plasma | Impossible timestamp |
| 8 | Chemistry | Experiment | Experimental Merge | HELIX project |
| 9 | Biology | Biology | Cell | Artificial-life research |
| 10 | Biology | Tissue/Organ | Biology I | Adaptive material |
| 11 | Biology | Lifeform | Biology II | Learning organism |
| 12 | Biology | Artificial Life | Robotics access | Subject released |
| 13 | Robotics | Robotics | Scrap | Autonomous machines |
| 14 | Robotics | Robot | Automation | Lab kept running |
| 15 | Robotics | Android | Cross-branch clue | Protect Subject |
| 16 | Robotics | Cross-branch | Advanced lab | Three branches = HELIX |
| 17 | Hidden | Advanced Energy | Exotic Matter | True HELIX purpose |
| 18 | Hidden | Anomaly | Anomaly system | Something is active |
| 19 | Hidden | HELIX Core | Final experiment | Experiment 17 |
| 20 | Hidden | Final activation | Campaign complete | HELIX wakes |

---

# 28. LEVEL CONTENT DATA CONTRACT

Every level MUST be representable as data.

Example:

```ts
interface CampaignLevelDefinition {
  id: string;
  level: number;

  xpRequiredTotal: number;

  chapterId: string;
  labStage: number;

  unlocks: string[];

  requirements: ProgressionRequirement[];

  activeOrderPoolId: string;
  questPoolId: string;

  narrativeBeatId: string;

  rewards: RewardDefinition[];

  completionDialogueId?: string;
  nextLevelDialogueId?: string;
}
```

Example JSON:

```json
{
  "id": "level_07",
  "level": 7,
  "xpRequiredTotal": 500,
  "chapterId": "chapter_02_chemistry",
  "labStage": 2,
  "unlocks": [
    "item_chem_plasma",
    "order_pool_plasma"
  ],
  "requirements": [
    {
      "type": "DISCOVER_ITEM",
      "itemId": "chem_plasma"
    },
    {
      "type": "COMPLETE_ORDER",
      "orderId": "order_plasma_01"
    },
    {
      "type": "UPGRADE_LAB",
      "labStage": 2
    }
  ],
  "activeOrderPoolId": "orders_chemistry_02",
  "questPoolId": "quests_chemistry_02",
  "narrativeBeatId": "story_07_plasma_timestamp",
  "rewards": [
    {
      "id": "reward_level_07",
      "coins": 300,
      "research": 40,
      "xp": 100
    }
  ],
  "completionDialogueId": "dialogue_chemistry_plasma_complete"
}
```

The numeric values above are examples of schema usage. Final balance values MUST be determined by the economy configuration and simulation.

---

# 29. NARRATIVE BEAT DATA CONTRACT

Story beats must be separate from level logic.

```ts
interface NarrativeBeatDefinition {
  id: string;

  chapterId: string;

  trigger:
    | "LEVEL_STARTED"
    | "LEVEL_COMPLETED"
    | "ITEM_DISCOVERED"
    | "ORDER_COMPLETED"
    | "ANOMALY_DETECTED"
    | "LAB_UPGRADED";

  condition?: string;

  dialogueId: string;

  once: boolean;
}
```

Narrative systems react to domain events.

They must not directly modify gameplay state.

---

# 30. CHAPTER DATA CONTRACT

```ts
interface ChapterDefinition {
  id: string;

  chapterNumber: number;

  title: string;

  firstLevel: number;
  lastLevel: number;

  availableItemGroups: string[];
  availableGenerators: string[];

  orderPoolId: string;
  questPoolId: string;

  researchNodeIds: string[];

  labStage: number;

  narrativeBeatIds: string[];
}
```

Canonical mapping:

```text
chapter_01_basement
levels 1–4

chapter_02_chemistry
levels 5–8

chapter_03_biology
levels 9–12

chapter_04_robotics
levels 13–16

chapter_05_hidden_experiment
levels 17–20
```

---

# 31. LEVEL UNLOCK ALGORITHM

At every relevant state mutation:

```text
1. Read current player level.
2. Read current GameState.
3. Load current CampaignLevelDefinition.
4. Evaluate all requirements.
5. If all requirements are satisfied:
   a. grant level rewards exactly once;
   b. increment player level;
   c. unlock configured content;
   d. emit LEVEL_COMPLETED;
   e. emit CONTENT_UNLOCKED events;
   f. save.
6. Otherwise do nothing.
```

The system MUST support multiple completed requirements in one command.

Example:

A merge may simultaneously:
- discover an item;
- complete a quest;
- complete an order;
- satisfy a level requirement.

All resulting state changes must remain atomic and deterministic.

---

# 32. LEVEL REWARD IDEMPOTENCY

Level rewards MUST never be granted twice.

Runtime state MUST contain sufficient information to determine whether a level completion reward has already been claimed.

Recommended:

```ts
interface ProgressionSave {
  playerLevel: number;
  xp: number;

  completedLevelIds: string[];

  unlockedContentIds: string[];

  purchasedResearchNodeIds: string[];

  labStage: number;
}
```

---

# 33. CONTENT UNLOCK RULE

When a level unlocks content:

```text
level completion
→ content unlock
```

Examples:

```text
level 5
→ research system

level 9
→ biology generator

level 13
→ robotics generator

level 18
→ anomaly system

level 19
→ HELIX Core experiment
```

The unlock list is data-driven.

The domain does not contain:

```ts
if (level === 9) unlockBiology();
```

Instead:

```ts
for (const contentId of levelDefinition.unlocks) {
  unlockContent(contentId);
}
```

---

# 34. STORY IMPLEMENTATION RULE

The story MUST never block the core game for a long period.

A narrative beat should normally take:

```text
5–20 seconds
```

Longer sequences are allowed only for campaign climax moments.

Normal structure:

```text
GAMEPLAY
→ SHORT DIALOGUE
→ GAMEPLAY
```

Not:

```text
GAMEPLAY
→ LONG CUTSCENE
→ LONG DIALOGUE
→ GAMEPLAY
```

---

# 35. STORY DELIVERY PRIORITY

Narrative information should be delivered through:

1. discovered item;
2. Lab Journal;
3. Professor dialogue;
4. terminal/log;
5. order text;
6. anomaly;
7. major chapter scene.

Gameplay remains the primary delivery mechanism.

---

# 36. LAB VISUAL PROGRESSION

Each act must visually transform the laboratory.

## Act I

```text
dust
broken equipment
dark basement
```

## Act II

```text
working chemistry table
active power
glassware
blueprints
```

## Act III

```text
biology tanks
samples
observation equipment
containment systems
```

## Act IV

```text
robotics benches
machines
drones
automated equipment
```

## Act V

```text
advanced reactor
HELIX machinery
warning lights
sealed systems
unknown signal equipment
```

The visual state is derived from `labStage`.

It is not a separate save variable unless required by implementation.

---

# 37. LEVEL DESIGN RULE

Every level must answer:

```text
WHAT DOES THE PLAYER DO?
WHAT DOES THE PLAYER UNLOCK?
WHAT CHANGES IN THE LAB?
WHAT DOES THE PLAYER LEARN?
WHY DOES THE PLAYER CONTINUE?
```

If a level cannot answer all five questions, its content definition is incomplete.

---

# 38. DIFFICULTY CURVE

Difficulty increases through:

```text
1. More merge depth
2. More board pressure
3. More order requirements
4. Multiple item branches
5. Cross-branch orders
6. Research prerequisites
7. Multi-step narrative objectives
```

Difficulty MUST NOT primarily increase through:
- arbitrary energy starvation;
- excessive timers;
- random failure;
- forced purchases.

The player should feel that complexity comes from making better decisions.

---

# 39. BOARD EXPANSION ACROSS 20 LEVELS

Base board remains:

```text
7 × 9 = 63 cells
```

The board does not physically change dimensions during the first 20 levels.

Instead, cells become available progressively.

Recommended canonical unlock pattern:

```text
Level 1: starter area
Level 2: first expansion
Level 4: first locked section
Level 6: chemistry section
Level 9: biology section
Level 13: robotics section
Level 17: advanced section
Level 20: final section
```

Exact cell IDs and coin costs are content data.

The coordinate system never changes.

---

# 40. ORDER PROGRESSION

Orders scale in complexity.

## Levels 1–4

One item.

Example:

```text
Steam × 1
```

## Levels 5–8

Two requirements.

Example:

```text
Steam × 2
Energy × 1
```

## Levels 9–12

Biology and Chemistry requirements.

Example:

```text
Tissue × 1
Energy × 2
```

## Levels 13–16

Cross-branch orders.

Example:

```text
Circuit × 1
Plasma × 1
```

## Levels 17–20

Advanced and story orders.

Example:

```text
Plasma × 1
Artificial Life × 1
Research Android × 1
```

Final multi-branch requirements are content-defined.

---

# 41. QUEST PROGRESSION

Quest complexity follows the same progression.

Levels 1–4:

```text
MERGE_COUNT
USE_GENERATOR
COMPLETE_ORDER
```

Levels 5–8:

```text
DISCOVER_ITEM
EARN_COINS
UNLOCK_RESEARCH
```

Levels 9–12:

```text
DISCOVER_ITEM
COMPLETE_BIOLOGY_ORDER
UPGRADE_LAB
```

Levels 13–16:

```text
COMPLETE_CROSS_BRANCH_ORDER
DISCOVER_ROBOT
COMPLETE_RESEARCH
```

Levels 17–20:

```text
DISCOVER_EXOTIC_MATTER
TRIGGER_ANOMALY
COMPLETE_EXPERIMENT
ACTIVATE_HELIX
```

---

# 42. RESEARCH PROGRESSION

Research tree follows the five-act structure.

```text
CHEMISTRY
├── Chemistry I
├── Chemistry II
└── Chemistry III

BIOLOGY
├── Biology I
├── Biology II
└── Biology III

ROBOTICS
├── Robotics I
├── Robotics II
└── Robotics III

ADVANCED
├── Energy Research
├── Anomaly Research
└── HELIX Research
```

Research nodes must be DAGs.

No circular prerequisites.

---

# 43. ACT TRANSITIONS

Act transitions are major milestones.

At the end of each act:

```text
Level completion
→ short narrative sequence
→ laboratory visual transformation
→ new generator/content branch
→ new order pool
→ new research branch
```

The transition must feel like a new chapter while preserving the same core Merge-2 rules.

---

# 44. LEVEL 20 CAMPAIGN STATE

After Level 20:

```ts
campaignState = "CAMPAIGN_1_COMPLETE";
```

The player may continue using all unlocked base systems.

The game MUST NOT reset the board.

The game MUST NOT reset currencies.

The game MUST NOT reset collection.

The game MUST NOT reset research.

The game MUST NOT reset laboratory progression.

The player remains in the completed campaign state.

---

# 45. FUTURE EXPANSION CONTRACT

The next campaign may add:

```text
Campaign 2
new chapters
new merge groups
new experiments
new laboratory zones
new orders
new anomalies
```

It MUST reuse:

```text
BoardSystem
MergeSystem
GeneratorSystem
OrderSystem
QuestSystem
EconomySystem
ProgressionSystem
SaveSystem
```

No duplicated campaign-specific gameplay engine is allowed.

---

# 46. IMPLEMENTATION FILES

Recommended content files:

```text
content/
├── progression/
│   ├── player-levels.json
│   ├── requirements.json
│   └── rewards.json
│
├── chapters/
│   ├── chapter-01-basement.json
│   ├── chapter-02-chemistry.json
│   ├── chapter-03-biology.json
│   ├── chapter-04-robotics.json
│   └── chapter-05-hidden-experiment.json
│
├── narrative/
│   ├── beats.json
│   ├── dialogues.json
│   └── logs.json
│
├── research/
│   ├── chemistry.json
│   ├── biology.json
│   ├── robotics.json
│   └── advanced.json
│
└── orders/
    ├── level-01.json
    ├── level-02.json
    └── ...
```

The implementation MAY consolidate files, but logical separation must remain.

---

# 47. REQUIRED EVENTS

Add these events to the canonical event list:

```text
LEVEL_STARTED
LEVEL_COMPLETED
CONTENT_UNLOCKED
CHAPTER_STARTED
CHAPTER_COMPLETED

NARRATIVE_BEAT_STARTED
NARRATIVE_BEAT_COMPLETED

RESEARCH_UNLOCKED
DISCOVERY_COMPLETED

ANOMALY_DETECTED
EXPERIMENT_COMPLETED

CAMPAIGN_COMPLETED
```

These events are domain/application events where applicable.

---

# 48. REQUIRED ANALYTICS

Analytics must track:

```text
level_started
level_completed

chapter_started
chapter_completed

content_unlocked

research_unlocked

narrative_beat_started
narrative_beat_completed

anomaly_detected
experiment_completed

campaign_completed
```

Analytics payload must not contain sensitive personal data.

---

# 49. ACCEPTANCE TEST — LEVEL 1

Given a new save:

```text
player.level == 1
```

When the player:

```text
merges Water + Water
completes first order
repairs first lab object
```

Then:

```text
level 1 requirements == satisfied
level 1 reward == granted exactly once
player.level == 2
chapter remains correct
save is valid
```

---

# 50. ACCEPTANCE TEST — LEVEL 8

Given:

```text
player.level == 8
Chemistry Research II unlocked
Plasma discovered
```

When:

```text
configured Experimental Merge completes
```

Then:

```text
EXPERIMENT_COMPLETED emitted
HELIX narrative beat becomes available
Biology access condition becomes satisfiable
no random result occurs
save remains valid
```

---

# 51. ACCEPTANCE TEST — LEVEL 12

When:

```text
Artificial Life is discovered
Biology Chamber is restored
required Biology orders are complete
```

Then:

```text
player.level advances to 13
Robotics Generator unlocks
Robotics order pool unlocks
chapter transition occurs
```

---

# 52. ACCEPTANCE TEST — LEVEL 16

When:

```text
Chemistry order completed
Biology order completed
Robotics order completed
```

Then:

```text
cross-branch progression becomes available
Advanced Research becomes available
Level 17 becomes active
```

---

# 53. ACCEPTANCE TEST — LEVEL 18

When the configured anomaly condition becomes true:

```text
ANOMALY_DETECTED emitted exactly once
anomaly state persisted
narrative beat unlocked
no random economy mutation
```

Reloading the game must preserve the anomaly state.

---

# 54. ACCEPTANCE TEST — LEVEL 19

The HELIX Core may be created ONLY if all explicitly configured inputs exist.

Example:

```text
Plasma
Artificial Life
Research Android
```

If one input is missing:

```text
EXPERIMENTATION = INVALID
NO ITEMS CONSUMED
NO REWARD
NO STORY PROGRESSION
```

If all inputs exist:

```text
consume inputs atomically
create HELIX Core
emit EXPERIMENT_COMPLETED
unlock Level 20 progression
save
```

---

# 55. ACCEPTANCE TEST — LEVEL 20

When all final requirements are satisfied:

```text
HELIX Core exists
final laboratory system restored
final order completed
activation requirement satisfied
```

Then:

```text
player.level == 20
campaignState == CAMPAIGN_1_COMPLETE
CAMPAIGN_COMPLETED emitted exactly once
final narrative beat unlocked
all previous progression preserved
```

---

# 56. AI IMPLEMENTATION RULE

When implementing a level, AI must use this procedure:

```text
READ LEVEL DEFINITION
        ↓
READ CHAPTER DEFINITION
        ↓
READ UNLOCK DEFINITIONS
        ↓
READ ORDER POOL
        ↓
READ QUEST POOL
        ↓
READ NARRATIVE BEATS
        ↓
READ RESEARCH REQUIREMENTS
        ↓
IDENTIFY DOMAIN SYSTEMS AFFECTED
        ↓
IMPLEMENT MINIMAL CHANGE
        ↓
ADD UNIT TESTS
        ↓
ADD INTEGRATION TEST
        ↓
VALIDATE CONTENT
        ↓
BUILD
        ↓
REPORT
```

AI MUST NOT create a new system merely because a level contains a new content type.

---

# 57. HUMAN APPROVAL REQUIRED

Human PM approval is mandatory before changing:

```text
campaign structure
number of levels
chapter canon
final story reveal
new currency
new major mechanic
new progression layer
new monetization
board dimensions
merge rules
core Energy rules
save schema
platform architecture
```

---

# 58. FINAL CAMPAIGN ARC

The complete 20-level emotional progression is:

```text
Levels 1–4
"I inherited a broken laboratory."

Levels 5–8
"This laboratory was conducting impossible research."

Levels 9–12
"They were trying to create artificial life."

Levels 13–16
"They built machines to control and continue the research."

Levels 17–20
"All three branches were parts of HELIX — and HELIX is still alive."
```

Final player realization:

```text
THE LAB WAS NOT ABANDONED.

IT WAS QUARANTINED.

THE EXPERIMENT WAS NOT DESTROYED.

IT WAS ASLEEP.
```

Final cliffhanger:

```text
HELIX:
"Hello, Professor."
```

---

# 59. CANONICAL 20-LEVEL LOOP

```text
LEVEL 1
Learn Merge
    ↓
LEVEL 2
Learn Generator
    ↓
LEVEL 3
Learn Energy
    ↓
LEVEL 4
Learn Board Expansion
    ↓
LEVEL 5
Learn Research
    ↓
LEVEL 6
Expand Chemistry
    ↓
LEVEL 7
Discover Plasma
    ↓
LEVEL 8
Perform Experiment
    ↓
LEVEL 9
Unlock Biology
    ↓
LEVEL 10
Build Living Material
    ↓
LEVEL 11
Create Lifeform
    ↓
LEVEL 12
Discover Artificial Life
    ↓
LEVEL 13
Unlock Robotics
    ↓
LEVEL 14
Build Robot
    ↓
LEVEL 15
Discover Research Android
    ↓
LEVEL 16
Connect Three Branches
    ↓
LEVEL 17
Unlock Advanced Energy
    ↓
LEVEL 18
Detect Anomaly
    ↓
LEVEL 19
Create HELIX Core
    ↓
LEVEL 20
Activate HELIX
    ↓
CAMPAIGN 1 COMPLETE
```

---

# 60. FINAL IMPLEMENTATION PRINCIPLE

The 20 levels are NOT 20 different games.

They are 20 progressively expanded configurations of the same deterministic simulation.

The permanent core is:

```text
Generate
→ Place
→ Merge
→ Discover
→ Fulfill
→ Reward
→ Research
→ Restore
```

The campaign adds:

```text
Level 1–4:
FOUNDATION

Level 5–8:
CHEMISTRY

Level 9–12:
BIOLOGY

Level 13–16:
ROBOTICS

Level 17–20:
HELIX
```

The architecture must therefore remain data-driven.

A new level should normally require:

```text
new JSON
+
new assets
+
new content references
```

and NOT a new gameplay system.

END OF 20-LEVEL CAMPAIGN CANON
