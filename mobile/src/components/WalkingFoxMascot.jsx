/**
 * WalkingFoxMascot.jsx — Fully Articulated Studio Mascot ("Kodak the Fox")
 *
 * Full-body articulation across all gaits (Idle / Walk / Run / Auto-cycle):
 *  - Alternating stepping & running paws (left & right feet lift and plant)
 *  - Fluffy fox tail swishing happily behind him
 *  - Torso bounce, waddle tilt, and forward running lean
 *  - Natural arm swing & energetic friendly waving paw with sparkles
 *  - Head bobbing & perky ear twitches
 *  - Animated eye blinking (catchlight eyes blink naturally)
 *  - Auto-cycling or explicit gait control (never stuck on one animation)
 *  - High-clarity speech bubble and haptic interactions
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity } from 'react-native';
import Svg, {
  Defs, LinearGradient as SvgLinearGradient, Stop,
  Path, Circle, Ellipse, Rect, Line, G,
} from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Sparkles } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { Typography, Radius } from '../theme';

export default function WalkingFoxMascot({
  size = 78,
  gait = 'auto', // 'auto' | 'idle' | 'walk' | 'run'
  direction = 'right', // 'right' | 'left'
  message = null,
  emoji = null,
  onMascotPress,
  style,
}) {
  const { isDark, colors } = useTheme();

  // Internal gait state for auto-cycling
  const [activeGait, setActiveGait] = useState(gait === 'auto' ? 'walk' : gait);

  // Sync prop changes
  useEffect(() => {
    if (gait !== 'auto') {
      setActiveGait(gait);
    }
  }, [gait]);

  // Auto-cycle through animations so Kodak is never stuck in only one animation
  useEffect(() => {
    if (gait !== 'auto') return;

    const sequence = ['walk', 'idle', 'walk', 'idle'];
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % sequence.length;
      setActiveGait(sequence[idx]);
    }, 5500);

    return () => clearInterval(interval);
  }, [gait]);

  const isRun = activeGait === 'run';
  const isWalk = activeGait === 'walk';
  const isIdle = activeGait === 'idle';

  // ── Dynamic Posture, Arm & Tail Behavior States ──
  // Poses: 'sit' (sitting comfortably waiting), 'wave' (saying hi with waving paw & sparkles), 'vest' (thinking/director), 'down' (standing arms down)
  const [pose, setPose] = useState('sit');
  const sitProgress    = useRef(new Animated.Value(1)).current; // Default: 1 = sitting comfortably, 0 = standing
  const armDownOpacity = useRef(new Animated.Value(0)).current; // 0 = not down
  const armWaveOpacity = useRef(new Animated.Value(0)).current; // 0 = not waving
  const armVestOpacity = useRef(new Animated.Value(0)).current; // 0 = not on vest
  const tailBaseAngle  = useRef(new Animated.Value(34)).current; // 34 = cozy low tail when sitting, 26 = standing stroll, 0 = perky wave

  // ── Contextual Speech Bubble Auto-Hide with Touch Protection ──
  const [bubbleVisible, setBubbleVisible] = useState(Boolean(message));
  const bubbleAnim = useRef(new Animated.Value(Boolean(message) ? 1 : 0)).current;
  const autoHideTimer = useRef(null);
  const isInteractingWithBubble = useRef(false);

  const hideBubble = () => {
    Animated.timing(bubbleAnim, {
      toValue: 0,
      duration: 260,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      setBubbleVisible(false);
    });
  };

  const showBubble = (stayDuration = 6500) => {
    setBubbleVisible(true);
    Animated.spring(bubbleAnim, {
      toValue: 1,
      friction: 7,
      tension: 130,
      useNativeDriver: true,
    }).start();

    if (autoHideTimer.current) clearTimeout(autoHideTimer.current);
    autoHideTimer.current = setTimeout(() => {
      if (!isInteractingWithBubble.current) {
        hideBubble();
      }
    }, stayDuration);
  };

  // Smooth transition between mascot poses ('sit' | 'wave' | 'vest' | 'down')
  const transitionToPose = (newPose, isTailPerky = false) => {
    setPose(newPose);
    const isSit = newPose === 'sit';
    Animated.parallel([
      Animated.timing(sitProgress, {
        toValue: isSit ? 1 : 0,
        duration: 360,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(armDownOpacity, {
        toValue: (newPose === 'down' || newPose === 'sit') ? 1 : 0,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(armWaveOpacity, {
        toValue: newPose === 'wave' ? 1 : 0,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(armVestOpacity, {
        toValue: newPose === 'vest' ? 1 : 0,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(tailBaseAngle, {
        toValue: isTailPerky ? 0 : isSit ? 38 : 26,
        duration: 480,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  };

  // ── Articulated Animation Drivers ──
  const cadenceLoop   = useRef(new Animated.Value(0)).current;
  const tailLoop      = useRef(new Animated.Value(0)).current;
  const waveLoop      = useRef(new Animated.Value(0)).current;
  const earLoop       = useRef(new Animated.Value(0)).current;
  const blinkLoop     = useRef(new Animated.Value(0)).current;
  const sparklePop    = useRef(new Animated.Value(1)).current;
  const pressSquash   = useRef(new Animated.Value(1)).current;
  const talkMouthLoop = useRef(new Animated.Value(0)).current;
  const talkEyeLoop   = useRef(new Animated.Value(0)).current;
  const pupilShift    = useRef(new Animated.Value(0)).current;
  const breathingLoop = useRef(new Animated.Value(0)).current;
  const headTilt      = useRef(new Animated.Value(0)).current; // -1 to 1: Fox inquisitive head-tilt
  const sniffLoop     = useRef(new Animated.Value(0)).current; // 0 to 1: Cute nose sniff twitch

  // 0. Peaceful Resting Breathing Cycle
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(breathingLoop, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breathingLoop, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [breathingLoop]);

  // 1. Cadence Loop (Drives feet, torso bob, arm swing, waddle)
  useEffect(() => {
    cadenceLoop.setValue(0);
    const duration = isRun ? 320 : isWalk ? 620 : 1800;
    const anim = Animated.loop(
      Animated.timing(cadenceLoop, {
        toValue: 1,
        duration,
        easing: isIdle ? Easing.inOut(Easing.sin) : Easing.linear,
        useNativeDriver: true,
      })
    );
    anim.start();
    return () => anim.stop();
  }, [activeGait, cadenceLoop, isRun, isWalk, isIdle]);

  // 2. Tail Swish Cycle
  useEffect(() => {
    const tailDuration = isRun ? 400 : isWalk ? 750 : 1200;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(tailLoop, {
          toValue: 1,
          duration: tailDuration,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(tailLoop, {
          toValue: -1,
          duration: tailDuration,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [activeGait, tailLoop, isRun, isWalk]);

  // 3. Waving Paw Cycle (Active during idle or walk)
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(waveLoop, {
          toValue: 1,
          duration: 380,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(waveLoop, {
          toValue: -1,
          duration: 380,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [waveLoop]);

  // 4. Perky Ear Twitches
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(1800),
        Animated.timing(earLoop, { toValue: 1, duration: 140, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(earLoop, { toValue: -1, duration: 140, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(earLoop, { toValue: 0, duration: 140, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.delay(2600),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [earLoop]);

  // 5. Eye Blinking Loop (Closes eyelids for 120ms every ~3.5s)
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(3200),
        Animated.timing(blinkLoop, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(blinkLoop, { toValue: 0, duration: 120, useNativeDriver: true }),
        Animated.delay(2800),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [blinkLoop]);

  // 6. Sparkle Twinkle Loop
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(sparklePop, { toValue: 1.3, duration: 600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(sparklePop, { toValue: 0.8, duration: 600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [sparklePop]);

  // 7. Talking Mouth & Expressive Eye Animation (Animated speech chatter, squints & brow emphasis)
  useEffect(() => {
    if (!message) {
      Animated.parallel([
        Animated.timing(talkMouthLoop, { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.timing(talkEyeLoop, { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.timing(pupilShift, { toValue: 0, duration: 160, useNativeDriver: true }),
      ]).start();
      return;
    }

    // Mouth chatter sequence (syllables flapping naturally with speech)
    const mouthAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(talkMouthLoop, { toValue: 1, duration: 110, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(talkMouthLoop, { toValue: 0.35, duration: 90, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.timing(talkMouthLoop, { toValue: 0.85, duration: 115, easing: Easing.out(Easing.sin), useNativeDriver: true }),
        Animated.timing(talkMouthLoop, { toValue: 0.12, duration: 95, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(talkMouthLoop, { toValue: 1.15, duration: 130, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(talkMouthLoop, { toValue: 0.4, duration: 90, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.timing(talkMouthLoop, { toValue: 0.75, duration: 110, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(talkMouthLoop, { toValue: 0.05, duration: 170, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.delay(150),
      ])
    );

    // Eye talking animation (expressive brow bobs, squints & talk emphasis)
    const eyeAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(talkEyeLoop, { toValue: 1, duration: 180, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
        Animated.delay(220),
        Animated.timing(talkEyeLoop, { toValue: -0.6, duration: 160, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.delay(180),
        Animated.timing(talkEyeLoop, { toValue: 0.45, duration: 150, easing: Easing.out(Easing.sin), useNativeDriver: true }),
        Animated.timing(talkEyeLoop, { toValue: 0, duration: 200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.delay(280),
      ])
    );

    // Pupil glance (attentive micro-glances during speech)
    const pupilAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pupilShift, { toValue: 1, duration: 260, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.delay(400),
        Animated.timing(pupilShift, { toValue: -0.8, duration: 240, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.delay(350),
        Animated.timing(pupilShift, { toValue: 0, duration: 200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.delay(480),
      ])
    );

    mouthAnim.start();
    eyeAnim.start();
    pupilAnim.start();

    // After 4.2s of speech, gently settle into resting smile
    const timer = setTimeout(() => {
      mouthAnim.stop();
      eyeAnim.stop();
      pupilAnim.stop();
      Animated.parallel([
        Animated.timing(talkMouthLoop, { toValue: 0, duration: 240, useNativeDriver: true }),
        Animated.timing(talkEyeLoop, { toValue: 0, duration: 240, useNativeDriver: true }),
        Animated.timing(pupilShift, { toValue: 0, duration: 240, useNativeDriver: true }),
      ]).start();
    }, 4400);

    // Autonomous Waiting Loop Cycle:
    // 1. Sitting patiently & breathing (~8.0s)
    // 2. Taking a little break / glancing (~3.5s)
    // 3. Perks up to say Hi! (waving paw + sparkles + mouth smile, ~3.8s)
    // 4. Studio Director pose on vest (~3.5s)
    // 5. Settles back down into cozy sit!
    let loopTimeout = null;
    let settleTimer = null;
    let wIdx = 0;

    const waitingSequence = [
      { pose: 'sit', perky: false, duration: 7500, action: 'rest' },
      { pose: 'sit', perky: true,  duration: 4000, action: 'curious' }, // 🦊 Curious Fox Animal Behavior: Inquisitive Head-Tilt + Sniffing Nose
      { pose: 'wave', perky: true, duration: 3800, action: 'sayHi' },
      { pose: 'vest', perky: false, duration: 3500, action: 'director' },
    ];

    const runWaitingStep = () => {
      const current = waitingSequence[wIdx];
      transitionToPose(current.pose, current.perky);

      if (current.action === 'curious') {
        // 🦊 Classic Curious Fox Animal Behavior: Inquisitive Head-Tilt + Sniffing Nose + Curious Glance
        Animated.parallel([
          Animated.sequence([
            Animated.timing(headTilt, { toValue: 1, duration: 320, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }),
            Animated.delay(2600),
            Animated.timing(headTilt, { toValue: 0, duration: 350, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.delay(300),
            Animated.timing(sniffLoop, { toValue: 1, duration: 90, useNativeDriver: true }),
            Animated.timing(sniffLoop, { toValue: 0, duration: 90, useNativeDriver: true }),
            Animated.timing(sniffLoop, { toValue: 1, duration: 85, useNativeDriver: true }),
            Animated.timing(sniffLoop, { toValue: 0, duration: 85, useNativeDriver: true }),
            Animated.timing(sniffLoop, { toValue: 1, duration: 90, useNativeDriver: true }),
            Animated.timing(sniffLoop, { toValue: 0, duration: 110, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.delay(350),
            Animated.timing(pupilShift, { toValue: 1, duration: 250, useNativeDriver: true }),
            Animated.delay(1200),
            Animated.timing(pupilShift, { toValue: -0.8, duration: 250, useNativeDriver: true }),
            Animated.delay(800),
            Animated.timing(pupilShift, { toValue: 0, duration: 200, useNativeDriver: true }),
          ]),
        ]).start();
      } else if (current.action === 'sayHi') {
        // Friendly mouth smile & chatter
        Animated.sequence([
          Animated.timing(talkMouthLoop, { toValue: 0.85, duration: 110, useNativeDriver: true }),
          Animated.timing(talkMouthLoop, { toValue: 0.18, duration: 90, useNativeDriver: true }),
          Animated.timing(talkMouthLoop, { toValue: 0.65, duration: 110, useNativeDriver: true }),
          Animated.timing(talkMouthLoop, { toValue: 0, duration: 160, useNativeDriver: true }),
        ]).start();
      }

      loopTimeout = setTimeout(() => {
        wIdx = (wIdx + 1) % waitingSequence.length;
        runWaitingStep();
      }, current.duration);
    };

    if (message) {
      // Perks up to greet with wave & perky tail while speaking
      transitionToPose('wave', true);
      settleTimer = setTimeout(() => {
        // Smoothly settles back down into cozy sitting posture while waiting
        transitionToPose('sit', false);
        // Start autonomous loop from first break after sitting
        loopTimeout = setTimeout(() => {
          runWaitingStep();
        }, 2000);
      }, 3800);
    } else {
      transitionToPose('sit', false);
      runWaitingStep();
    }

    return () => {
      mouthAnim.stop();
      eyeAnim.stop();
      pupilAnim.stop();
      headTilt.setValue(0);
      sniffLoop.setValue(0);
      clearTimeout(timer);
      if (settleTimer) clearTimeout(settleTimer);
      if (loopTimeout) clearTimeout(loopTimeout);
    };
  }, [message, talkMouthLoop, talkEyeLoop, pupilShift, headTilt, sniffLoop]);

  // Tap handler with subtle cushion, friendly wave response, and chatter
  const handlePress = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    headTilt.setValue(0);
    sniffLoop.setValue(0);
    Animated.sequence([
      Animated.timing(pressSquash, { toValue: 0.94, duration: 100, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(pressSquash, { toValue: 1, friction: 6, tension: 140, useNativeDriver: true }),
    ]).start();

    // Re-open speech bubble with full 7.5s timer
    showBubble(7500);

    // Immediately wake up into high friendly wave & chatter
    transitionToPose('wave', true);
    setTimeout(() => {
      transitionToPose('sit', false);
    }, 4200);

    // Trigger instant gentle chatty response from mouth
    Animated.sequence([
      Animated.timing(talkMouthLoop, { toValue: 0.85, duration: 100, useNativeDriver: true }),
      Animated.timing(talkMouthLoop, { toValue: 0.2, duration: 90, useNativeDriver: true }),
      Animated.timing(talkMouthLoop, { toValue: 0.65, duration: 100, useNativeDriver: true }),
      Animated.timing(talkMouthLoop, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start();

    onMascotPress?.();
  };

  // ── Scale & Proportions ──
  const scale = size / 190;
  const width = size;
  const height = (size * 220) / 190;
  const flip = direction === 'left' ? -1 : 1;

  // ── Derived Motion Interpolations ──
  // Torso bounce
  const bodyBob = cadenceLoop.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: isRun ? [0, -12, 0, -12, 0] : isWalk ? [0, -6, 0, -6, 0] : [0, -2.5, 0, -2.5, 0],
  });

  // Waddle side-to-side tilt
  const bodyWaddle = cadenceLoop.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: isRun ? ['0deg', '5deg', '0deg', '-5deg', '0deg'] : isWalk ? ['0deg', '3.5deg', '0deg', '-3.5deg', '0deg'] : ['0deg', '1deg', '0deg', '-1deg', '0deg'],
  });

  // Running forward athletic lean
  const forwardLean = isRun ? '11deg' : '0deg';

  // Left & Right Foot Motion (Alternating 180° out of phase)
  const leftFootY = cadenceLoop.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: isRun ? [0, -14, 0, 3, 0] : isWalk ? [0, -8, 0, 2, 0] : [0, -1, 0, 0, 0],
  });
  const leftFootRot = cadenceLoop.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: isRun ? ['0deg', '-14deg', '0deg', '6deg', '0deg'] : isWalk ? ['0deg', '-8deg', '0deg', '4deg', '0deg'] : ['0deg', '0deg', '0deg', '0deg', '0deg'],
  });

  const rightFootY = cadenceLoop.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: isRun ? [0, 3, 0, -14, 0] : isWalk ? [0, 2, 0, -8, 0] : [0, 0, 0, -1, 0],
  });
  const rightFootRot = cadenceLoop.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: isRun ? ['0deg', '6deg', '0deg', '-14deg', '0deg'] : isWalk ? ['0deg', '4deg', '0deg', '-8deg', '0deg'] : ['0deg', '0deg', '0deg', '0deg', '0deg'],
  });

  // Tail rotation: combines dynamic base angle (relaxed low vs perky up) + swish loop
  const tailTotalRot = Animated.add(
    tailBaseAngle,
    tailLoop.interpolate({
      inputRange: [-1, 0, 1],
      outputRange: isWalk ? [-10, 0, 10] : [-5, 0, 5],
    })
  ).interpolate({
    inputRange: [-50, 70],
    outputRange: ['-50deg', '70deg'],
  });

  // Left arm swing
  const leftArmRotate = cadenceLoop.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: isWalk ? ['-12deg', '12deg', '-12deg'] : ['-4deg', '4deg', '-4deg'],
  });

  // Right arm down natural swing (opposes left arm)
  const rightArmRotateDown = cadenceLoop.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: isWalk ? ['12deg', '-12deg', '12deg'] : ['4deg', '-4deg', '4deg'],
  });

  // Right arm / waving paw motion (up high)
  const rightArmWave = waveLoop.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-24deg', '0deg', '26deg'],
  });

  // Right arm on vest lapel (subtle breathing bob)
  const rightArmVest = cadenceLoop.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '2deg', '0deg'],
  });

  // Ear twitches
  const leftEarRot = earLoop.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-6deg', '0deg', '8deg'],
  });
  const rightEarRot = earLoop.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['6deg', '0deg', '-8deg'],
  });

  // Head bob
  const headBob = cadenceLoop.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: isRun ? [0, -3.5, 0] : isWalk ? [0, -2, 0] : [0, -1, 0],
  });

  // Shadow scale with feet lift
  const shadowScale = cadenceLoop.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [1, 0.88, 1, 0.88, 1],
  });

  // ── Talking Mouth & Expressive Eye Motion Interpolations ──
  const mouthTalkScaleY = talkMouthLoop.interpolate({
    inputRange: [0, 1, 1.2],
    outputRange: [0.18, 0.85, 1.0],
  });
  const mouthTalkScaleX = talkMouthLoop.interpolate({
    inputRange: [0, 0.5, 1, 1.2],
    outputRange: [1.0, 0.94, 1.02, 1.06],
  });

  const browBob = talkEyeLoop.interpolate({
    inputRange: [-1, 0, 1, 1.2],
    outputRange: [0.6, 0, -1.0, -1.4],
  });
  const browTiltLeft = talkEyeLoop.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-2deg', '0deg', '3deg'],
  });
  const browTiltRight = talkEyeLoop.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['2deg', '0deg', '-3deg'],
  });
  const eyeTalkScaleY = talkEyeLoop.interpolate({
    inputRange: [-1, 0, 1, 1.2],
    outputRange: [0.94, 1.0, 1.04, 1.06],
  });
  const pupilShiftX = pupilShift.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-0.6, 0, 0.6],
  });
  const pupilShiftY = pupilShift.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-0.4, 0, 0.4],
  });

  // ── Sitting Posture Offsets & Breathing Motion ──
  const sitDrop = sitProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 8 * scale],
  });
  const sitBreathe = breathingLoop.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -1.8 * scale],
  });
  const totalTorsoY = Animated.add(Animated.add(bodyBob, sitDrop), sitBreathe);
  const totalHeadY  = Animated.add(Animated.add(Animated.add(bodyBob, headBob), sitDrop), sitBreathe);
  const standingLegsOpacity = sitProgress.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [1, 0.2, 0],
  });

  // ── Curious Fox Animal Behavior (Head-Tilt & Sniff) ──
  const headTiltAngle = headTilt.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-14deg', '0deg', '14deg'],
  });
  const sniffOffset = sniffLoop.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -2.2],
  });

  return (
    <View style={[styles.root, style]}>
      {/* ── Contextual Speech Bubble (Auto-hiding with touch protection) ── */}
      {Boolean(message) && bubbleVisible && (
        <Animated.View
          style={[
            styles.bubble,
            direction === 'right' ? { left: -6 } : { right: -6 },
            {
              backgroundColor: isDark ? 'rgba(24, 21, 28, 0.97)' : 'rgba(255, 255, 255, 0.98)',
              borderColor: colors.gold.borderLight,
              shadowColor: colors.gold.DEFAULT,
              opacity: bubbleAnim,
              transform: [
                { scale: bubbleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
                { translateY: bubbleAnim.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) },
              ],
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.96}
            onPressIn={() => {
              isInteractingWithBubble.current = true;
              if (autoHideTimer.current) clearTimeout(autoHideTimer.current);
            }}
            onPressOut={() => {
              isInteractingWithBubble.current = false;
              showBubble(7000);
            }}
            onPress={() => {
              showBubble(7000);
            }}
          >
            <View style={styles.bubbleRow}>
              {emoji ? (
                <Text style={styles.bubbleEmoji}>{emoji}</Text>
              ) : (
                <Sparkles size={12} color={colors.gold.light} style={{ marginTop: 2 }} />
              )}
              <Text style={[styles.bubbleText, { color: colors.text.primary }]}>
                {message}
              </Text>
            </View>
          </TouchableOpacity>
          <View
            style={[
              styles.bubbleArrow,
              direction === 'right' ? { left: 32 } : { right: 32 },
              {
                backgroundColor: isDark ? 'rgba(24, 21, 28, 0.97)' : 'rgba(255, 255, 255, 0.98)',
                borderColor: colors.gold.borderLight,
              },
            ]}
          />
        </Animated.View>
      )}

      {/* ── Compact Whisper Chip when Speech Bubble is Auto-Hidden ── */}
      {Boolean(message) && !bubbleVisible && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            showBubble(7500);
            handlePress();
          }}
          style={[
            styles.whisperChip,
            direction === 'right' ? { left: 2 } : { right: 2 },
            {
              backgroundColor: isDark ? 'rgba(24, 21, 28, 0.92)' : 'rgba(255, 252, 244, 0.96)',
              borderColor: colors.gold.DEFAULT,
            },
          ]}
        >
          <Text style={styles.whisperEmoji}>👋</Text>
          <Text style={[styles.whisperText, { color: isDark ? colors.gold.light : colors.gold.dark }]}>
            Say hi to E-Kodak
          </Text>
        </TouchableOpacity>
      )}

      {/* ── Floating Waving Sparkles (Only twinkle when waving paw is raised) ── */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.sparkleCluster,
          direction === 'right' ? { right: -6 } : { left: -6 },
          {
            opacity: armWaveOpacity,
            transform: [{ scale: sparklePop }],
          },
        ]}
      >
        <Text style={styles.sparkleEmoji}>✨</Text>
      </Animated.View>

      {/* ── Mascot Container (Fully Articulated Body Parts) ── */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePress}
        style={{ width, height }}
      >
        <Animated.View
          style={[
            styles.canvas,
            {
              width,
              height,
              transform: [
                { scaleX: flip },
                { scale: pressSquash },
                { rotate: forwardLean },
              ],
            },
          ]}
        >
          {/* 1. Ground Drop Shadow */}
          <Animated.View
            style={[
              styles.partLayer,
              {
                left: 36 * scale,
                top: 200 * scale,
                width: 118 * scale,
                height: 16 * scale,
                transform: [{ scaleX: shadowScale }],
              },
            ]}
          >
            <Svg width="100%" height="100%" viewBox="0 0 118 16">
              <Ellipse cx="59" cy="8" rx="54" ry="6.5" fill="rgba(0, 0, 0, 0.28)" />
              <Ellipse cx="59" cy="8" rx="34" ry="3.5" fill="rgba(217, 180, 108, 0.22)" />
            </Svg>
          </Animated.View>

          {/* 2. Fluffy Fox Tail (Swishing Layer with Dynamic Angle) */}
          <Animated.View
            style={[
              styles.partLayer,
              {
                left: 112 * scale,
                top: 92 * scale,
                width: 72 * scale,
                height: 82 * scale,
                transform: [
                  { translateY: 38 * scale },
                  { rotate: tailTotalRot },
                  { translateY: -38 * scale },
                ],
              },
            ]}
          >
            <Svg width="100%" height="100%" viewBox="0 0 72 82">
              <Defs>
                <SvgLinearGradient id="tailAmber" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0%" stopColor="#FFA62B" />
                  <Stop offset="50%" stopColor="#F28C38" />
                  <Stop offset="100%" stopColor="#D44928" />
                </SvgLinearGradient>
                <SvgLinearGradient id="tailIvory" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#FFFFFF" />
                  <Stop offset="100%" stopColor="#F9EEDB" />
                </SvgLinearGradient>
              </Defs>
              <Path
                d="M6 72 C36 68 66 40 62 12 C58 -4 38 4 26 22 C18 34 10 52 6 72 Z"
                fill="url(#tailAmber)"
                stroke="rgba(217, 180, 108, 0.35)"
                strokeWidth="1.2"
              />
              <Path
                d="M62 12 C58 -4 38 4 34 16 C40 18 48 15 52 24 C58 22 61 18 62 12 Z"
                fill="url(#tailIvory)"
              />
            </Svg>
          </Animated.View>

          {/* 3. Left Leg & Paw (Stepping & Running) */}
          <Animated.View
            style={[
              styles.partLayer,
              {
                opacity: standingLegsOpacity,
                left: 66 * scale,
                top: 186 * scale,
                width: 20 * scale,
                height: 24 * scale,
                transform: [
                  { translateY: leftFootY },
                  { rotate: leftFootRot },
                ],
              },
            ]}
          >
            <Svg width="100%" height="100%" viewBox="0 0 20 24">
              <Defs>
                <SvgLinearGradient id="footIvory" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#FFFFFF" />
                  <Stop offset="100%" stopColor="#F9EEDB" />
                </SvgLinearGradient>
              </Defs>
              <Path
                d="M2 2 C2 -5 15 -5 17 2 L18 16 C18 20 2 20 2 16 Z"
                fill="url(#footIvory)"
                stroke="#251A10"
                strokeWidth="1"
              />
            </Svg>
          </Animated.View>

          {/* 4. Right Leg & Paw (Stepping & Running Alternating) */}
          <Animated.View
            style={[
              styles.partLayer,
              {
                opacity: standingLegsOpacity,
                left: 104 * scale,
                top: 186 * scale,
                width: 20 * scale,
                height: 24 * scale,
                transform: [
                  { translateY: rightFootY },
                  { rotate: rightFootRot },
                ],
              },
            ]}
          >
            <Svg width="100%" height="100%" viewBox="0 0 20 24">
              <Path
                d="M2 2 C2 -5 15 -5 17 2 L18 16 C18 20 2 20 2 16 Z"
                fill="#FFFDF8"
                stroke="#251A10"
                strokeWidth="1"
              />
            </Svg>
          </Animated.View>

          {/* 3B & 4B. Sitting Fox Folded Haunches & Front Paws (Cozy Waiting Pose) */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.partLayer,
              {
                left: 50 * scale,
                top: 172 * scale,
                width: 90 * scale,
                height: 38 * scale,
                opacity: sitProgress,
                transform: [
                  { translateY: sitBreathe },
                ],
              },
            ]}
          >
            <Svg width="100%" height="100%" viewBox="0 0 90 38">
              <Defs>
                <SvgLinearGradient id="sitPawsAmber" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0%" stopColor="#FFA62B" />
                  <Stop offset="50%" stopColor="#F28C38" />
                  <Stop offset="100%" stopColor="#D44928" />
                </SvgLinearGradient>
                <SvgLinearGradient id="pawIvory" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#FFFFFF" />
                  <Stop offset="100%" stopColor="#F9EEDB" />
                </SvgLinearGradient>
              </Defs>
              {/* Left & Right Curved Sitting Thighs / Haunches */}
              <Path
                d="M8 26 C2 26 0 14 12 8 C22 2 30 14 28 28 C26 34 14 34 8 26 Z"
                fill="url(#sitPawsAmber)"
                stroke="#251A10"
                strokeWidth="1"
              />
              <Path
                d="M82 26 C88 26 90 14 78 8 C68 2 60 14 62 28 C64 34 76 34 82 26 Z"
                fill="url(#sitPawsAmber)"
                stroke="#251A10"
                strokeWidth="1"
              />

              {/* Left & Right Amber Forelegs extending down from chest */}
              <Path d="M28 2 L38 2 L36 28 L28 28 Z" fill="url(#sitPawsAmber)" />
              <Path d="M52 2 L62 2 L62 28 L54 28 Z" fill="url(#sitPawsAmber)" />

              {/* Front Resting Paws nestled neatly side-by-side */}
              <Ellipse cx="33" cy="29" rx="8" ry="6.5" fill="url(#pawIvory)" stroke="#251A10" strokeWidth="1" />
              <Ellipse cx="57" cy="29" rx="8" ry="6.5" fill="url(#pawIvory)" stroke="#251A10" strokeWidth="1" />
              {/* Paw Toe Separators */}
              <Line x1="30" y1="26" x2="30" y2="33" stroke="#CBB494" strokeWidth="0.8" />
              <Line x1="35" y1="26" x2="35" y2="33" stroke="#CBB494" strokeWidth="0.8" />
              <Line x1="55" y1="26" x2="55" y2="33" stroke="#CBB494" strokeWidth="0.8" />
              <Line x1="60" y1="26" x2="60" y2="33" stroke="#CBB494" strokeWidth="0.8" />
            </Svg>
          </Animated.View>

          {/* 5. Torso, Chest Bib & Director Vest (Bobbing & Waddling) */}
          <Animated.View
            style={[
              styles.partLayer,
              {
                left: 60 * scale,
                top: 122 * scale,
                width: 70 * scale,
                height: 74 * scale,
                transform: [
                  { translateY: totalTorsoY },
                  { rotate: bodyWaddle },
                ],
              },
            ]}
          >
            <Svg width="100%" height="100%" viewBox="0 0 70 74">
              <Defs>
                <SvgLinearGradient id="bodyAmber" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0%" stopColor="#FFA62B" />
                  <Stop offset="50%" stopColor="#F28C38" />
                  <Stop offset="100%" stopColor="#D44928" />
                </SvgLinearGradient>
                <SvgLinearGradient id="bodyIvory" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#FFFFFF" />
                  <Stop offset="100%" stopColor="#F9EEDB" />
                </SvgLinearGradient>
                <SvgLinearGradient id="directorVest" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#30261D" />
                  <Stop offset="50%" stopColor="#221A13" />
                  <Stop offset="100%" stopColor="#15100B" />
                </SvgLinearGradient>
                <SvgLinearGradient id="goldZipper" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0%" stopColor="#FFF1D6" />
                  <Stop offset="50%" stopColor="#D9B46C" />
                  <Stop offset="100%" stopColor="#966D1B" />
                </SvgLinearGradient>
              </Defs>

              {/* Fox Amber Body */}
              <Path
                d="M8 8 C8 -2 62 -2 62 8 L66 66 C66 72 4 72 4 66 Z"
                fill="url(#bodyAmber)"
              />

              {/* White Chest Bib */}
              <Path
                d="M22 6 C30 24 40 24 48 6 L42 42 C38 46 32 46 28 42 Z"
                fill="url(#bodyIvory)"
              />

              {/* Atelier Director Vest */}
              <Path
                d="M6 8 L22 8 L35 38 L48 8 L64 8 L66 66 L42 66 L42 42 L28 42 L28 66 L4 66 Z"
                fill="url(#directorVest)"
                stroke="rgba(217, 180, 108, 0.45)"
                strokeWidth="1.2"
              />

              {/* Vest Zipper */}
              <Line x1="35" y1="42" x2="35" y2="66" stroke="url(#goldZipper)" strokeWidth="1.5" />
              <Circle cx="35" cy="44" r="2.2" fill="url(#goldZipper)" />

              {/* Gold Studio Director Lanyard Badge */}
              <Path d="M26 8 L46 30" stroke="url(#goldZipper)" strokeWidth="1" strokeDasharray="2,2" />
              <Rect x="44" y="28" width="11" height="14" rx="2" fill="#FFFDF8" stroke="url(#goldZipper)" strokeWidth="0.9" />
              <Line x1="46" y1="32" x2="52" y2="32" stroke="#251A10" strokeWidth="0.8" />
              <Line x1="46" y1="35" x2="50" y2="35" stroke="#D9B46C" strokeWidth="0.8" />
            </Svg>
          </Animated.View>

          {/* 6. Left Arm (Natural swing) */}
          <Animated.View
            style={[
              styles.partLayer,
              {
                left: 46 * scale,
                top: 128 * scale,
                width: 26 * scale,
                height: 48 * scale,
                transform: [
                  { translateY: totalTorsoY },
                  { rotate: leftArmRotate },
                ],
              },
            ]}
          >
            <Svg width="100%" height="100%" viewBox="0 0 26 48">
              <Path
                d="M16 2 C6 14 4 30 8 40 C12 46 20 44 22 38 C20 30 22 18 26 6 Z"
                fill="#F28C38"
              />
              <Circle cx="12" cy="40" r="6" fill="#FFFDF8" stroke="#251A10" strokeWidth="0.8" />
            </Svg>
          </Animated.View>

          {/* 7A. Right Arm — Down at Side (Natural Walk & Stroll Pose) */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.partLayer,
              {
                left: 114 * scale,
                top: 128 * scale,
                width: 26 * scale,
                height: 48 * scale,
                opacity: armDownOpacity,
                transform: [
                  { translateY: totalTorsoY },
                  { rotate: rightArmRotateDown },
                ],
              },
            ]}
          >
            <Svg width="100%" height="100%" viewBox="0 0 26 48">
              {/* Fox Amber Arm Down */}
              <Path
                d="M10 2 C20 14 22 30 18 40 C14 46 6 44 4 38 C6 30 4 18 0 6 Z"
                fill="#F28C38"
              />
              <Circle cx="14" cy="40" r="6" fill="#FFFDF8" stroke="#251A10" strokeWidth="0.8" />
            </Svg>
          </Animated.View>

          {/* 7B. Right Arm — On Vest Lapel (Studio Director / Thinking Companion Pose) */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.partLayer,
              {
                left: 104 * scale,
                top: 124 * scale,
                width: 36 * scale,
                height: 44 * scale,
                opacity: armVestOpacity,
                transform: [
                  { translateY: totalTorsoY },
                  { rotate: rightArmVest },
                ],
              },
            ]}
          >
            <Svg width="100%" height="100%" viewBox="0 0 36 44">
              {/* Arm resting paw gently on vest */}
              <Path
                d="M30 4 C30 16 24 26 14 30 C8 32 4 28 6 24 C14 22 20 16 22 4 Z"
                fill="#F28C38"
              />
              <Circle cx="8" cy="26" r="5.8" fill="#FFFDF8" stroke="#251A10" strokeWidth="0.8" />
            </Svg>
          </Animated.View>

          {/* 7C. Right Arm — Raised Waving Paw (Occasional Friendly Greeting Pose) */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.partLayer,
              {
                left: 114 * scale,
                top: 76 * scale,
                width: 50 * scale,
                height: 64 * scale,
                opacity: armWaveOpacity,
                transform: [
                  { translateY: totalTorsoY },
                  { rotate: rightArmWave },
                ],
              },
            ]}
          >
            <Svg width="100%" height="100%" viewBox="0 0 50 64">
              <Defs>
                <SvgLinearGradient id="armGold" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0%" stopColor="#FFF1D6" />
                  <Stop offset="50%" stopColor="#D9B46C" />
                  <Stop offset="100%" stopColor="#966D1B" />
                </SvgLinearGradient>
              </Defs>
              <G>
                <Path
                  d="M4 56 C16 44 28 28 32 14 C36 8 28 4 22 10 C16 18 10 34 6 52 Z"
                  fill="#F28C38"
                />
                <Circle cx="30" cy="12" r="7.2" fill="#FFFDF8" stroke="#251A10" strokeWidth="0.9" />
                <Path d="M40 4 Q44 12 40 20" stroke="url(#armGold)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                <Path d="M46 6 Q50 12 46 18" stroke="url(#armGold)" strokeWidth="1.2" strokeLinecap="round" fill="none" />
              </G>
            </Svg>
          </Animated.View>

          {/* 8. Head, Ears & Expressive Face (With Ear Twitches & Eye Blinking) */}
          <Animated.View
            style={[
              styles.partLayer,
              {
                left: 38 * scale,
                top: 14 * scale,
                width: 114 * scale,
                height: 116 * scale,
                transform: [
                  { translateY: totalHeadY },
                  { rotate: headTiltAngle },
                ],
              },
            ]}
          >
            {/* Left Ear Twitch Container */}
            <Animated.View
              style={[
                styles.partLayer,
                {
                  left: 6 * scale,
                  top: 0,
                  width: 44 * scale,
                  height: 48 * scale,
                  transform: [{ rotate: leftEarRot }],
                },
              ]}
            >
              <Svg width="100%" height="100%" viewBox="0 0 44 48">
                <Path
                  d="M32 44 L6 4 C13 0 42 22 43 40 Z"
                  fill="#F28C38"
                  stroke="#D9B46C"
                  strokeWidth="1"
                />
                <Path d="M30 38 L12 10 C18 8 36 24 37 34 Z" fill="#F8C7CD" opacity="0.9" />
              </Svg>
            </Animated.View>

            {/* Right Ear Twitch Container */}
            <Animated.View
              style={[
                styles.partLayer,
                {
                  left: 64 * scale,
                  top: 0,
                  width: 44 * scale,
                  height: 48 * scale,
                  transform: [{ rotate: rightEarRot }],
                },
              ]}
            >
              <Svg width="100%" height="100%" viewBox="0 0 44 48">
                <Path
                  d="M12 44 L38 4 C31 0 2 22 1 40 Z"
                  fill="#F28C38"
                  stroke="#D9B46C"
                  strokeWidth="1"
                />
                <Path d="M14 38 L32 10 C26 8 8 24 7 34 Z" fill="#F8C7CD" opacity="0.9" />
              </Svg>
            </Animated.View>

            {/* Head Base, Cheeks, Nose & Mouth */}
            <Svg width="100%" height="100%" viewBox="0 0 114 116">
              <Defs>
                <SvgLinearGradient id="hAmber" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0%" stopColor="#FFA62B" />
                  <Stop offset="50%" stopColor="#F28C38" />
                  <Stop offset="100%" stopColor="#D44928" />
                </SvgLinearGradient>
              </Defs>

              {/* Head Silhouette */}
              <Path
                d="M20 72 C17 48 38 36 57 36 C76 36 97 48 94 72 C104 82 98 102 80 102 C68 112 46 112 34 102 C16 102 10 82 20 72 Z"
                fill="url(#hAmber)"
              />

              {/* White Fluffy Cheeks */}
              <Path
                d="M20 72 C23 90 36 100 51 98 C46 92 44 84 46 74 C36 72 26 70 20 72 Z"
                fill="#FFFDF8"
              />
              <Path
                d="M94 72 C91 90 78 100 63 98 C68 92 70 84 68 74 C78 72 88 70 94 72 Z"
                fill="#FFFDF8"
              />

              {/* Muzzle */}
              <Ellipse cx="57" cy="83" rx="14" ry="10" fill="#FFFDF8" />

              {/* Rosy Cheeks */}
              <Ellipse cx="34" cy="76" rx="5" ry="3" fill="rgba(248, 140, 160, 0.45)" />
              <Ellipse cx="80" cy="76" rx="5" ry="3" fill="rgba(248, 140, 160, 0.45)" />
            </Svg>

            {/* ── Cute Animal Sniffing Nose (Twitches naturally during curious break) ── */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.partLayer,
                {
                  left: 51 * scale,
                  top: 74 * scale,
                  width: 12 * scale,
                  height: 10 * scale,
                  transform: [{ translateY: sniffOffset }],
                },
              ]}
            >
              <Svg width="100%" height="100%" viewBox="0 0 12 10">
                <Path
                  d="M2 3 C2 1 10 1 10 3 C10 6 6 8 6 8 C6 8 2 6 2 3 Z"
                  fill="#251A10"
                />
                <Circle cx="4.5" cy="2.5" r="0.9" fill="#FFFFFF" />
              </Svg>
            </Animated.View>

            {/* ── Expressive Eyes & Eyebrows (Both Left & Right Eyes in Unified Face Layer) ── */}
            <Animated.View
              style={[
                styles.partLayer,
                {
                  left: 22 * scale,
                  top: 50 * scale,
                  width: 70 * scale,
                  height: 32 * scale,
                  transform: [
                    { translateY: Animated.add(browBob, pupilShiftY) },
                    { scaleY: eyeTalkScaleY },
                    { translateX: pupilShiftX },
                  ],
                },
              ]}
            >
              <Svg width="100%" height="100%" viewBox="0 0 70 32">
                {/* ── Left Eyebrow (Delicate & Soft) ── */}
                <Path d="M14 10 Q20 7.5 26 10" stroke="#7A320C" strokeWidth="1.2" strokeLinecap="round" fill="none" />

                {/* ── Right Eyebrow (Delicate & Soft) ── */}
                <Path d="M44 10 Q50 7.5 56 10" stroke="#7A320C" strokeWidth="1.2" strokeLinecap="round" fill="none" />

                {/* ── Left Eye (Cute Cartoon Fox Button Eye) ── */}
                <G>
                  <Circle cx="20" cy="18" r="5.0" fill="#251A10" />
                  <Circle cx="18.5" cy="16.5" r="1.8" fill="#FFFFFF" />
                  <Circle cx="21.8" cy="19.8" r="0.9" fill="#FFFFFF" />
                </G>

                {/* ── Right Eye (Cute Cartoon Fox Button Eye) ── */}
                <G>
                  <Circle cx="50" cy="18" r="5.0" fill="#251A10" />
                  <Circle cx="48.5" cy="16.5" r="1.8" fill="#FFFFFF" />
                  <Circle cx="51.8" cy="19.8" r="0.9" fill="#FFFFFF" />
                </G>
              </Svg>
            </Animated.View>

            {/* ── Articulated Talking Mouth (Open/Close Flap, Pink Tongue & Teeth) ── */}
            <Animated.View
              style={[
                styles.partLayer,
                {
                  left: 45 * scale,
                  top: 80 * scale,
                  width: 24 * scale,
                  height: 18 * scale,
                  transform: [
                    { scaleY: mouthTalkScaleY },
                    { scaleX: mouthTalkScaleX },
                  ],
                },
              ]}
            >
              <Svg width="100%" height="100%" viewBox="0 0 24 18">
                {/* Oral Cavity Background */}
                <Path
                  d="M3 4 Q12 18 21 4 Q12 7.5 3 4 Z"
                  fill="#661010"
                />
                {/* Articulated Cute Pink Tongue */}
                <Path
                  d="M6 10 Q12 6.5 18 10 Q12 17 6 10 Z"
                  fill="#FF7E94"
                />
                {/* Cute Front Tooth Highlight */}
                <Path
                  d="M9 4.2 Q12 6.2 15 4.2 Z"
                  fill="#FFFFFF"
                />
                {/* Upper Smile Lip Curve */}
                <Path
                  d="M3 4 Q12 8.5 21 4"
                  stroke="#251A10"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  fill="none"
                />
              </Svg>
            </Animated.View>

            {/* Blinking Eyelids (Simulated with Animated Layer) */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.partLayer,
                {
                  left: 22 * scale,
                  top: 50 * scale,
                  width: 70 * scale,
                  height: 32 * scale,
                  opacity: blinkLoop,
                },
              ]}
            >
              <Svg width="100%" height="100%" viewBox="0 0 70 32">
                {/* Left Eyelid skin cover & closed happy lash */}
                <Ellipse cx="20" cy="18" rx="5.4" ry="5.4" fill="#F28C38" />
                <Path d="M15 18 Q20 22 25 18" stroke="#251A10" strokeWidth="1.6" strokeLinecap="round" fill="none" />
                {/* Right Eyelid skin cover & closed happy lash */}
                <Ellipse cx="50" cy="18" rx="5.4" ry="5.4" fill="#F28C38" />
                <Path d="M45 18 Q50 22 55 18" stroke="#251A10" strokeWidth="1.6" strokeLinecap="round" fill="none" />
              </Svg>
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  canvas: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  partLayer: {
    position: 'absolute',
  },
  bubble: {
    position: 'absolute',
    bottom: '104%',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: Radius.xl,
    borderWidth: 1.2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 12,
    zIndex: 30,
    minWidth: 190,
    maxWidth: 275,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
  },
  bubbleEmoji: {
    fontSize: 16,
    lineHeight: 18,
    marginTop: 1,
  },
  bubbleText: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 11.5,
    lineHeight: 16.5,
    letterSpacing: 0.15,
    flex: 1,
    flexShrink: 1,
  },
  bubbleArrow: {
    position: 'absolute',
    bottom: -5,
    width: 9,
    height: 9,
    transform: [{ rotate: '45deg' }],
    borderBottomWidth: 1.2,
    borderRightWidth: 1.2,
  },
  whisperChip: {
    position: 'absolute',
    bottom: '102%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4.5,
    paddingHorizontal: 9,
    borderRadius: Radius.full,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 6,
    zIndex: 25,
  },
  whisperEmoji: {
    fontSize: 12,
  },
  whisperText: {
    fontFamily: Typography.fontBodySemi,
    fontSize: 10.5,
    letterSpacing: 0.2,
  },
  sparkleCluster: {
    position: 'absolute',
    top: -12,
    zIndex: 15,
  },
  sparkleEmoji: {
    fontSize: 16,
  },
});
