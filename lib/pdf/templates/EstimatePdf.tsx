import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import React from 'react';

import type { EstimatePdfData } from '../types';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10 },
  header: { marginBottom: 20 },
  companyName: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  estimateInfo: { fontSize: 10, color: '#666', marginBottom: 2 },
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    borderBottom: '1 solid #ddd',
    paddingBottom: 4,
  },
  clientRow: { fontSize: 10, marginBottom: 2 },
  tableHeader: {
    flexDirection: 'row',
    borderBottom: '1 solid #333',
    paddingBottom: 4,
    marginBottom: 4,
    fontWeight: 'bold',
  },
  tableRow: { flexDirection: 'row', paddingVertical: 3, borderBottom: '0.5 solid #eee' },
  colDesc: { width: '40%' },
  colQty: { width: '12%', textAlign: 'right' },
  colUnit: { width: '12%', textAlign: 'center' },
  colCost: { width: '12%', textAlign: 'right' },
  colMarkup: { width: '12%', textAlign: 'right' },
  colTotal: { width: '12%', textAlign: 'right' },
  totalsSection: { marginTop: 12, alignItems: 'flex-end' },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 2, width: 200 },
  totalLabel: { width: '60%', textAlign: 'right', paddingRight: 8 },
  totalValue: { width: '40%', textAlign: 'right' },
  grandTotal: {
    fontWeight: 'bold',
    fontSize: 12,
    borderTop: '1 solid #333',
    paddingTop: 4,
    marginTop: 4,
  },
  terms: { marginTop: 24, fontSize: 9, color: '#666' },
  termsTitle: { fontWeight: 'bold', marginBottom: 4, fontSize: 10, color: '#333' },
});

function formatCurrency(amount: number | undefined): string {
  if (amount === undefined) return '$0.00';
  return `$${amount.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function EstimatePdf({ data }: { data: EstimatePdfData }) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.companyName}>{data.companyName}</Text>
          {data.estimateNumber && (
            <Text style={styles.estimateInfo}>Estimate #{data.estimateNumber}</Text>
          )}
          {data.date && <Text style={styles.estimateInfo}>Date: {data.date}</Text>}
        </View>

        {/* Client Info */}
        {data.client && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Client</Text>
            <Text style={styles.clientRow}>{data.client.name}</Text>
            {data.client.address && <Text style={styles.clientRow}>{data.client.address}</Text>}
            {data.client.email && <Text style={styles.clientRow}>{data.client.email}</Text>}
          </View>
        )}

        {/* Line Items Table */}
        {data.lineItems && data.lineItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Line Items</Text>
            <View style={styles.tableHeader} fixed>
              <Text style={styles.colDesc}>Description</Text>
              <Text style={styles.colQty}>Qty</Text>
              <Text style={styles.colUnit}>Unit</Text>
              <Text style={styles.colCost}>Unit Cost</Text>
              <Text style={styles.colMarkup}>Markup</Text>
              <Text style={styles.colTotal}>Total</Text>
            </View>
            {data.lineItems.map((item, i) => {
              const lineTotal = item.quantity * item.unitCost * (1 + (item.markup || 0) / 100);
              return (
                <View key={i} style={styles.tableRow} wrap={false} minPresenceAhead={20}>
                  <Text style={styles.colDesc}>{item.description}</Text>
                  <Text style={styles.colQty}>{item.quantity}</Text>
                  <Text style={styles.colUnit}>{item.unit || '-'}</Text>
                  <Text style={styles.colCost}>{formatCurrency(item.unitCost)}</Text>
                  <Text style={styles.colMarkup}>{item.markup ? `${item.markup}%` : '-'}</Text>
                  <Text style={styles.colTotal}>{formatCurrency(lineTotal)}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Totals */}
        <View style={styles.totalsSection} wrap={false}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>{formatCurrency(data.subtotal)}</Text>
          </View>
          {data.markupTotal !== undefined && data.markupTotal > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Markup:</Text>
              <Text style={styles.totalValue}>{formatCurrency(data.markupTotal)}</Text>
            </View>
          )}
          {data.taxRate !== undefined && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax ({data.taxRate}%):</Text>
              <Text style={styles.totalValue}>{formatCurrency(data.taxAmount)}</Text>
            </View>
          )}
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>{formatCurrency(data.total)}</Text>
          </View>
        </View>

        {/* Terms */}
        {data.terms && (
          <View style={styles.terms}>
            <Text style={styles.termsTitle}>Terms & Conditions</Text>
            <Text>{data.terms}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
