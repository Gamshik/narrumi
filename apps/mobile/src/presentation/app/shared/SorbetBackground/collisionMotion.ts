import { Animated, Easing } from 'react-native';

// CollisionPattern names the predefined approach behavior used before impact.
type CollisionPattern = 'glide' | 'hesitate' | 'doubleTake';

// CollisionScenario describes one complete approach, impact, and retreat rhythm.
type CollisionScenario = {
  // pattern selects the approach waypoint sequence.
  readonly pattern: CollisionPattern;
  // approachDuration controls how long the pair takes to reach compression.
  readonly approachDuration: number;
  // contactHoldDuration keeps the squash visible before rebound.
  readonly contactHoldDuration: number;
  // reboundDuration controls the short elastic release from compression.
  readonly reboundDuration: number;
  // reboundValue determines how far the pair separates immediately after impact.
  readonly reboundValue: number;
  // retreatDuration returns the pair to its resting positions.
  readonly retreatDuration: number;
  // pauseDuration leaves an irregular quiet gap between collisions.
  readonly pauseDuration: number;
};

// SequentialCollisionLoopOptions configures one scheduler for every bubble pair.
type SequentialCollisionLoopOptions = {
  // initialDelay leaves the background calm before the first collision.
  readonly initialDelay: number;
  // phases contains the native animated values for every available pair.
  readonly phases: readonly Animated.Value[];
};

// COLLISION_SCENARIOS are bounded rhythms that can be safely randomized at runtime.
const COLLISION_SCENARIOS: readonly CollisionScenario[] = [
  {
    pattern: 'glide',
    approachDuration: 9800,
    contactHoldDuration: 220,
    reboundDuration: 980,
    reboundValue: 0.68,
    retreatDuration: 9200,
    pauseDuration: 2600,
  },
  {
    pattern: 'hesitate',
    approachDuration: 11200,
    contactHoldDuration: 180,
    reboundDuration: 1180,
    reboundValue: 0.74,
    retreatDuration: 10400,
    pauseDuration: 1800,
  },
  {
    pattern: 'doubleTake',
    approachDuration: 8600,
    contactHoldDuration: 140,
    reboundDuration: 820,
    reboundValue: 0.6,
    retreatDuration: 7900,
    pauseDuration: 3400,
  },
  {
    pattern: 'glide',
    approachDuration: 7200,
    contactHoldDuration: 120,
    reboundDuration: 760,
    reboundValue: 0.64,
    retreatDuration: 8800,
    pauseDuration: 4200,
  },
] as const;

// startSequentialCollisionLoop randomizes pairs only after the active pair rests.
export function startSequentialCollisionLoop({
  initialDelay,
  phases,
}: SequentialCollisionLoopOptions): () => void {
  // activeAnimation tracks the current native sequence for cleanup.
  let activeAnimation: Animated.CompositeAnimation | undefined;
  // isStopped prevents completion callbacks from scheduling another scenario.
  let isStopped: boolean = false;
  // previousScenarioIndex prevents an obvious immediate pattern repetition.
  let previousScenarioIndex: number = -1;
  // previousPairIndex prevents the same pair from colliding twice in succession.
  let previousPairIndex: number = -1;
  // nextDelay applies the pair-specific offset only to the first run.
  let nextDelay: number = initialDelay;

  // runNextScenario selects and starts one complete collision sequence.
  const runNextScenario = (): void => {
    if (isStopped) {
      return;
    }

    // Every pair is at rest before random selection, preventing coordinate jumps.
    phases.forEach((pairPhase: Animated.Value): void => {
      pairPhase.setValue(0);
    });

    const pairIndex: number = chooseDifferentIndex(
      phases.length,
      previousPairIndex,
    );
    const scenarioIndex: number = chooseScenarioIndex(previousScenarioIndex);
    const phase: Animated.Value | undefined = phases[pairIndex];
    const scenario: CollisionScenario | undefined =
      COLLISION_SCENARIOS[scenarioIndex];

    if (!phase || !scenario) {
      return;
    }

    previousPairIndex = pairIndex;
    previousScenarioIndex = scenarioIndex;

    activeAnimation = Animated.sequence([
      Animated.delay(nextDelay),
      ...createApproachSteps(phase, scenario),
      Animated.delay(scenario.contactHoldDuration),
      Animated.timing(phase, {
        duration: scenario.reboundDuration,
        easing: Easing.out(Easing.back(1.9)),
        toValue: scenario.reboundValue,
        useNativeDriver: true,
      }),
      Animated.timing(phase, {
        duration: scenario.retreatDuration,
        easing: Easing.inOut(Easing.sin),
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.delay(scenario.pauseDuration),
    ]);
    nextDelay = 0;

    activeAnimation.start(({ finished }: { finished: boolean }): void => {
      if (finished && !isStopped) {
        runNextScenario();
      }
    });
  };

  runNextScenario();

  return (): void => {
    isStopped = true;
    activeAnimation?.stop();
  };
}

// createApproachSteps builds a distinctive but bounded path to full compression.
function createApproachSteps(
  phase: Animated.Value,
  scenario: CollisionScenario,
): readonly Animated.CompositeAnimation[] {
  if (scenario.pattern === 'hesitate') {
    return [
      Animated.timing(phase, {
        duration: Math.round(scenario.approachDuration * 0.46),
        easing: Easing.inOut(Easing.sin),
        toValue: 0.54,
        useNativeDriver: true,
      }),
      Animated.delay(720),
      Animated.timing(phase, {
        duration: Math.round(scenario.approachDuration * 0.54),
        easing: Easing.inOut(Easing.sin),
        toValue: 1,
        useNativeDriver: true,
      }),
    ];
  }

  if (scenario.pattern === 'doubleTake') {
    return [
      Animated.timing(phase, {
        duration: Math.round(scenario.approachDuration * 0.52),
        easing: Easing.inOut(Easing.sin),
        toValue: 0.7,
        useNativeDriver: true,
      }),
      Animated.timing(phase, {
        duration: 680,
        easing: Easing.out(Easing.sin),
        toValue: 0.56,
        useNativeDriver: true,
      }),
      Animated.timing(phase, {
        duration: Math.round(scenario.approachDuration * 0.48),
        easing: Easing.inOut(Easing.sin),
        toValue: 1,
        useNativeDriver: true,
      }),
    ];
  }

  return [
    Animated.timing(phase, {
      duration: scenario.approachDuration,
      easing: Easing.inOut(Easing.sin),
      toValue: 1,
      useNativeDriver: true,
    }),
  ];
}

// chooseScenarioIndex returns a random scenario different from the previous one.
function chooseScenarioIndex(previousScenarioIndex: number): number {
  return chooseDifferentIndex(
    COLLISION_SCENARIOS.length,
    previousScenarioIndex,
  );
}

// chooseDifferentIndex returns a valid random index without immediate repetition.
function chooseDifferentIndex(length: number, previousIndex: number): number {
  if (length < 2) {
    return 0;
  }

  let nextIndex: number = previousIndex;

  while (nextIndex === previousIndex) {
    nextIndex = Math.floor(Math.random() * length);
  }

  return nextIndex;
}
