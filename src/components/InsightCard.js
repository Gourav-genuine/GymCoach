import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Icon, Text, useTheme } from 'react-native-paper';

export default function InsightCard({ title, message, icon = 'brain' }) {
  const theme = useTheme();

  return (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <View style={styles.header}>
          <Icon source={icon} size={22} color={theme.colors.primary} />
          <Text
            variant="titleMedium"
            style={[styles.title, { color: theme.colors.primary }]}
          >
            {title || 'Agent Insight'}
          </Text>
        </View>
        <View
          style={[
            styles.messageContainer,
            { backgroundColor: theme.colors.surfaceVariant },
          ]}
        >
          <Text
            variant="bodyMedium"
            style={[styles.message, { color: theme.colors.text }]}
          >
            {message}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  title: {
    fontWeight: '700',
  },
  messageContainer: {
    borderRadius: 8,
    padding: 14,
  },
  message: {
    lineHeight: 22,
  },
});
