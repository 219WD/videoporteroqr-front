// client/screens/LoginScreen.js
import React, { useState } from 'react';
import { View, TextInput, Button, Text } from 'react-native';
import API from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerForPushNotificationsAsync } from '../utils/push';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');

  const login = async () => {
    try {
      const res = await API.post('/auth/login', { email, password });
      const token = res.data.token;
      const user = res.data.user;
      await AsyncStorage.setItem('token', token);
      // register push token
      const pushToken = await registerForPushNotificationsAsync();
      if (pushToken) {
        await API.post('/auth/save-push-token', { pushToken }, { headers: { Authorization: `Bearer ${token}` }});
      }
      // navigate by role
      if (user.role === 'admin') navigation.replace('AdminDashboard');
      else if (user.role === 'host') navigation.replace('HostDashboard');
      else navigation.replace('Scan'); // or GuestDashboard
    } catch (e) {
      console.error(e);
      setErr('Credenciales inválidas');
    }
  };

  return (
    <View style={{ padding: 20 }}>
      {err ? <Text style={{ color:'red' }}>{err}</Text> : null}
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} />
      <TextInput placeholder="Password" value={password} secureTextEntry onChangeText={setPassword} />
      <Button title="Login" onPress={login} />
      <Button title="Crear Host" onPress={() => navigation.navigate('RegisterHost')} />
      <Button title="Escanear QR (Guest)" onPress={() => navigation.navigate('Scan')} />
    </View>
  );
}
