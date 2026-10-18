GONGONIA NETWORK (GNG) — PROTOTIPO PWA V0.3.3
============================================

Esta versión conserva el diseño Fantasía Gongonia de la v0.2, incorpora el
nuevo emblema circular de minería (pico dorado y piedras sobre fondo esmeralda)
y añade registro/inicio de sesión mediante Supabase Auth.

NOVEDADES V0.3.3
----------------
- Emblema de minería actualizado en la pantalla de acceso y en el botón de minería.
- Formulario para crear cuenta con nombre de usuario, correo, país, contraseña
y confirmación de contraseña.
- Lista de 250 países y territorios (los códigos ISO 3166-1 más Kosovo).
- Registro por correo e inicio de sesión con Supabase Auth.
- El formulario envía username y country en los metadatos del registro para que
  el trigger on_gng_user_created pueda crear public."Profiles".
- Muestra datos del perfil que se leen de Supabase.
- Mantiene el saldo e historial de minería en el almacenamiento local, separado
  por usuario en este dispositivo. No se han trasladado a tablas remotas.
- Mantiene la tasa de prueba de 0,6 GNG/h y el máximo teórico de 14,4 GNG por
  24 horas continuas.
- La minería se detiene automáticamente al alcanzar 24 horas de sesión; el
  saldo deja de acumularse y debe pulsarse el emblema para iniciar otra sesión.
- Si la app permanece cerrada o en segundo plano al cumplirse el límite, el
  límite se aplica al volver a abrirla o recuperar la actividad: no acredita tiempo
  adicional después de las 24 horas de esa sesión.
- Música ambiental original, sintetizada para GNG, con botón para activar/desactivar.
- La música comienza solo cuando la persona pulsa el botón, por compatibilidad con Safari/iOS.
- La pista se incluye en la caché de la PWA para permitir su reproducción después de la primera carga.
- Mantiene los archivos PWA y la caché offline.

CONFIGURACIÓN PÚBLICA DE SUPABASE INCLUIDA
------------------------------------------
El archivo supabase-config.js ya contiene la URL del proyecto GNG-Database y la
publishable key pública proporcionada para esta integración.

La URL configurada es:
  https://kbafhqnifzzobiiphrxr.supabase.co

La clave incluida es una sb_publishable_ (clave pública de cliente). Está pensada
para utilizarse en el navegador; el control de acceso depende de las políticas RLS.
Nunca coloques una clave sb_secret_, service_role o administrativa en esta app.

IMPORTANTE: la conexión todavía no se ha probado con un registro real. Antes de
probar en el despliegue público, revisa en Supabase Authentication → URL
Configuration que la Site URL sea la URL pública de GNG y añade esa dirección a
Redirect URLs. La configuración que vimos antes tenía localhost:3000 y ninguna
Redirect URL, por lo que hay que corregirla antes de hacer pruebas de registro.

CONFIGURACIÓN DE SUPABASE AUTH
------------------------------
Antes de probar el registro en la app publicada, abre Authentication → URL
Configuration en el proyecto Supabase:

1. Site URL: https://wild-lake-107b.eluniversodeatlas.workers.dev
2. Redirect URLs: añade esta URL exacta: https://wild-lake-107b.eluniversodeatlas.workers.dev/**
   Si la interfaz rechaza el comodín, añade la URL exacta con barra final:
   https://wild-lake-107b.eluniversodeatlas.workers.dev/

Si la aplicación se publica luego en otra dirección, habrá que actualizar estas
URL con la nueva dirección.

El proyecto ya tiene la confirmación de correo activada, según la revisión del
panel. Después de comprobar las URL de Auth y publicar esta versión, prueba el registro
con un correo al que tengas acceso, confirma el mensaje que envíe Supabase y luego
inicia sesión. Si el trigger falla, no repitas muchas veces el registro: comprueba
Authentication → Users y revisa el mensaje de error antes de volver a probar.

CÓMO PUBLICAR LOS ARCHIVOS
-------------------------
Todos los archivos de este ZIP deben quedar en la raíz del sitio, conservando
las carpetas assets/ e icons/. No publiques solo index.html. Guarda la v0.2 como
copia de respaldo y publica esta versión como nueva implementación.

ARCHIVOS PRINCIPALES
--------------------
index.html            Interfaz de la aplicación y el selector de países.
styles.css            Estilos y diseño adaptable.
app.js                Registro, inicio/cierre de sesión y minería local.
supabase-config.js    Configuración pública del cliente (por completar).
service-worker.js     Caché PWA; no almacena las respuestas de la API de Supabase.
manifest.webmanifest  Nombre, iconos y modo instalable de la PWA.
assets/gng-coin.webp  Emblema de la moneda GNG.
assets/gng-mining-logo.png Nuevo emblema circular de minería.
assets/gng-ambient-loop.mp3 Música ambiental instrumental original, en bucle.
icons/                Iconos de la PWA.

LÍMITES DE ESTA VERSIÓN
-----------------------
- La cuenta y el perfil se guardan/gestionan mediante Supabase.
- El saldo, el tiempo y el historial de minería siguen siendo locales y pueden
  manipularse desde el dispositivo; no se sincronizan con Supabase.
- GNG es una moneda de prueba simbólica; esta versión no conecta con blockchain
  ni representa un activo con valor monetario.
- No se ha ejecutado un registro real: hay que configurar las credenciales y
  verificar el funcionamiento en el proyecto Supabase del usuario.
