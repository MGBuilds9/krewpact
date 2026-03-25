import React from 'react';
import { View } from 'react-native';

export function DailyLogForm(_props: {
  projectId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  return <View testID="daily-log-form" />;
}
