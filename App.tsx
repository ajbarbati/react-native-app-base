import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  GluestackUIProvider,
  Input,
  InputField,
  Text,
  VStack,
} from '@gluestack-ui/themed';
import { config } from '@gluestack-ui/config';

export default function App() {
  const [name, setName] = useState<string>('');

  return (
    <GluestackUIProvider config={config}>
      <View style={styles.container}>
        <VStack space="md" w="$80">
          <Text size="md">Your name</Text>
          <Input>
            <InputField
              placeholder="Enter your name"
              value={name}
              onChangeText={setName}
            />
          </Input>
          <Text size="sm">Typed: {name || '-'}</Text>
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
