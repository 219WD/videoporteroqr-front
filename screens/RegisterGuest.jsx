import React, { useState } from 'react';
import { View, TextInput, Button, Text } from 'react-native';
import API from '../utils/api';

export default function RegisterGuest({ route, navigation }) {
  const { code } = route.params || {};
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const registerGuest = async () => {
    try {
      const res = await API.post(`/auth/register-guest?code=${code}`, { name, email, password });
      alert('Registrado como guest');
      navigation.replace('Login');
    } catch (e) {
      console.error(e);
      alert('Error registrando guest');
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text>Registrarse como Guest para el host (code: {code})</Text>
      <TextInput placeholder="Nombre" value={name} onChangeText={setName} />
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} />
      <TextInput placeholder="Password (opcional)" secureTextEntry value={password} onChangeText={setPassword} />
      <Button title="Registrarme" onPress={registerGuest} />
    </View>
  );
}
