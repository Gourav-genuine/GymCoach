import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, IconButton, useTheme } from 'react-native-paper';

export default function AgentChatInput({ onSend, disabled }) {
  const [message, setMessage] = useState('');
  const theme = useTheme();

  const handleSend = () => {
    const trimmed = message.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setMessage('');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.surfaceVariant }]}>
        <View style={styles.inputRow}>
          <TextInput
            mode="flat"
            placeholder="Tell IronAgent how you're feeling..."
            placeholderTextColor={theme.colors.placeholder}
            value={message}
            onChangeText={setMessage}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            disabled={disabled}
            style={[styles.input, { backgroundColor: theme.colors.surfaceVariant, color: theme.colors.text }]}
            textColor={theme.colors.text}
            underlineColor="transparent"
            activeUnderlineColor={theme.colors.primary}
            dense
            multiline={false}
          />
          <IconButton
            icon="send"
            iconColor={message.trim() ? theme.colors.primary : theme.colors.disabled}
            size={24}
            onPress={handleSend}
            disabled={disabled || !message.trim()}
            style={[
              styles.sendButton,
              message.trim() && !disabled
                ? { backgroundColor: theme.colors.primary + '20' }
                : {},
            ]}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    fontSize: 14,
    maxHeight: 44,
  },
  sendButton: {
    margin: 0,
    borderRadius: 20,
  },
});
