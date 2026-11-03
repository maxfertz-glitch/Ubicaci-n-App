# Ubicación (MVP)

App para Android y iPhone que comparte la ubicación en tiempo real con personas invitadas.
Basada en consentimiento: quien comparte lo activa, ve un aviso permanente y puede pausar o quitar acceso.

## Qué hace
- Cuenta con email y contraseña.
- "Compartir": envía la posición GPS cada ~5 s o 5 m, también con la app en segundo plano
  (Android muestra una notificación fija; iPhone la barra azul).
- "Invitar": genera un código de 6 letras (vence en 24 h). Quien lo ingresa puede ver tu ubicación.
- Mapa en vivo con la última posición de cada persona, hace cuánto se actualizó y un círculo con la precisión real (±m).
- "Quitar acceso a todos" y "Pausar" en cualquier momento.

### Sin datos o a punto de apagarse
- **Sin datos:** el GPS sigue funcionando; las posiciones se guardan en el teléfono (hasta ~7 h) y se suben solas al volver la señal, así se ve el recorrido completo.
- **Batería baja:** cada posición lleva el % de batería y al bajar del 15% y del 5% se envía la ubicación al instante.
- **Dejó de reportar:** si alguien que está compartiendo no manda nada en 15 min, quienes lo ven reciben una notificación push con la última posición (lo hace Supabase cada 5 min, aunque el teléfono esté apagado).
- **SMS:** botón para mandar la ubicación por mensaje de texto cuando hay señal pero no datos. La persona confirma el envío; el envío automático de SMS no lo permiten Apple ni Google Play.
- **Si se apaga…:** guía para activar Buscar (Apple) o Encontrar (Google), las únicas redes que pueden ubicar un teléfono apagado.

## Puesta en marcha
1. Crear un proyecto gratis en https://supabase.com.
2. En Database > Extensions activar `pg_cron` y `pg_net`; luego en SQL Editor pegar y ejecutar `supabase/schema.sql`.
3. En Project Settings > API copiar la URL y la anon key a `app.json` (`extra`).
4. `npm install` y luego `npx expo install --fix` para alinear versiones.
5. La ubicación en segundo plano **no funciona en Expo Go**: hay que compilar un "development build":
   `npx expo run:android` (con Android Studio) o `npx expo run:ios` (Mac con Xcode),
   o en la nube con `npx eas build --profile development`.
6. Las notificaciones push necesitan un proyecto de Expo (`npx eas init`, gratis), que agrega el `projectId` a `app.json`.
7. Para el mapa en Android hace falta una API key de Google Maps (`android.config.googleMaps.apiKey` en `app.json`).

## Límites honestos
- GPS: 3–10 m al aire libre, 20–50 m o más en interiores.
- Celular apagado o sin datos: solo se ve la última posición guardada.
- iPhone: si la persona cierra la app deslizándola, el sistema corta el envío hasta que la vuelva a abrir.
- Para un celular perdido, mantener activado también "Buscar" (Apple) o "Encontrar mi dispositivo" (Google).
