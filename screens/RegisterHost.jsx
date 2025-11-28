import React, { useState } from 'react';
import { View, TextInput, Button, Image, Text } from 'react-native';
import API from '../utils/api';

export default function RegisterHost({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [qrData, setQrData] = useState(null);

  const registerHost = async () => {
    try {
      const res = await API.post('/auth/register-host', { name, email, password });
      setQrData(res.data.host.qrDataUrl);
    } catch (e) {
      console.error(e);
      alert('Error creando host');
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <TextInput placeholder="Nombre" value={name} onChangeText={setName} />
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} />
      <TextInput placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
      <Button title="Crear Host" onPress={registerHost} />
      {qrData && (
        <>
          <Text>QR generado:</Text>
          <Image source={{ uri: qrData }} style={{ width: 200, height: 200 }} />
        </>
      )}
    </View>
  );
}
