import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import API from '../utils/api';

export default function AdminDashboard({ navigation }) {
  const [hosts, setHosts] = useState([]);

  useEffect(() => {
    const load = async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) return navigation.replace('Login');
      const res = await API.get('/dashboard/admin/hosts', { headers: { Authorization: `Bearer ${token}` }});
      setHosts(res.data);
    };
    load();
  }, []);

  return (
    <View style={{ padding: 20 }}>
      <Text>Admin Dashboard - Hosts</Text>
      <FlatList
        data={hosts}
        keyExtractor={(item) => item._id || item.email}
        renderItem={({ item }) => (
          <View style={{ padding: 8, borderBottomWidth: 1 }}>
            <Text>{item.name} - {item.email}</Text>
            <Text>QR: {item.qrCode}</Text>
          </View>
        )}
      />
    </View>
  );
}
