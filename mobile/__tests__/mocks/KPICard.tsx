import React from 'react';
import { Text } from 'react-native';

export function KPICard({ label, value }: { label: string; value: number; color?: string }) {
  return <Text>{label}</Text>;
}
