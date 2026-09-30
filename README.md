# Remoto

Controla tu PC desde el celular Android, por el WiFi de casa.

![app](app/icono.png)

---

## Que hay aqui

```
app/          la aplicacion del celular (React Native / Expo)
servidor/     el programa que corre en la PC
```

---

## Como se usa

**En la PC:**

Opcion A, la facil — doble clic en `Remoto.exe` (si ya lo compilaste):

- Sale una ventana con la direccion y la clave, la clave se copia con un clic
- Boton **Iniciar** para arrancar, **Detener** para parar
- Se minimiza a la bandeja del sistema y sigue corriendo
- Clic derecho en el icono de la bandeja para el menu rapido

Opcion B, desde el codigo — doble clic en `servidor/Transferir.bat`:

1. Acepta el aviso de administrador
2. Deja la ventana abierta. Ahi sale la direccion y la clave

**En el celular:**

1. Abre la app **Remoto**
2. Escribe la direccion de la PC (ejemplo `192.168.1.50`) y la clave
3. Una vez dentro, la direccion y clave quedan guardadas

El celular y la PC deben estar en la misma red WiFi.

---

## Que incluye

**Inicio** — RAM, disco, bateria y temperatura con avisos por color
(blanco normal, ambar 75-90 %, rojo mas de 90 %). Volumen, Bluetooth,
accesos directos, portapapeles. Bloquear, capturar, reiniciar, apagar.

**Raton** — panel para arrastrar el cursor, clics, rueda y teclado.

**Apps** — lista de programas instalados, con buscador. Permite cerrarlos.

**USB** — dispositivos conectados.

**Archivos** — carpeta de transferencia, con busqueda. Subir y descargar.

**Clave** — cambiar la clave de acceso.

Todo lo que se ejecuta queda anotado en `servidor/registro.txt`.

---

## Velocidad

La primera version tardaba **22 segundos** en responder. Ahora tarda
**350 milisegundos**, unas 60 veces mas rapido.

El motivo era que Windows consulta la informacion por WMI, que es muy lento:

| Consulta | Tiempo |
|---|---|
| `Get-PnpDevice` (Bluetooth) | 5477 ms |
| `Get-NetRoute` | 4382 ms |
| `Get-NetAdapter` | 4100 ms |
| `Get-NetConnectionProfile` | 1957 ms |
| `Win32_OperatingSystem` | 963 ms |

Y lo hacia **en cada peticion**, mientras la app consulta cada 8 segundos.

La solucion es una cache en memoria: los datos se calculan una vez cada 60
segundos y las peticiones siguientes los leen al instante. El raton nunca
toca esa cache, asi que va inmediato.

Para cambiar los tiempos, busca `Get-Cacheado` en `servidor/servidor.ps1`.

---

## Las cinco funciones

### Portapapeles compartido
Traes el texto de la PC al celular y al reves. Se actualiza solo al abrir la
pantalla, asi que no hay que apretar nada.

### Reproductor de audio y video
Lista lo que hay en las carpetas de musica y video de la PC, y lo controla
desde el celular. No abre ninguna ventana: usa el control de Windows Media por
detras, asi que la musica sigue sonando aunque cierres Remoto.

Las carpetas que revisa: `Music`, `Música`, `Videos` y `Descargas`.

### Guiones
Guardas scripts de PowerShell con nombre y los corres desde el celular. La
salida te la muestra la misma app. Se guardan en `servidor/guiones.json`.

```powershell
$os = Get-CimInstance Win32_OperatingSystem
Write-Output ("Encendida hace " + [int]((Get-Date) - $os.LastBootUpTime).TotalHours + " h")
Get-Service | Where-Object { $_.Status -eq 'Stopped' } | Select-Object -First 10 Name
```

### Temporizador de energia
Dormir, apagar o reiniciar con cuenta regresiva. Corre en un proceso aparte
(`servidor/cuentaatras.ps1`), asi que sigue funcionando aunque cierres Remoto o
se caiga el servidor. Para cancelar se borra `cuentaatras.json`.

### Transferencia de archivos
La carpeta `Descargas\Desde-Celular`. En la app, **Mas > Archivos**: tocar un
archivo lo abre en la PC.

---

## Atajos y detalles de la interfaz

| Donde | Que hace |
|---|---|
| App, pantalla de entrada | Teclado en pantalla, solo numeros. Con **ABC** abris letras para la clave |
| App, barras de RAM/disco/bateria | Se llenan de verde mientras crecen, y despues toman el color del nivel |
| App, pestana de abajo | Iconos: inicio, raton, apps, media, mas |
| PC, ventana | Tres botones: Musica, Guiones y Papel |
| PC, bandeja | Clic derecho para abrir, iniciar, arrancar con Windows y salir |


## Saber que celular se conecto

El servidor guarda de que aparato es cada peticion. La app manda su nombre en
la cabecera `x-dispositivo`, y el PC lo muestra abajo en la ventana de Remoto:

