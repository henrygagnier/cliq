import React, { useState } from 'react';
import { Image, ImageProps, View, Text, StyleSheet } from 'react-native';

interface ImageWithFallbackProps extends Omit<ImageProps, 'source'> {
  src: string | number;
  alt?: string;
  className?: string;
}

export function ImageWithFallback({ src, alt, style, ...props }: ImageWithFallbackProps) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <View style={[styles.fallback, style]}>
        <Text style={styles.fallbackText}>{alt || 'Image'}</Text>
      </View>
    );
  }

  return (
    <Image
      source={typeof src === 'string' ? { uri: src } : src}
      style={style}
      onError={() => setError(true)}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    color: '#666',
  },
});
