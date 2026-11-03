# Cómo ver la app en tu iPhone (Windows + Expo Go)

Esto te deja ver la app funcionando en modo básico (login, mapa, compartir en primer plano),
gratis y sin cuenta de Apple. El segundo plano, las notificaciones y el SMS NO funcionan en
Expo Go; eso llega con la versión completa (más abajo).

## En tu laptop Windows

1. Instalá **Node.js** (versión LTS) desde https://nodejs.org — descargá el botón que dice "LTS" e instalalo con "Siguiente, Siguiente".
2. Descargá el código: en https://github.com/maxfertz-glitch/Ubicaci-n-App tocá el botón verde **Code > Download ZIP**, y descomprimilo (por ejemplo en el Escritorio).
3. Abrí **PowerShell** (botón Inicio, escribí "PowerShell", Enter).
4. Entrá a la carpeta descomprimida, por ejemplo:
   `cd $HOME\Desktop\Ubicaci-n-App-main`
5. Instalá lo necesario (tarda unos minutos):
   `npm install`
6. Encendé la app:
   `npx expo start --tunnel`
   La primera vez puede pedir instalar un paquete extra: aceptá (y).

## En tu iPhone

7. Instalá **Expo Go** desde la App Store.
8. Abrí la **cámara** del iPhone y apuntá al código QR que apareció en la pantalla de la laptop.
   Tocá el aviso que sale arriba: se abre en Expo Go y carga la app.
9. Creá una cuenta con tu email y una contraseña, y probá: el mapa, el botón **Compartir** y las invitaciones.

Si algo no carga o sale un error, sacale una foto a la pantalla y pasámela.

## La versión completa (para usarla de verdad)

Para tener la app con segundo plano, notificaciones y todo, instalada como una app normal en tu
iPhone, hace falta:
- Una **cuenta de desarrollador de Apple** (~99 USD al año).
- Generar la app en la nube con **EAS Build** (funciona desde Windows, no necesitás Mac) y subirla a **TestFlight**.

Cuando quieras ir por ahí, te armo esos pasos.
