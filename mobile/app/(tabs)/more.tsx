import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '@/constants/config';

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
  subtitle?: string;
}

function MenuItem({ icon, label, onPress, color = COLORS.text, subtitle }: MenuItemProps) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={22} color={color} />
      <View style={styles.menuItemContent}>
        <Text style={[styles.menuLabel, { color }]}>{label}</Text>
        {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
    </TouchableOpacity>
  );
}

export default function MoreScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();

  const userName = user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : '';
  const userEmail = user?.primaryEmailAddress?.emailAddress ?? '';

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
      {/* Profile card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {userName
              .split(' ')
              .map((n) => n[0])
              .filter(Boolean)
              .join('')
              .toUpperCase()}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{userName || 'KrewPact User'}</Text>
          <Text style={styles.profileEmail}>{userEmail}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Field Operations</Text>
        <MenuItem
          icon="document-text-outline"
          label="Daily Logs"
          subtitle="View and submit daily site logs"
          onPress={() =>
            Alert.alert(
              'Daily Logs',
              'Select a project first from the Projects tab to view daily logs.',
            )
          }
        />
        <MenuItem
          icon="shield-checkmark-outline"
          label="Safety Reports"
          subtitle="Available on web app"
          onPress={() =>
            Alert.alert(
              'Safety Reports',
              'Safety reports are available on the full web app at krewpact.ca',
            )
          }
        />
        <MenuItem
          icon="receipt-outline"
          label="Expenses"
          subtitle="Available on web app"
          onPress={() =>
            Alert.alert(
              'Expenses',
              'Expense management is available on the full web app at krewpact.ca',
            )
          }
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <MenuItem icon="person-outline" label="Profile" subtitle={userEmail} onPress={() => {}} />
        <MenuItem icon="notifications-outline" label="Notifications" onPress={() => {}} />
        <MenuItem icon="settings-outline" label="Settings" onPress={() => {}} />
      </View>

      <View style={styles.section}>
        <MenuItem
          icon="log-out-outline"
          label="Sign Out"
          onPress={handleSignOut}
          color={COLORS.danger}
        />
      </View>

      <Text style={styles.version}>KrewPact Mobile v0.1.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  content: { paddingBottom: SPACING.xl },

  // Profile
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    marginTop: SPACING.md,
    marginHorizontal: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#fff' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  profileEmail: { fontSize: 13, color: COLORS.muted, marginTop: 2 },

  // Sections
  section: {
    backgroundColor: COLORS.background,
    marginTop: SPACING.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    gap: SPACING.sm,
  },
  menuItemContent: { flex: 1 },
  menuLabel: { fontSize: 16 },
  menuSubtitle: { fontSize: 12, color: COLORS.muted, marginTop: 1 },
  version: { textAlign: 'center', color: COLORS.muted, fontSize: 13, marginTop: SPACING.xl },
});
