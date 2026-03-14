import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '@/constants/config';

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
}

function MenuItem({ icon, label, onPress, color = COLORS.text }: MenuItemProps) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={[styles.menuLabel, { color }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
    </TouchableOpacity>
  );
}

export default function MoreScreen() {
  const { signOut } = useAuth();
  const router = useRouter();

  function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/sign-in');
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Field Operations</Text>
        <MenuItem icon="document-text-outline" label="Daily Logs" onPress={() => {}} />
        <MenuItem icon="shield-checkmark-outline" label="Safety Reports" onPress={() => {}} />
        <MenuItem icon="receipt-outline" label="Expenses" onPress={() => {}} />
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <MenuItem icon="person-outline" label="Profile" onPress={() => {}} />
        <MenuItem icon="notifications-outline" label="Notifications" onPress={() => {}} />
        <MenuItem icon="settings-outline" label="Settings" onPress={() => {}} />
      </View>
      <View style={styles.section}>
        <MenuItem icon="log-out-outline" label="Sign Out" onPress={handleSignOut} color={COLORS.danger} />
      </View>
      <Text style={styles.version}>KrewPact Mobile v0.1.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  content: { paddingBottom: SPACING.xl },
  section: { backgroundColor: COLORS.background, marginTop: SPACING.md, borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.border },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: SPACING.md, paddingTop: SPACING.md, paddingBottom: SPACING.xs },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: SPACING.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border, gap: SPACING.sm },
  menuLabel: { flex: 1, fontSize: 16 },
  version: { textAlign: 'center', color: COLORS.muted, fontSize: 13, marginTop: SPACING.xl },
});
