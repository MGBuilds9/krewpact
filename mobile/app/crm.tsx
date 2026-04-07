import React, { memo } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, Lead } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { COLORS, SPACING } from '@/constants/config';
import { formatStatus } from '@/lib/format-status';

const STATUS_COLORS: Record<string, string> = {
  new: COLORS.primary,
  contacted: COLORS.warning,
  qualified: COLORS.success,
  proposal: '#7C3AED',
  negotiation: '#D97706',
  nurture: '#6B7280',
  won: COLORS.success,
  lost: COLORS.danger,
};

const LeadCard = memo(function LeadCard({ lead }: { lead: Lead }) {
  const statusColor = STATUS_COLORS[lead.status] ?? COLORS.muted;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.companyName} numberOfLines={1}>
          {lead.company_name ?? 'Unknown Company'}
        </Text>
        <View
          style={[styles.badge, { backgroundColor: statusColor + '22', borderColor: statusColor }]}
        >
          <Text style={[styles.badgeText, { color: statusColor }]}>
            {formatStatus(lead.status)}
          </Text>
        </View>
      </View>
      {(lead.city || lead.province) && (
        <Text style={styles.contactName}>
          {[lead.city, lead.province].filter(Boolean).join(', ')}
        </Text>
      )}
      {lead.industry && <Text style={styles.contactName}>{lead.industry}</Text>}
      <View style={styles.cardFooter}>
        {lead.source_channel && <Text style={styles.meta}>{lead.source_channel}</Text>}
        {lead.lead_score !== null && (
          <View style={styles.scoreChip}>
            <Text style={styles.scoreText}>Score: {lead.lead_score}</Text>
          </View>
        )}
      </View>
    </View>
  );
});

export default function CRMScreen() {
  const router = useRouter();
  const { data, isLoading, isError, refetch, isFetching } = useQuery<Lead[]>({
    queryKey: queryKeys.leads,
    queryFn: api.crm.leads.list,
  });

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.header}>CRM</Text>
        <Text style={styles.count}>{data?.length ?? 0} leads</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : isError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>Failed to load leads. Pull to refresh.</Text>
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.empty}>No leads found.</Text>}
          renderItem={({ item }) => <LeadCard lead={item} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
  },
  backBtn: { padding: SPACING.xs },
  header: { fontSize: 24, fontWeight: '700', color: COLORS.text, flex: 1 },
  count: { fontSize: 14, color: COLORS.muted },
  listContent: { padding: SPACING.md, paddingTop: 0, paddingBottom: SPACING.xl },
  card: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  companyName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginRight: SPACING.sm,
  },
  badge: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    flexShrink: 0,
  },
  badgeText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  contactName: { fontSize: 14, color: COLORS.textSecondary },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  meta: { fontSize: 13, color: COLORS.muted },
  scoreChip: {
    backgroundColor: COLORS.primary + '15',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  scoreText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  separator: { height: SPACING.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: SPACING.md,
    margin: SPACING.md,
  },
  errorText: { color: COLORS.danger },
  empty: { color: COLORS.muted, textAlign: 'center', paddingVertical: SPACING.lg },
});
