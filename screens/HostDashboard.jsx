// import React, { useEffect, useState } from 'react';
// import { View, Text, FlatList, Button } from 'react-native';
// import API from '../utils/api';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// export default function HostDashboard({ navigation }) {
//   const [guests, setGuests] = useState([]);

//   useEffect(() => {
//     const load = async () => {
//       const token = await AsyncStorage.getItem('token');
//       if (!token) return navigation.replace('Login');
//       const res = await API.get('/dashboard/host/guests', { headers: { Authorization: `Bearer ${token}` }});
//       setGuests(res.data);
//     };
//     load();
//   }, []);

//   return (
//     <View style={{ padding: 20 }}>
//       <Text>Host Dashboard</Text>
//       <Button title="Cerrar sesión" onPress={async () => { await AsyncStorage.removeItem('token'); navigation.replace('Login'); }} />
//       <FlatList
//         data={guests}
//         keyExtractor={(item) => item._id || item.email}
//         renderItem={({ item }) => (
//           <View style={{ padding: 8, borderBottomWidth: 1 }}>
//             <Text>{item.name} - {item.email}</Text>
//             <Text>{new Date(item.createdAt).toLocaleString()}</Text>
//           </View>
//         )}
//       />
//     </View>
//   );
// }
