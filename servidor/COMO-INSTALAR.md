# Instalar Remoto en la computadora

Los archivos llegan con `.txt` al final porque el antivirus de Windows
(Bitdefender) borra los `.ps1` y los `.exe` de esta herramienta. No es
un problema del codigo: Remoto envia teclas y clics a la computadora, y
eso se parece a un virus. La solucion es agregar la carpeta a las
excepciones del antivirus.

## 1. Excepcion en Bitdefender (obligatorio)

Bitdefender > Proteccion > Amenazas > Excepciones > Agregar carpeta

Agrega la carpeta donde dejaste Remoto. Sin esto, los archivos se borran
solos a los pocos segundos.

## 2. Sacarles el `.txt`

```
servidor.ps1.txt       ->  servidor.ps1
monitor-cache.ps1.txt  ->  monitor-cache.ps1
cuentaatras.ps1.txt    ->  cuentaatras.ps1
Remoto.cs.txt          ->  Remoto.cs
RemotoVentanas.cs.txt  ->  RemotoVentanas.cs
montar.ps1.txt         ->  montar.ps1
```

En Windows, aktivando la vista de extensiones: Explorador de archivos >
Ver > Mostrar > Casilla de "Extensiones de nombre de archivo".

## 3. Montar

Doble clic en `montar.cmd`. Se encarga de:

- renombrar los `.txt` a su extension real
- compilar `Remoto.exe` y firmarlo con el certificado de Remoto
- crear `clave.txt` si no existe

## 4. Arrancar

Abre `Remoto.exe`. La app muestra la direccion para escribir en el
celular y un boton para encender o detener el servidor.

---

## Como esta armado

| Archivo | Para que sirve |
|---|---|
| `servidor.ps1` | El servidor. Escucha en el puerto 8080 y habla con el celular. |
| `monitor-cache.ps1` | El vigilante. Cada 2 segundos escribe `cache.json` con RAM, bateria, disco y procesos. |
| `cuentaatras.ps1` | El temporizador de energia. Vive aparte para que la orden se cumpla aunque el servidor se cierre. |
| `Remoto.cs` | La ventana principal de la app de PC. |
| `RemotoVentanas.cs` | Las ventanas de musica, guiones y portapapeles. |
| `index.html` | La pagina que se abre en un navegador de la computadora. |
| `montar.ps1` | Arma todo lo anterior. |

## Por que el servidor va separado del vigilante

Consultar la RAM, la placa de red y los dispositivos USB por WMI cuesta
entre 4 y 18 segundos. Si el servidor hiciera eso en cada pedido, la
app del celular se congelaba. El vigilante lo consulta una vez y
despues solo lo que cambia rapido, asi que el servidor responde en
20-50 milisegundos.