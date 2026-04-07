import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import React from 'react';

import { formatStatus } from '@/lib/format-status';

import type { ProjectStatusPdfData } from '../types';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10 },
  header: { marginBottom: 20 },
  logoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  logo: { width: 60, height: 34, marginRight: 10 },
  companyName: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  projectName: { fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  projectInfo: { fontSize: 10, color: '#666', marginBottom: 2 },
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    borderBottom: '1 solid #ddd',
    paddingBottom: 4,
  },
  milestoneRow: { flexDirection: 'row', marginBottom: 6, alignItems: 'center' },
  milestoneName: { width: '35%' },
  progressBarOuter: { width: '35%', height: 10, backgroundColor: '#eee', borderRadius: 5 },
  progressBarInner: { height: 10, backgroundColor: '#3b82f6', borderRadius: 5 },
  milestoneProgress: { width: '15%', textAlign: 'right' },
  milestoneDue: { width: '15%', textAlign: 'right', color: '#666' },
  summaryGrid: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  summaryCard: {
    flex: 1,
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    textAlign: 'center',
  },
  summaryValue: { fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  summaryLabel: { fontSize: 8, color: '#666' },
  logEntry: { marginBottom: 8, paddingBottom: 8, borderBottom: '0.5 solid #eee' },
  logDate: { fontWeight: 'bold', marginBottom: 2 },
  logAuthor: { color: '#666', marginBottom: 2 },
  logSummary: { fontSize: 10 },
});

function ProjectHeader({ data }: { data: ProjectStatusPdfData }) {
  return (
    <View style={styles.header}>
      <View style={styles.logoRow}>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image style={styles.logo} src="/mdm-logo.svg" />
        <Text style={styles.companyName}>{data.companyName}</Text>
      </View>
      {data.project && (
        <>
          <Text style={styles.projectName}>{data.project.name}</Text>
          {data.project.code && (
            <Text style={styles.projectInfo}>Project: {data.project.code}</Text>
          )}
          {data.project.status && (
            <Text style={styles.projectInfo}>Status: {formatStatus(data.project.status)}</Text>
          )}
          {data.project.startDate && data.project.endDate && (
            <Text style={styles.projectInfo}>
              {data.project.startDate} — {data.project.endDate}
            </Text>
          )}
        </>
      )}
    </View>
  );
}

export function ProjectStatusPdf({ data }: { data: ProjectStatusPdfData }) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <ProjectHeader data={data} />

        {data.milestones && data.milestones.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Milestone Progress</Text>
            {data.milestones.map((m, i) => {
              const mKey = m.name ? `${m.name}-${i}` : String(i);
              return (
                <View key={mKey} style={styles.milestoneRow} wrap={false}>
                  <Text style={styles.milestoneName}>{m.name}</Text>
                  <View style={styles.progressBarOuter}>
                    <View
                      style={[styles.progressBarInner, { width: `${Math.min(m.progress, 100)}%` }]}
                    />
                  </View>
                  <Text style={styles.milestoneProgress}>{m.progress}%</Text>
                  <Text style={styles.milestoneDue}>{m.dueDate || '-'}</Text>
                </View>
              );
            })}
          </View>
        )}

        {data.taskSummary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Task Summary</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{data.taskSummary.total}</Text>
                <Text style={styles.summaryLabel}>Total</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{data.taskSummary.completed}</Text>
                <Text style={styles.summaryLabel}>Completed</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{data.taskSummary.inProgress}</Text>
                <Text style={styles.summaryLabel}>In Progress</Text>
              </View>
              <View
                style={[
                  styles.summaryCard,
                  data.taskSummary.overdue > 0 ? { backgroundColor: '#fef2f2' } : {},
                ]}
              >
                <Text
                  style={[
                    styles.summaryValue,
                    data.taskSummary.overdue > 0 ? { color: '#ef4444' } : {},
                  ]}
                >
                  {data.taskSummary.overdue}
                </Text>
                <Text style={styles.summaryLabel}>Overdue</Text>
              </View>
            </View>
          </View>
        )}

        {data.recentLogs && data.recentLogs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Daily Logs</Text>
            {data.recentLogs.map((log, i) => {
              const logKey = log.date ? `${log.date}-${i}` : String(i);
              return (
                <View key={logKey} style={styles.logEntry} wrap={false}>
                  <Text style={styles.logDate}>{log.date}</Text>
                  <Text style={styles.logAuthor}>{log.author}</Text>
                  <Text style={styles.logSummary}>{log.summary}</Text>
                </View>
              );
            })}
          </View>
        )}
      </Page>
    </Document>
  );
}
