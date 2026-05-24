import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';

export default function InsightCard({ title, message, icon = '🧠' }) {
  const theme = useTheme();

  return (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <View style={styles.header}>
          <Text style={styles.icon}>{icon}</Text>
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
    borderRadius: 16,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    fontSize: 24,
    marginRight: 10,
  },
  title: {
    fontWeight: '700',
  },
  messageContainer: {
    borderRadius: 12,
    padding: 14,
  },
  message: {
    lineHeight: 22,
  },
});
