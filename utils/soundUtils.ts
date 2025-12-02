// utils/soundUtils.ts
import { Audio } from 'expo-av';
import { Vibration } from 'react-native';

export async function playDoorbellSound() {
  try {
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