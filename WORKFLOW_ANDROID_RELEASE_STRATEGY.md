# Estrategia de builds Android por release

Este documento define una estrategia simple y mantenible para generar APKs desde GitHub Actions usando dos workflows separados:

- `frontend-android-preview.yml`
- `frontend-android-production.yml`

La idea es que la decision no dependa de logica manual dentro del workflow, sino de una convension Git clara.

## Objetivo

- Generar una build `preview` cuando exista una release candidata.
- Generar una build `production` cuando exista una release estable.
- Mantener ambos flujos separados para no mezclar validaciones, permisos ni artefactos.

## Estrategia Git propuesta

### Ramas

- `develop`: rama de integracion.
- `main`: rama estable o lista para release.
- `release/*`: ramas opcionales para estabilizar una version antes de publicar.

### Tags

Usar semver como convension principal:

- `v1.8.0-rc.1`, `v1.8.0-beta.2`, `v1.8.0-preview.3` -> preview
- `v1.8.0` -> production

## Regla de decision

### Preview

Disparar el workflow de preview cuando:

- la release en GitHub este marcada como `prerelease`, o
- el tag siga el patron `vX.Y.Z-rc.N`, `vX.Y.Z-beta.N` o `vX.Y.Z-preview.N`

Esto representa una build para validacion interna, QA o prueba con usuarios limitados.

### Production

Disparar el workflow de production cuando:

- la release en GitHub no este marcada como `prerelease`, y
- el tag siga el patron `vX.Y.Z`

Esto representa una build estable, lista para distribucion final.

## Flujo operativo recomendado

1. Se desarrolla en feature branches.
2. Se mergea a `develop`.
3. Desde `develop` o `release/*` se crea una release candidata con tag `-rc`, `-beta` o `-preview`.
4. GitHub publica una release `prerelease` y ejecuta el workflow `preview`.
5. Cuando la version esta validada, se mergea o se retaguea sobre `main` con `vX.Y.Z`.
6. GitHub publica una release estable y ejecuta el workflow `production`.

## Como quedaria cada workflow

### `frontend-android-preview.yml`

- Trigger principal: `release` con `types: [published]`
- Filtro: solo si `github.event.release.prerelease == true`
- Perfil de EAS: `preview`
- Environment: `preview`
- Artefacto: `android-local-build-preview`

### `frontend-android-production.yml`

- Trigger principal: `release` con `types: [published]`
- Filtro: solo si `github.event.release.prerelease == false`
- Perfil de EAS: `production`
- Environment: `production`
- Artefacto: `android-local-build-production`

## Recomendacion tecnica

Aunque el gatillo sea `release`, conviene mantener una validacion adicional por tag para evitar errores humanos:

- Preview acepta solo tags con sufijo `-rc`, `-beta` o `-preview`.
- Production acepta solo tags semver limpios sin sufijo.

Esto evita que una release mal etiquetada termine construyendo el tipo de APK incorrecto.

## Validacion implementada

- Preview valida que el tag cumpla `vX.Y.Z-rc.N`, `vX.Y.Z-beta.N` o `vX.Y.Z-preview.N`.
- Production valida que el tag cumpla `vX.Y.Z` sin sufijos.
- Si el tag no coincide, el workflow falla antes de generar la build.

## Ventajas de esta estrategia

- Separa claramente estabilidad de validacion.
- Evita logica condicional compleja en un solo workflow.
- Hace trazable que build corresponde a cada release.
- Permite publicar una preview sin contaminar production.
- Encaja con la config actual de `eas.json`, que ya tiene perfiles separados.

## Convencion recomendada de publicacion

- Si la intencion es probar: crear una GitHub Release marcada como `pre-release`.
- Si la intencion es distribuir: crear una GitHub Release normal.

## Nota sobre el estado actual

Hoy ambos workflows quedan disparados automaticamente por `release.published`.
La decision final la toma el campo `prerelease` de la release publicada en GitHub.

## Resumen corto

- `preview` = tags con sufijo + GitHub Release `prerelease`
- `production` = tags semver limpios + GitHub Release estable
- Dos workflows separados, misma base de build, distinta intencion operativa
