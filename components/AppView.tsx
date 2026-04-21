import React, { PropsWithChildren } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type AppViewProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

export default function AppView({ children, style }: AppViewProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={[styles.container, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FAFFFF',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
});
