# Build Android local en Debian

Esta guía resume el flujo de `.github/workflows/frontend-android-releases.yml` para que puedas buildear en tu PC sin ir a GitHub.

## Antes de empezar

Necesitás:

- Node.js 20
- Java 17
- Android SDK
- `npm`
- `google-services.json` en `android/app/google-services.json`
- `NODE_ENV`

## Paso 1. Definí las variables

Exportá estas variables en la misma terminal donde vas a buildar:

```bash
export EXPO_PUBLIC_BACKEND_URL="https://tu-backend"
export EXPO_PUBLIC_SOCKET_URL="https://tu-socket"
export EXPO_PUBLIC_LOG_ENABLED="true"
export EXPO_TOKEN="tu_token_de_expo"
export NODE_ENV="production"
```

## Paso 2. Verificá que estén cargadas

Esto no cierra la terminal ni corta el flujo. Solo te muestra qué falta y qué está bien:

```bash
for var in EXPO_PUBLIC_BACKEND_URL EXPO_PUBLIC_SOCKET_URL EXPO_PUBLIC_LOG_ENABLED EXPO_TOKEN NODE_ENV; do
  if [ -z "${!var}" ]; then
    echo "Falta $var"
  else
    echo "OK $var"
  fi
done
```

Si ves algún `Falta ...`, corregilo antes de seguir.

## Paso 3. Instalá dependencias

```bash
npm ci
```

## Paso 4. Generá el proyecto nativo de Android

```bash
npx expo@^54.0.25 prebuild --platform android --clean
```

## Paso 5. Revisá que Android se haya creado bien

```bash
for path in android android/gradlew android/app android/app/google-services.json; do
  if [ -e "$path" ]; then
    echo "OK $path"
  else
    echo "Falta $path"
  fi
done
```

Si algo falta, no sigas con el build.

## Paso 6. Hacé el build

Con tu `eas.json` actual, tanto `preview` como `production` generan un `.apk` para Android.
Si no definís `EAS_LOCAL_BUILD_ARTIFACTS_DIR`, EAS copia el archivo final al directorio actual, o sea, al mismo lugar desde donde corrés el comando.

### Preview

```bash
npx eas-cli@latest build --platform android --profile preview --local --non-interactive
```

### Production

```bash
npx eas-cli@latest build --platform android --profile production --local --non-interactive
```

## Dónde queda el build

- `preview`: queda en tu carpeta actual, como archivo `.apk`.
- `production`: también queda en tu carpeta actual, como archivo `.apk`.

La diferencia entre ambos perfiles en este repo no es la ubicación, sino la configuración del build. Hoy los dos perfiles están configurados para Android con `buildType: "apk"`.

## Flujo rápido

Si ya tenés `node_modules` instalado y `android/` está generado, podés ir directo a:

```bash
for var in EXPO_PUBLIC_BACKEND_URL EXPO_PUBLIC_SOCKET_URL EXPO_PUBLIC_LOG_ENABLED EXPO_TOKEN NODE_ENV; do
  if [ -z "${!var}" ]; then
    echo "Falta $var"
  else
    echo "OK $var"
  fi
done

npx eas-cli@latest build --platform android --profile preview --local --non-interactive
```

## Cómo corregir errores

### Falta una variable

Si aparece `Falta EXPO_PUBLIC_BACKEND_URL`, `Falta EXPO_PUBLIC_SOCKET_URL`, `Falta EXPO_PUBLIC_LOG_ENABLED` o `Falta EXPO_TOKEN`, volvé a exportarlas en esa misma terminal y repetí el chequeo.

Si aparece `Falta NODE_ENV`, exportalo con un valor como `production` antes de seguir.

### No existe `android/gradlew`

Volvé a generar Android:

```bash
npx expo@^54.0.25 prebuild --platform android --clean
```

### Falta `google-services.json`

Revisá que el archivo esté en `android/app/google-services.json`.

### Error de Java o Android SDK

Verificá que Java 17 y el Android SDK estén instalados y disponibles en tu Debian.

## Resumen corto

```bash
export EXPO_PUBLIC_BACKEND_URL="https://tu-backend"
export EXPO_PUBLIC_SOCKET_URL="https://tu-socket"
export EXPO_PUBLIC_LOG_ENABLED="true"
export EXPO_TOKEN="tu_token_de_expo"
export NODE_ENV="production"

npm ci
npx expo@^54.0.25 prebuild --platform android --clean
npx eas-cli@latest build --platform android --profile preview --local --non-interactive
```
