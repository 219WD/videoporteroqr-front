import { Image, Text, View, StyleSheet } from "react-native"

export const AppHero = () => {
  return (
  <View style={styles.headerStack}>
    <View style={styles.hero}>
      <View style={styles.heroCopy}>
        <Text style={styles.kicker}>Inicio</Text>
        <Text style={styles.title}>Panel principal</Text>
      </View>

      <View style={styles.heroBadge}>
        <Image source={require('../../assets/images/icon.png')} style={styles.heroImage} resizeMode="contain" />
      </View>
    </View>
  </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFFFF',
  },
  list: {
    gap: 12,
  },
  headerStack: {
    marginBottom: 4,
  },
  hero: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderRadius: 20,
    backgroundColor: '#d32f2f',
    overflow: 'hidden',
    minHeight: 128,
  },
  heroCopy: {
    paddingRight: 90,
  },
  heroBadge: {
    position: 'absolute',
    right: 18,
    top: 18,
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: 'rgba(250,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(250,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    width: 46,
    height: 46,
  },
  kicker: {
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'BaiJamjuree-Bold',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    marginTop: 6,
    color: '#FAFFFF',
    fontFamily: 'BaiJamjuree-Bold',
    fontSize: 26,
  },
  card: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 14,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  avatarAnon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F4F6',
  },
  info: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  name: {
    flex: 1,
    fontSize: 16,
    color: '#3D3D3D',
    fontFamily: 'BaiJamjuree-Bold',
  },
  time: {
    fontSize: 11,
    color: '#999',
    fontFamily: 'BaiJamjuree',
  },
  email: {
    marginTop: 2,
    color: '#666',
    fontFamily: 'BaiJamjuree',
    fontSize: 13,
  },
  preview: {
    marginTop: 10,
    color: '#444',
    fontFamily: 'BaiJamjuree',
    fontSize: 13,
    lineHeight: 18,
  },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 10,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d32f2f',
  },
  badgeText: {
    color: '#FAFFFF',
    fontFamily: 'BaiJamjuree-Bold',
    fontSize: 11,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  centerEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  loadingText: {
    marginTop: 14,
    color: '#666',
    fontFamily: 'BaiJamjuree',
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 18,
    color: '#3D3D3D',
    fontFamily: 'BaiJamjuree-Bold',
  },
  emptyText: {
    marginTop: 8,
    textAlign: 'center',
    color: '#666',
    fontFamily: 'BaiJamjuree',
    lineHeight: 20,
  },
});
