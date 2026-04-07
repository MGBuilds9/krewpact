import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '@/constants/config';

interface KPICardProps {
  label: string;
  value: number;
  color: string;
}

export function KPICard({ label, value, color }: KPICardProps) {
  return (
    <View style={styles.card}>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  value: { fontSize: 28, fontWeight: '700' },
  label: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2, textAlign: 'center' },
});
