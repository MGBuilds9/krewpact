import React from 'react';
import { View } from 'react-native';

export function SyncConflictSheet(_props: {
  visible: boolean;
  onClose: () => void;
}) {
  return <View testID="sync-conflict-sheet" />;
}
