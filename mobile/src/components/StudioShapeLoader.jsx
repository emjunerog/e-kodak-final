import React, { useEffect, useState } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Circle, Rect, Path } from 'react-native-svg';

/**
 * StudioShapeLoader
 * Pure geometric E-Kodak load & reload animation — zero text, just shapes.
 * Uses rotating shutter rings, counter-rotating aperture frame, and staggered pulsing dots.
 */
export default function StudioShapeLoader({
  size = 44,
  isDark = false,
  ringColor,
  accentColor,
}) {
  const [spinOuter] = useState(() => new Animated.Value(0));
  const [spinInner] = useState(() => new Animated.Value(0));
  const [pulseA] = useState(() => new Animated.Value(0.45));
  const [pulseB] = useState(() => new Animated.Value(0.45));
  const [pulseC] = useState(() => new Animated.Value(0.45));

  useEffect(() => {
    const outerLoop = Animated.loop(
      Animated.timing(spinOuter, {
        toValue: 1,
        duration: 2400,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    const innerLoop = Animated.loop(
      Animated.timing(spinInner, {
        toValue: 1,
        duration: 1800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    const makePulse = (val, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, {
            toValue: 1,
            duration: 420,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0.35,
            duration: 420,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

    const p1 = makePulse(pulseA, 0);
    const p2 = makePulse(pulseB, 140);
    const p3 = makePulse(pulseC, 280);

    outerLoop.start();
    innerLoop.start();
    p1.start();
    p2.start();
    p3.start();

    return () => {
      outerLoop.stop();
      innerLoop.stop();
      p1.stop();
      p2.stop();
      p3.stop();
    };
  }, [spinOuter, spinInner, pulseA, pulseB, pulseC]);

  const outerRotate = spinOuter.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const innerRotate = spinInner.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  const goldColor = ringColor || (isDark ? '#E6C47E' : '#C7962D');
  const mistColor = accentColor || (isDark ? '#9BB6DA' : '#5D7AA3');
  const blushColor = accentColor || (isDark ? '#E8C4B2' : '#D99B72');

  const frameStyle = { width: size, height: size };
  const innerSize = Math.round(size * 0.66);
  const dotSize = Math.max(2.2, Math.round(size * 0.1 * 10) / 10);
  const dotGap = Math.max(1.8, Math.round(size * 0.08 * 10) / 10);
  const dotRadius = dotSize / 2;

  return (
    <View style={[styles.wrap, frameStyle]} accessibilityLabel="Loading">
      {/* Outer rotating dashed gold shutter ring */}
      <Animated.View
        style={[
          styles.absCenter,
          frameStyle,
          { transform: [{ rotate: outerRotate }] },
        ]}
      >
        <Svg width={size} height={size} viewBox="0 0 48 48">
          <Circle
            cx="24"
            cy="24"
            r="21"
            stroke={goldColor}
            strokeWidth="2.2"
            strokeDasharray="10 6"
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d="M 24 0.5 Q 24 4 27.5 4 Q 24 4 24 7.5 Q 24 4 20.5 4 Q 24 4 24 0.5 Z"
            fill={goldColor}
          />
        </Svg>
      </Animated.View>

      {/* Counter-rotating geometric rounded square aperture */}
      <Animated.View
        style={[
          styles.absCenter,
          { width: innerSize, height: innerSize, transform: [{ rotate: innerRotate }] },
        ]}
      >
        <Svg width={innerSize} height={innerSize} viewBox="0 0 32 32">
          <Rect
            x="4"
            y="4"
            width="24"
            height="24"
            rx="7"
            stroke={mistColor}
            strokeWidth="1.8"
            strokeDasharray="8 5"
            fill="none"
          />
        </Svg>
      </Animated.View>

      {/* Center pulsing tri-dot geometric cluster */}
      <View style={[styles.dotsRow, { gap: dotGap }]}>
        <Animated.View
          style={[
            styles.dot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotRadius,
              backgroundColor: goldColor,
              opacity: pulseA,
              transform: [{ scale: pulseA }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.dot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotRadius,
              backgroundColor: blushColor,
              opacity: pulseB,
              transform: [{ scale: pulseB }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.dot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotRadius,
              backgroundColor: mistColor,
              opacity: pulseC,
              transform: [{ scale: pulseC }],
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  absCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
  },
  dot: {
    width: 4.5,
    height: 4.5,
    borderRadius: 2.25,
  },
});

