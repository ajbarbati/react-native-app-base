import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Button,
  ButtonSpinner,
  ButtonText,
  GluestackUIProvider,
  Input,
  InputField,
  Text,
  VStack,
} from '@gluestack-ui/themed';
import { config } from '@gluestack-ui/config';
import { sendChatMessage } from './api/chat';

export default function App() {
  const [message, setMessage] = useState<string>('');
  const [reply, setReply] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSend = async () => {
    const trimmed = message.trim();
    if (!trimmed || loading) return;
    setError(null);
    setReply('');
    setLoading(true);
    try {
      const text = await sendChatMessage(trimmed);
      setReply(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GluestackUIProvider config={config}>
      <View style={styles.container}>
        <VStack space="md" w="$80">
          <Text size="md">Message</Text>
          <Input>
            <InputField
              placeholder="Type a message for the assistant"
              value={message}
              onChangeText={setMessage}
              editable={!loading}
            />
          </Input>
          <Button onPress={onSend} isDisabled={loading || !message.trim()}>
            {loading ? <ButtonSpinner /> : <ButtonText>Send</ButtonText>}
          </Button>
          {error ? (
            <Text size="sm" color="$error600">
              {error}
            </Text>
          ) : null}
          {reply ? (
            <Text size="sm" mt="$2">
              {reply}
            </Text>
          ) : null}
        </VStack>
        <StatusBar style="auto" />
      </View>
    </GluestackUIProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
});
