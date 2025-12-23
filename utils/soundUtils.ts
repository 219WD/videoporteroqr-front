import { Audio } from 'expo-av';
import { Vibration } from 'react-native';

export async function playDoorbellSound() {
  try {
    // Solicitar permisos primero (nuevo en expo-audio)
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permisos de audio no concedidos, usando vibración como fallback');
        Vibration.vibrate([500, 200, 500]);
        return;
      }
    } catch (permissionError) {
      console.log('Error solicitando permisos:', permissionError);
    }

    // Primero, cargar el sonido
    const { sound } = await Audio.Sound.createAsync(
      require('../assets/sounds/doorbell.mp3')
    );
    
    // Reproducir
    await sound.playAsync();
    
    // Limpiar después de 3 segundos
    setTimeout(async () => {
      try {
        await sound.unloadAsync();
      } catch (unloadError) {
        console.log('Error al descargar sonido:', unloadError);
      }
    }, 3000);
    
  } catch (error) {
    console.log('Error reproduciendo sonido:', error);
    // Fallback a vibración
    Vibration.vibrate([500, 200, 500]);
  }
}