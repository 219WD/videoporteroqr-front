import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export type HomeStatusFilter = 'all' | 'pending' | 'answered' | 'closed';
export type HomePeriodFilter = 'all' | 'today' | 'week' | 'expired';

type HomeFiltersProps = {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: HomeStatusFilter;
  onStatusChange: (value: HomeStatusFilter) => void;
  total: number;
  visible: number;
  periodFilter: HomePeriodFilter;
  onPeriodChange: (value: HomePeriodFilter) => void;
};

const filters: { key: HomeStatusFilter; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'pending', label: 'Pendientes' },
  { key: 'answered', label: 'Respondidas' },
  { key: 'closed', label: 'Cerradas' },
];

const periods: { key: HomePeriodFilter; label: string }[] = [
  { key: 'all', label: 'Todo el historial' },
  { key: 'today', label: 'Hoy' },
  { key: 'week', label: 'Últimos 7 días' },
  { key: 'expired', label: 'Vencidas' },
];

export function HomeFilters({ search, onSearchChange, statusFilter, onStatusChange, total, visible, periodFilter, onPeriodChange }: HomeFiltersProps) {
  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={19} color="#6B6265" />
        <TextInput
          value={search}
          onChangeText={onSearchChange}
          placeholder="Buscar por nombre o mensaje"
          placeholderTextColor="#766D70"
          style={styles.input}
          returnKeyType="search"
          accessibilityLabel="Buscar conversaciones"
        />
        {search ? (
          <Pressable onPress={() => onSearchChange('')} hitSlop={10} accessibilityLabel="Limpiar búsqueda">
            <Ionicons name="close-circle" size={19} color="#766D70" />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.periodList}>
        {periods.map((period) => (
          <Pressable key={period.key} onPress={() => onPeriodChange(period.key)} style={[styles.period, periodFilter === period.key && styles.periodActive]} accessibilityRole="button" accessibilityState={{ selected: periodFilter === period.key }}>
            <Text style={[styles.periodText, periodFilter === period.key && styles.periodTextActive]}>{period.label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.filterRow}>
        <View style={styles.filterList}>
          {filters.map((filter) => (
            <Pressable
              key={filter.key}
              onPress={() => onStatusChange(filter.key)}
              style={[styles.filter, statusFilter === filter.key && styles.filterActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: statusFilter === filter.key }}
            >
              <Text style={[styles.filterText, statusFilter === filter.key && styles.filterTextActive]}>{filter.label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.resultCount}>{visible}/{total}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12, marginTop: 14, marginBottom: 2 },
  searchBox: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E7DFE1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  input: { flex: 1, color: '#3D3D3D', fontFamily: 'BaiJamjuree', fontSize: 14, paddingVertical: 0 },
  filterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  filterList: { flexDirection: 'row', gap: 7, flexWrap: 'wrap', flex: 1 },
  filter: { borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7, backgroundColor: '#F3EFF0' },
  filterActive: { backgroundColor: '#F8EDEF' },
  filterText: { color: '#62595C', fontFamily: 'BaiJamjuree-Bold', fontSize: 11 },
  filterTextActive: { color: '#9F1F26' },
  resultCount: { color: '#6B6265', fontFamily: 'BaiJamjuree', fontSize: 11 },
  periodList: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
  period: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#FAF7F7', borderWidth: 1, borderColor: '#EEE5E7' },
  periodActive: { backgroundColor: '#F3E2E5', borderColor: '#E8C8CD' },
  periodText: { color: '#746A6D', fontFamily: 'BaiJamjuree', fontSize: 10 },
  periodTextActive: { color: '#9F1F26', fontFamily: 'BaiJamjuree-Bold' },
});