```
Celular:  Redmi Note 13   (192.168.1.77)
```

Tambien queda anotado en `servidor/registro.txt` cada vez que entra uno nuevo,
y se puede consultar desde el navegador:

```
http://192.168.1.50:8080/api/clientes
```

Si el celular no manda su nombre (por ejemplo el navegador, o una version
vieja de la app), el servidor intenta deducirlo por la red: primero busca el
nombre del vecino en Windows, despues el DNS inverso, y de ultimo muestra la
direccion MAC.

La PC no se cuenta a si misma entre los celulares conectados.
## Compilar la app de PC

`Remoto.exe` sale de `Remoto.cs`. Necesitas el compilador de .NET que ya
viene con Windows, no hay que instalar nada:

```powershell
& "$env:SystemRoot\Microsoft.NET\Framework64\v4.0.30319\csc.exe" `
  /target:winexe /out:Remoto.exe /win32icon:Remoto.ico `
  /resource:Remoto.ico,Remoto.ico `
  /resource:logo-remoto.png,logo-remoto.png `
  /reference:System.dll /reference:System.Drawing.dll /reference:System.Windows.Forms.dll `
  Remoto.cs RemotoVentanas.cs
```

El logo va embebido dentro del `.exe`, asi que el programa es un solo archivo
y no se rompe si borras los imagenes de al lado.

### Cambiar el logo

`servidor/generar-icono.ps1` dibuja el logo y arma `Remoto.ico` con 9 tamanos
(16 a 256 px):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File generar-icono.ps1
```

Despues hay que recompilar el `.exe` para que tome el logo nuevo.

---

## Compilar la app del celular

Necesitas Node.js 18 o superior, y para el APK tambien Java 17 y el
Android SDK.

```powershell
cd app
npm install
npx expo prebuild --platform android
cd android
gradlew.bat assembleRelease --no-daemon
```

La APK queda en:
`app/android/app/build/outputs/apk/release/app-release.apk`

**Importante:** despues de `prebuild`, hay que volver a agregar la firma en
`app/android/gradle.properties` (no reemplazar el archivo, agregar estas lineas):

```
android.injected.signing.storeFile=RUTA/MI/app/miapp.keystore
android.injected.signing.storePassword=mipc1234
android.injected.signing.keyAlias=miapp
android.injected.signing.keyPassword=mipc1234
```

`miapp.keystore` **no se puede perder**. Sin ese archivo, Android no deja
instalar la version nueva encima de la vieja.

---

## Cambiar el servidor

Edita `servidor/servidor.ps1` y reinicia `Transferir.bat`.

Sirve en el puerto 8080. Cambia `$PUERTO` si choca con otra cosa.

La clave se guarda en `servidor/clave.txt`. Si lo borras, se genera una nueva
al arrancar. Se puede cambiar desde la app o escribiendo a mano ese archivo.

Las rutas de API estan todas juntas mas abajo en `servidor.ps1`, una por
bloque `if ($ruta -eq '...')`.

---

## Seguridad

- La clave viaja en texto plano por la red. Al estar en tu WiFi es aceptable,
  pero no lo abras desde internet.
- El firewall de Windows bloquea el puerto 8080. Hay que abrirlo una vez:
  ```powershell
  New-NetFirewallRule -DisplayName "Remoto" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8080 -Profile Any
  ```
- Si tu router tiene "aislamiento de clientes" activado, no va a funcionar.
  Hay que desactivarlo en los ajustes del router.
- A proposito **no** incluye camara, microfono ni grabacion de pantalla.
  Eso es lo que distingue a una herramienta de control de un spyware.
- A proposito **no** abre puertos hacia internet. Es solo para tu red de casa.

---

## Limitaciones conocidas

**El teclado necesita foco.** Windows manda las teclas a la ventana que esta
en primer plano. Antes de escribir desde el celular, hay que hacer clic en la
ventana de la PC donde quieras escribir.

**La tecla de Windows no se puede enviar.** Windows la bloquea por seguridad
como proteccion contra keyloggers. El boton existe pero no hace nada.

**Solo red local.** No funciona desde datos moviles ni desde fuera de casa.

**Archivos hasta 500 MB.** Para archivos grandes conviene cable USB.

---

## Publicar en GitHub

Los archivos que no van al repositorio ya estan en `.gitignore`:
`node_modules`, `app/android`, la llave de firma, la clave de acceso y el
registro de actividad.

```powershell
cd Remoto-Proyecto
git init
git add .
git commit -m "Remoto: control de la PC desde el celular por WiFi"
```

Despues crea el repositorio vacio en github.com y conectalo:

```powershell
git branch -M main
git remote add origin https://github.com/TU-USUARIO/remoto.git
git push -u origin main
```

---

## Licencia

MIT. Ver `LICENSE`.
