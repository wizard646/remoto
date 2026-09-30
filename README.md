# Remoto

<p align="center">
  <img src="app/icono.png" width="120" alt="Remoto">
</p>

<p align="center">
  <b>Controla tu computadora desde el celular Android, por el WiFi de casa.</b>
</p>

<p align="center">
  Sin internet. Sin cuentas. Sin cable.<br>
  Todo pasa por tu red local y nada sale de tu casa.
</p>

---

## Que puedes hacer desde el celular

| | |
|---|---|
| **Raton** | Mover, hacer clic derecho y rueda, con repeticion al mantener presionado |
| **Teclado** | Teclas sueltas y combinaciones: `Ctrl+C`, `Ctrl+V`, `Alt+Tab`, `Win` |
| **Volumen** | Subir, bajar y silencio |
| **Portapapeles** | Copiar en la PC y traer al celular, en las dos direcciones |
| **Archivos** | Mandar y bajar archivos de hasta 500 MB |
| **Programas** | Abrir lo que tengas instalado, buscarlo por nombre y cerrarlo |
| **Consola** | Guardar scripts con nombre y correrlos |
| **Musica** | Reproducir, pausar y detener, sin abrir ninguna ventana en la PC |
| **Energia** | Apagar, reiniciar, suspender, o programar un temporizador |
| **Captura** | Ver la pantalla de la PC en el celular |

Ademas ves la RAM, el disco, la bateria, la temperatura, los USB conectados
y quien esta conectado a tu red.

---

## Como se ve

<p align="center">
  <img src="app/captura-app.png" width="300" alt="La app en el celular">
</p>

---

## Instalarlo

### En la computadora

```powershell
cd servidor
montar.cmd
```

Eso renombra los archivos, compila `Remoto.exe`, lo firma, abre el puerto
8080 en el firewall y te muestra la direccion para escribir en el celular.

> **El antivirus lo borra.** Remoto manda teclas y clics a la computadora, y
> eso se parece a un virus. Agrega la carpeta a las excepciones de Bitdefender
> antes de instalar. El detalle esta en [COMO-INSTALAR.md](servidor/COMO-INSTALAR.md).

### En el celular

```bash
cd app
npm install
npx expo start
```

O instala el APK ya compilado y escribe la direccion y la clave que te
mostro la computadora.

El celular y la PC deben estar en la misma red WiFi.

---

## Como esta hecho

```
app/          la aplicacion del celular (React Native / Expo)
servidor/     el programa que corre en la PC
```

El servidor es PowerShell y no depende de nada instalado. Lo unico que
necesita es Windows.

**Por que el servidor va partido en dos.** Consultar la RAM, la placa de
red y los dispositivos USB por WMI cuesta entre 4 y 18 segundos. Si el
servidor hiciera eso en cada pedido, la app del celular se congelaba. Un
vigilante separado lo consulta una vez al arrancar y despues solo lo que
cambia rapido, asi que el servidor responde en **20 milisegundos**.

---

## Seguridad

- Clave de acceso obligatoria en cada pedido
- El servidor solo escucha en la red local, nunca en internet
- No hay camara, ni microfono, ni grabacion de pantalla
- No se puede usar desde fuera de tu casa sin abrir un puerto en el
  router, y el programa no lo hace por su cuenta

`app/miapp.keystore` y `servidor/clave.txt` no estan en el repositorio,
estan en `.gitignore` a proposito.

---

## Detalle de cada pantalla

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

El commit ya esta hecho. Para subirlo solo falta crear el repositorio
vacio en github.com y mandar la rama.

**1. Crea el repositorio en la pagina**

Entra en https://github.com/new y ponle:

| Campo | Valor |
|---|---|
| Owner | `wizard646` |
| Nombre del repositorio | `remoto` |
| Visibilidad | Publica o Privada, a tu gusto |
| README | **no** marques nada |

**2. Sube los archivos**

Abre PowerShell y corre:

```powershell
cd $env:USERPROFILE\Remoto-Proyecto
git push -u origin main
```

La primera vez Windows te abre una ventana del navegador para que
inicies sesion en GitHub. Aceptas y listo.

**Si prefieres usar la terminal de GitHub**

```powershell
gh auth login
git push -u origin main
```

**Que NO se sube** (esta en `.gitignore` a proposito)

| Archivo | Por que |
|---|---|
| `app/miapp.keystore` | Es la llave de firma de la app. Con ella cualquiera puede publicar una version con tu nombre. |
| `servidor/clave.txt` | La clave con la que se entra a tu computadora. |
| `servidor/*.ps1`, `*.exe`, `*.ico` | Se generan al instalar. En el repositorio van como `.ps1.txt`. |
| `servidor/registro.txt`, `cache.json` | Son datos de tu equipo, no del programa. |

**Subir un cambio mas adelante**

```powershell
cd $env:USERPROFILE\Remoto-Proyecto
git add .
git commit -m "que cambiaste"
git push
```

---

## Licencia

MIT. Ver `LICENSE`.
