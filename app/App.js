import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Modal,
  StyleSheet, Image, ActivityIndicator, Animated, PanResponder, Easing
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';

// monocromatico. el verde solo se usa mientras las barras se llenan
// y para el rayo de carga. el rojo solo para avisos y acciones peligrosas
const C = {
  bg: '#0A0A0B', card: '#131316', soft: '#1C1C20',
  line: '#222227', txt: '#F4F4F6', dim: '#86868E', faint: '#48484F',
  rojo: '#FF5A52', ambar: '#E9B949', verde: '#32D158'
};

const NOMBRE = (Device.deviceName || Device.modelName || 'Celular')
  + (Device.osVersion ? '  -  Android ' + Device.osVersion : '');

export default function App() {
  const [ip, setIp] = useState('');
  const [clave, setClave] = useState('');
  const [dentro, setDentro] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [vista, setVista] = useState('inicio');
  const [sub, setSub] = useState('usb');
  const [pc, setPc] = useState(null);
  const [conectando, setConectando] = useState(false);

  const [apps, setApps] = useState([]);
  const [buscar, setBuscar] = useState('');
  const [usb, setUsb] = useState([]);
  const [archivos, setArchivos] = useState([]);
  const [abiertos, setAbiertos] = useState([]);
  const [papel, setPapel] = useState('');
  const [resultados, setResultados] = useState(null);
  const [medios, setMedios] = useState([]);
  const [sonando, setSonando] = useState(null);
  const [guiones, setGuiones] = useState([]);
  const [guionSel, setGuionSel] = useState(null);
  const [guionTxt, setGuionTxt] = useState('');
  const [guionSalida, setGuionSalida] = useState('');
  const [cuenta, setCuenta] = useState(null);
  const [nueva, setNueva] = useState('');
  const [captura, setCaptura] = useState(null);
  const [texto, setTexto] = useState('');
  const [dialogo, setDialogo] = useState(null);
  const previo = useRef('');

  useEffect(() => {
    (async () => {
      setIp((await AsyncStorage.getItem('ip')) || '');
      setClave((await AsyncStorage.getItem('clave')) || '');
    })();
  }, []);

  const raiz = () => `http://${ip.replace(/^https?:\/\//, '')}:8080`;

  const pedir = useCallback(async (ruta, extra = {}) => {
    const r = await fetch(raiz() + ruta, {
      ...extra, headers: { 'x-token': clave, 'x-dispositivo': NOMBRE, ...(extra.headers || {}) }
    });
    if (r.status === 401) throw new Error('Clave incorrecta');
    if (!r.ok) throw new Error('Error ' + r.status);
    return r;
  }, [ip, clave]);

  const cargarInfo = useCallback(async () => {
    if (conectando) return;
    setConectando(true);
    try { setPc(await (await pedir('/api/sistema')).json()); }
    catch (e) { setDentro(false); }
    setConectando(false);
  }, [pedir, conectando]);

  useEffect(() => {
    if (!dentro) return;
    cargarInfo();
    const t = setInterval(cargarInfo, 5000);
    return () => clearInterval(t);
  }, [dentro, cargarInfo]);

  // el portapapeles se trae solo al entrar, para que este siempre al dia
  useEffect(() => {
    if (vista === 'papel' && dentro)
      pedir('/api/portapapeles').then(r => r.json()).then(d => setPapel(d.texto || '')).catch(() => {});
  }, [vista, dentro, pedir]);

  useEffect(() => {
    if (!dentro) return;
    if (vista === 'apps' && !apps.length)
      pedir('/api/programas').then(r => r.json()).then(d => setApps(Array.isArray(d) ? d : [])).catch(() => {});
    if (vista === 'media' && !medios.length)
      pedir('/api/reproductor?tipo=listar').then(r => r.json()).then(d => setMedios(Array.isArray(d.medios) ? d.medios : [])).catch(() => {});
    if (vista === 'guiones' && !guiones.length)
      pedir('/api/guiones').then(r => r.json()).then(d => setGuiones(Array.isArray(d.guiones) ? d.guiones : [])).catch(() => {});
    if (vista === 'mas' && sub === 'usb')
      pedir('/api/usb').then(r => r.json()).then(d => setUsb(Array.isArray(d) ? d : [])).catch(() => {});
    if (vista === 'mas' && sub === 'procesos')
      pedir('/api/abiertos').then(r => r.json()).then(d => setAbiertos(Array.isArray(d) ? d : [])).catch(() => {});
    if (vista === 'mas' && sub === 'archivos')
      pedir('/api/archivos').then(r => r.json()).then(setArchivos).catch(() => {});
    if (vista === 'mas' && sub === 'energia') {
      pedir('/api/energia').then(r => r.json()).then(setCuenta).catch(() => {});
      const t = setInterval(() => pedir('/api/energia').then(r => r.json()).then(setCuenta).catch(() => {}), 4000);
      return () => clearInterval(t);
    }
  }, [vista, sub, dentro, apps.length, medios.length, guiones.length, pedir]);

  async function entrar() {
    if (!ip.trim()) return;
    setCargando(true);
    try {
      setPc(await (await pedir('/api/sistema')).json());
      setDentro(true);
      await AsyncStorage.multiSet([['ip', ip.trim()], ['clave', clave]]);
    } catch (e) {
      setDialogo({ titulo: 'No conecta', texto: e.message === 'Clave incorrecta'
        ? 'Revisa la clave.' : 'Revisa que Remoto este abierto en la PC.' });
    }
    setCargando(false);
  }

  async function abrir(que) {
    try {
      const d = await (await pedir('/api/abrir', { method: 'POST', body: que })).json();
      if (d.error) setDialogo({ titulo: 'No se pudo abrir', texto: d.error });
    } catch (e) { setDialogo({ titulo: 'Error', texto: e.message }); }
  }

  function confirmar(titulo, texto, fn, peligro) { setDialogo({ titulo, texto, accion: fn, peligro }); }

  const volumen = a => pedir('/api/volumen', { method: 'POST', body: a }).catch(() => {});
  const bluetooth = a => pedir('/api/bluetooth', { method: 'POST', body: a }).then(cargarInfo).catch(() => {});

  async function portapapeles() {
    try {
      const d = await (await pedir('/api/portapapeles')).json();
      setPapel(d.texto || '');
    } catch (e) { setDialogo({ titulo: 'Error', texto: e.message }); }
  }
  async function enviarPapel() {
    try {
      await pedir('/api/portapapeles', { method: 'POST', body: papel });
      setDialogo({ titulo: 'Listo', texto: 'Pega en la PC con Ctrl+V.' });
    } catch (e) { setDialogo({ titulo: 'Error', texto: e.message }); }
  }

  const player = (tipo, archivo) => pedir(
    '/api/reproductor?tipo=' + tipo + (archivo ? '&archivo=' + encodeURIComponent(archivo) : ''))
    .then(r => r.json()).then(d => {
      if (d.error) setDialogo({ titulo: 'Error', texto: d.error });
      else if (tipo === 'play') setSonando(archivo);
      else if (tipo === 'detener') setSonando(null);
    }).catch(e => setDialogo({ titulo: 'Error', texto: e.message }));

  const correrGuion = nombre => pedir('/api/guiones?tipo=ejecutar&nombre=' + encodeURIComponent(nombre))
    .then(r => r.json()).then(d => setGuionSalida(d.salida || d.error || '(sin salida)'))
    .catch(e => setGuionSalida(e.message));

  const guardarGuion = () => {
    if (!guionSel || !guionTxt.trim()) return;
    pedir('/api/guiones', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: guionSel, contenido: guionTxt })
    }).then(r => r.json()).then(d => {
      setDialogo({ titulo: 'Guion', texto: d.mensaje || d.error });
      pedir('/api/guiones').then(r => r.json()).then(d => setGuiones(d.guiones || [])).catch(() => {});
    }).catch(() => {});
  };

  const temporizador = (tipo, minutos) => pedir(
    '/api/energia?programar=' + tipo + '&minutos=' + minutos, { method: 'POST' })
    .then(() => pedir('/api/energia').then(r => r.json()).then(setCuenta)).catch(() => {});

  const cancelarTemporizador = () => pedir('/api/energia?cancelar=1', { method: 'POST' })
    .then(() => pedir('/api/energia').then(r => r.json()).then(setCuenta)).catch(() => {});

  async function buscarArchivos() {
    if (!buscar.trim()) return;
    try {
      const d = await (await pedir('/api/buscar', { method: 'POST', body: buscar })).json();
      setResultados(Array.isArray(d) ? d : []);
    } catch (e) { setDialogo({ titulo: 'Error', texto: e.message }); }
  }

  const cerrarProc = p => confirmar('Cerrar', `Se va a cerrar ${p.titulo}.`, () =>
    pedir('/api/cerrar', { method: 'POST', body: String(p.pid) })
      .then(() => pedir('/api/abiertos').then(r => r.json()).then(setAbiertos)).catch(() => {}), true);

  function escribir(v) {
    const antes = previo.current;
    previo.current = v;
    if (v.length > antes.length) {
      for (const ch of v.slice(antes.length)) {
        if (ch === ' ') tecla('espacio');
        else if (ch === '\n') tecla('enter');
        else tecla(ch);
      }
    } else if (v.length < antes.length) {
      for (let i = 0; i < antes.length - v.length; i++) tecla('borrar');
    }
  }

  const mover = (dx, dy) => pedir('/api/raton/mover', { method: 'POST', body: JSON.stringify({ dx, dy }) }).catch(() => {});
  const clic = b => pedir('/api/raton/click', { method: 'POST', body: b }).catch(() => {});
  const tecla = t => pedir('/api/tecla', { method: 'POST', body: t }).catch(() => {});

  const acum = useRef({ x: 0, y: 0 });
  const ultimo = useRef(0);
  const posAnt = useRef(null);
  const tapMov = useRef(0);

  const panel = useRef(PanResponder.create({
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponderCapture: () => true,
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => { posAnt.current = null; tapMov.current = 0; },
    onPanResponderMove: (e) => {
      const x = e.nativeEvent.pageX, y = e.nativeEvent.pageY;
      if (posAnt.current) {
        acum.current.x += x - posAnt.current.x;
        acum.current.y += y - posAnt.current.y;
        tapMov.current += Math.abs(x - posAnt.current.x) + Math.abs(y - posAnt.current.y);
      }
      posAnt.current = { x, y };
      const ahora = Date.now();
      if (ahora - ultimo.current >= 40) {
        if (acum.current.x || acum.current.y) {
          const dx = Math.round(acum.current.x * 1.4), dy = Math.round(acum.current.y * 1.4);
          acum.current.x = 0; acum.current.y = 0;
          if (dx || dy) pedir('/api/raton/mover', { method: 'POST', body: JSON.stringify({ dx, dy }) }).catch(() => {});
        }
        ultimo.current = ahora;
      }
    },
    onPanResponderRelease: () => { if (tapMov.current < 8) clic('izq'); posAnt.current = null; },
  })).current;

  const gb = n => (!n ? '0' : (n / 1073741824).toFixed(1));

  if (!dentro) {
    return (
      <Teclado
        ip={ip} setIp={setIp} clave={clave} setClave={setClave}
        entrando={cargando} onEntrar={entrar} onSalir={() => setDialogo(null)}>
        <Dialogo d={dialogo} onCerrar={() => setDialogo(null)} />
      </Teclado>
    );
  }

  const ex = pc?.extra || {};
  const hayBat = pc && pc.bateria >= 0;
  const btOn = pc?.bluetooth ? pc.bluetooth.encendido : null;

  const pestanas = [
    ['inicio', '⌂'], ['raton', '✥'], ['apps', '▦'], ['media', '▶'], ['mas', '⋯']
  ];

  return (
    <View style={s.raiz}>
      <StatusBar style="light" />

      <View style={s.cabeza}>
        <View style={{ flex: 1 }}>
          <Text style={s.nombre} numberOfLines={1}>{pc?.pc || 'Remoto'}</Text>
          <Text style={s.sube} numberOfLines={1}>
            {ex.wifi || 'Sin wifi'} · {pc?.activo ? pc.activo + ' encendida' : 'Conectada'}
          </Text>
        </View>
        <View style={[s.puntoVivo, conectando && { backgroundColor: C.verde }]} />
        <TouchableOpacity onPress={() => setDentro(false)} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
          <Text style={s.salirTxt}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}
        scrollEnabled={vista !== 'raton'} contentContainerStyle={s.cuerpo}>

        {vista === 'inicio' && pc && (
          <>
            <Marca titulo="RAM" valor={gb(pc.ramUsada)}
              sub={`de ${gb(pc.ramTotal)} GB · ${Math.round(pc.ramTotal ? pc.ramUsada / pc.ramTotal * 100 : 0)}%`}
              pct={pc.ramTotal ? pc.ramUsada / pc.ramTotal : 0} />
            <Marca titulo="Disco" valor={gb(pc.discoUsado)}
              sub={`de ${gb(pc.discoTotal)} GB · ${Math.round(pc.discoTotal ? pc.discoUsado / pc.discoTotal * 100 : 0)}%`}
              pct={pc.discoTotal ? pc.discoUsado / pc.discoTotal : 0} />
            {hayBat && (
              <Marca titulo="Bateria" valor={`${pc.bateria}`}
                sub={`%  ·  ${pc.enCarga ? 'cargando' : 'en uso'}`}
                pct={pc.bateria / 100} invertido carga={pc.enCarga} />
            )}
            {ex.temp > 0 && (
              <Marca titulo="Temperatura" valor={`${ex.temp}`} sub="°C"
                pct={Math.max(0, Math.min(1, (ex.temp - 30) / 45))} invertido />
            )}

            <Rejilla
              datos={[
                ['⏬', 'Bajar', () => volumen('bajar')],
                ['⏸', 'Mute', () => volumen('silencio')],
                ['⏫', 'Subir', () => volumen('subir')],
                [btOn ? '⌁' : '⌁', btOn ? 'Apagar BT' : 'Encender BT',
                  () => bluetooth(btOn ? 'apagar' : 'encender'), btOn === null],
                ['✉', 'Correo', () => abrir('https://mail.google.com')],
                ['▶', 'YouTube', () => abrir('https://www.youtube.com')],
                ['▤', 'Carpetas', () => abrir('File Explorer')],
                ['✎', 'Notas', () => abrir('notepad')],
              ]}
            />

            <Seccion t="Portapapeles" />
            <Rejilla datos={[
              ['⤓', 'Traer de la PC', portapapeles],
              ['⤒', 'Poner en la PC', enviarPapel],
            ]} />
            <View style={{ height: 8 }} />
            <TextInput style={s.caja} value={papel} onChangeText={setPapel}
              placeholder="El portapapeles de la PC aparece aqui" placeholderTextColor={C.faint}
              multiline numberOfLines={3} />

            <Seccion t="Buscar en la PC" />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput style={[s.campo, { flex: 1 }]} value={buscar} onChangeText={setBuscar}
                placeholder="Nombre del archivo" placeholderTextColor={C.faint} />
              <Boton t="Buscar" onPress={buscarArchivos} />
            </View>
            {resultados ? resultados.map((r, i) => (
              <Fila key={i} txt={r.nombre} sub={r.ruta} onPress={() => abrir(r.ruta + '\\' + r.nombre)} />
            )) : null}
            {resultados && resultados.length === 0 ? <Text style={s.vacio}>Nada encontrado</Text> : null}

            <Seccion t="Capturar pantalla" />
            <Boton t="Tomar captura" onPress={() => pedir('/api/captura')
              .then(r => r.blob()).then(b => setCaptura(URL.createObjectURL(b)))
              .catch(() => setDialogo({ titulo: 'Error', texto: 'No se pudo capturar' }))} />
            {captura && <Image source={{ uri: captura }} style={s.captura} resizeMode="contain" />}
          </>
        )}

        {vista === 'raton' && (
          <>
            <View style={s.panel} {...panel.panHandlers}>
              <Text style={s.panelTxt}>Arrastra para mover</Text>
            </View>
            <View style={{ height: 10 }} />
            <Rejilla datos={[
              ['◀', 'Izq', () => clic('izq')],
              ['⊙', 'Medio', () => clic('medio')],
              ['▶', 'Der', () => clic('der')],
              ['▲', 'Arriba', () => clic('arriba')],
              ['▼', 'Abajo', () => clic('abajo')],
            ]} />
            <Seccion t="Teclas" />
            <Rejilla datos={[
              ['⏎', 'Enter', () => tecla('enter')],
              ['⌫', 'Borrar', () => tecla('borrar')],
              ['⇥', 'Tab', () => tecla('tab')],
              ['⎋', 'Esc', () => tecla('esc')],
              ['◀', 'Izq', () => tecla('izq')],
              ['▲', 'Arriba', () => tecla('arriba')],
              ['▼', 'Abajo', () => tecla('abajo')],
              ['▶', 'Der', () => tecla('der')],
              ['⌃', 'Ctrl', () => tecla('ctrl')],
              ['⌥', 'Alt', () => tecla('alt')],
              ['⇧', 'Shift', () => tecla('shift')],
              ['␣', 'Espacio', () => tecla('espacio')],
              ['⌦', 'Supr', () => tecla('borrado')],
            ]} cols={4} pequeno />
            <Seccion t="Escribir" />
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'stretch' }}>
              <TextInput style={[s.campo, { flex: 1, minHeight: 62 }]} value={texto} onChangeText={escribir}
                placeholder="Escribe y se manda a la PC" placeholderTextColor={C.faint} multiline />
              <TouchableOpacity style={s.borrar} onPress={() => {
                const n = texto.length; previo.current = ''; setTexto('');
                for (let i = 0; i < n; i++) tecla('borrar');
              }}><Text style={s.borrarTxt}>⌫</Text></TouchableOpacity>
            </View>
            <Text style={s.nota}>La PC tiene que tener abierta la ventana donde quieres escribir.</Text>
          </>
        )}

        {vista === 'apps' && (
          <>
            <TextInput style={[s.campo, { marginBottom: 6 }]} value={buscar}
              onChangeText={setBuscar} placeholder="Buscar" placeholderTextColor={C.faint} />
            {apps.filter(a => a.toLowerCase().includes(buscar.toLowerCase())).map(a => (
              <Fila key={a} txt={a} onPress={() => abrir(a)} />
            ))}
            {apps.length === 0 ? <Text style={s.vacio}>Cargando...</Text> : null}
          </>
        )}

        {vista === 'media' && (
          <>
            <Rejilla datos={[
              ['▶', 'Reproducir', () => player('play', sonando)],
              ['‖', 'Pausa', () => player('pausa')],
              ['■', 'Detener', () => player('detener')],
            ]} />
            {sonando ? (
              <View style={[s.caja, { marginTop: 8 }]}>
                <Text style={s.cajaT}>Sonando</Text>
                <Text style={s.cajaTxt} numberOfLines={1}>{sonando}</Text>
              </View>
            ) : null}
            <Seccion t="En la PC" />
            {medios.length === 0 ? <Text style={s.vacio}>No hay archivos de musica ni video en la PC.</Text> : null}
            {medios.map((m, i) => (
              <Fila key={i} txt={m.nombre} sub={m.tipo + ' · ' + (m.tamano / 1048576).toFixed(1) + ' MB'}
                onPress={() => player('play', m.nombre)}
                activo={sonando === m.nombre} />
            ))}
          </>
        )}

        {vista === 'mas' && (
          <>
            <View style={s.segment}>
              {[['usb', 'USB'], ['procesos', 'Abiertos'], ['archivos', 'Archivos'],
                ['guiones', 'Guiones'], ['energia', 'Energia'], ['clave', 'Clave']].map(([k, t]) => (
                <TouchableOpacity key={k} onPress={() => setSub(k)} style={[s.segItem, sub === k && s.segOn]}>
                  <Text style={[s.segTxt, sub === k && s.segTxtOn]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {sub === 'usb' && (
              <>
                <Text style={s.vacio}>{usb.length} dispositivos</Text>
                {usb.map((u, i) => <Fila key={i} txt={u.nombre} sub={u.conectado ? 'Conectado' : 'No conectado'} />)}
                {usb.length === 0 ? <Text style={s.vacio}>Ninguno detectado</Text> : null}
              </>
            )}

            {sub === 'procesos' && (
              <>
                <Text style={s.vacio}>{abiertos.length} ventanas abiertas</Text>
                {abiertos.map(p => (
                  <Fila key={p.pid} txt={p.titulo} sub={p.nombre} onPress={() => cerrarProc(p)} />
                ))}
                {abiertos.length === 0 ? <Text style={s.vacio}>Nada abierto</Text> : null}
              </>
            )}

            {sub === 'archivos' && (
              <>
                {archivos.length === 0 ? <Text style={s.vacio}>Carpeta vacia</Text> : null}
                {archivos.map(f => (
                  <Fila key={f.nombre} txt={f.nombre} sub={`${(f.tamano / 1024).toFixed(0)} KB`}
                    onPress={() => confirmar('Borrar', `Se borrara ${f.nombre}.`, () =>
                      pedir('/api/borrar?nombre=' + encodeURIComponent(f.nombre), { method: 'POST' })
                        .then(() => pedir('/api/archivos').then(r => r.json()).then(setArchivos))
                        .catch(() => {}), true)} />
                ))}
                <Text style={s.nota}>Toca un archivo para abrirlo en la PC.</Text>
              </>
            )}

            {sub === 'guiones' && (
              <>
                {guiones.length === 0 ? <Text style={s.vacio}>Ningun guion guardado</Text> : null}
                {guiones.map(g => (
                  <Fila key={g.nombre} txt={g.nombre} sub={g.creado}
                    activo={guionSel === g.nombre}
                    onPress={() => { setGuionSel(g.nombre); pedir('/api/guiones?tipo=listar').catch(() => {}); }} />
                ))}
                {guionSel ? (
                  <>
                    <Seccion t={guionSel} />
                    <TextInput style={[s.campo, { minHeight: 88, textAlignVertical: 'top' }]}
                      value={guionTxt} onChangeText={setGuionTxt} multiline
                      placeholder="Comandos de PowerShell, uno por linea" placeholderTextColor={C.faint} />
                    <View style={{ height: 8 }} />
                    <Rejilla datos={[
                      ['▶', 'Correr', () => correrGuion(guionSel)],
                      ['✓', 'Guardar', guardarGuion],
                    ]} />
                    {guionSalida ? (
                      <View style={[s.caja, { marginTop: 12 }]}>
                        <Text style={s.salida}>{guionSalida}</Text>
                      </View>
                    ) : null}
                  </>
                ) : null}
              </>
            )}

            {sub === 'energia' && (
              <>
                {cuenta && cuenta.activo && cuenta.segundos > 0 ? (
                  <View style={[s.caja, { marginBottom: 14, borderColor: C.line }]}>
                    <Text style={s.cajaT}>Pendiente</Text>
                    <Text style={s.salida}>
                      {cuenta.tipo} en {Math.floor(cuenta.segundos / 60)}:{String(cuenta.segundos % 60).padStart(2, '0')}
                    </Text>
                    <View style={{ height: 10 }} />
                    <Boton t="Cancelar" onPress={cancelarTemporizador} />
                  </View>
                ) : null}
                <Seccion t="Dormir en" />
                <Rejilla datos={[['', '5 min', () => temporizador('dormir', 5)],
                  ['', '15 min', () => temporizador('dormir', 15)],
                  ['', '30 min', () => temporizador('dormir', 30)]]} />
                <Seccion t="Apagar en" />
                <Rejilla datos={[['', '15 min', () => temporizador('apagar', 15)],
                  ['', '30 min', () => temporizador('apagar', 30)],
                  ['', '60 min', () => temporizador('apagar', 60)]]} />
                <Seccion t="Ahora" />
                <Rejilla datos={[
                  ['◴', 'Bloquear', () => confirmar('Bloquear', 'La PC pedira tu contrasena.',
                    () => pedir('/api/bloquear', { method: 'POST' }).catch(() => {}))],
                  ['⟳', 'Reiniciar', () => confirmar('Reiniciar', 'Se reiniciara ahora.',
                    () => pedir('/api/energia', { method: 'POST', body: 'reiniciar' }).catch(() => {}), true)],
                  ['⏻', 'Apagar', () => confirmar('Apagar', 'Se apagara ahora.',
                    () => pedir('/api/energia', { method: 'POST', body: 'apagar' }).catch(() => {}), true)],
                ]} />
              </>
            )}

            {sub === 'clave' && (
              <>
                <Text style={s.nota}>Se guarda en la PC. Minimo 4 caracteres.</Text>
                <TecladoMini valor={nueva} onChange={setNueva} />
                <View style={{ height: 12 }} />
                <Boton t="Guardar" principal onPress={async () => {
                  if (nueva.length < 4) return;
                  const d = await (await pedir('/api/clave', { method: 'POST', body: nueva })).json();
                  if (d.error) return setDialogo({ titulo: 'Aviso', texto: d.error });
                  setClave(nueva); setNueva('');
                  await AsyncStorage.setItem('clave', nueva);
                  setDialogo({ titulo: 'Listo', texto: 'Clave cambiada' });
                }} />
                <Text style={[s.nota, { marginTop: 26, textAlign: 'center' }]}>
                  Funciona solo dentro de tu red WiFi.
                </Text>
              </>
            )}
          </>
        )}
      </ScrollView>

      <View style={s.nav}>
        {pestanas.map(([k, ico]) => (
          <TouchableOpacity key={k} onPress={() => setVista(k)} style={s.navItem}>
            <Text style={[s.navIco, vista === k && s.navOn]}>{ico}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Dialogo d={dialogo} onCerrar={() => setDialogo(null)} />
    </View>
  );
}

// ---------------- entrada con teclado de numeros --------------------
function Teclado({ ip, setIp, clave, setClave, entrando, onEntrar, children }) {
  const [foco, setFoco] = useState('ip');
  const [letras, setLetras] = useState(false);
  const enClave = foco === 'clave';
  const val = enClave ? clave : ip;
  const setVal = enClave ? setClave : setIp;

  const numeros = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '·', '0', '⌫'];
  const alfabeto = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l',
    'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];

  function pulsa(t) {
    if (t === '⌫') { setVal(val.slice(0, -1)); return; }
    if (t === '·') { setVal(val + '.'); return; }
    setVal(val + t);
  }

  return (
    <View style={s.entrada}>
      <StatusBar style="light" />
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Image source={require('./icono.png')} style={s.logo} resizeMode="contain" />
        <Text style={s.tituloApp}>Remoto</Text>
        <View style={{ height: 40 }} />

        <Text style={s.et}>DIRECCION DE LA PC</Text>
        <View style={[s.campo, s.campoNum, foco === 'ip' && s.campoOn]}>
          <Text style={s.campoNumT} numberOfLines={1}>{ip || '192.168.1.50'}</Text>
        </View>

        <Text style={[s.et, { marginTop: 18 }]}>CLAVE</Text>
        <View style={[s.campo, s.campoNum, foco === 'clave' && s.campoOn]}>
          <Text style={s.campoNumT} numberOfLines={1}>{clave || '6 caracteres'}</Text>
        </View>

        <View style={{ height: 10 }} />
        <View style={s.filaT}>
          {['ip', 'clave'].map(f => (
            <TouchableOpacity key={f} onPress={() => setFoco(f)} style={[s.pastilla, foco === f && s.pastillaOn]}>
              <Text style={[s.pastillaT, foco === f && s.pastillaTOn]}>{f === 'ip' ? 'IP' : 'Clave'}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={() => setLetras(!letras)} style={[s.pastilla, letras && s.pastillaOn]}>
            <Text style={[s.pastillaT, letras && s.pastillaTOn]}>ABC</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 16 }} />
        <View style={s.pad}>
          {numeros.map(n => (
            <TouchableOpacity key={n} style={s.teclaPad} onPress={() => pulsa(n)} activeOpacity={0.6}>
              <Text style={s.teclaPadT}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {letras ? (
          <View style={s.pad}>
            {alfabeto.map(n => (
              <TouchableOpacity key={n} style={s.teclaPad} onPress={() => pulsa(n)} activeOpacity={0.6}>
                <Text style={s.teclaPadT}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        <View style={{ height: 18 }} />
        <TouchableOpacity style={s.principal} onPress={onEntrar} disabled={entrando}>
          {entrando ? <ActivityIndicator color="#0A0A0B" /> : <Text style={s.principalTxt}>Entrar</Text>}
        </TouchableOpacity>
      </View>
      {children}
    </View>
  );
}

// teclado pequeno para cambiar la clave
function TecladoMini({ valor, onChange }) {
  const [letras, setLetras] = useState(true);
  const nums = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '·', '0', '⌫'];
  const letras = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l',
    'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '-', '_'];
  const pulsa = t => {
    if (t === '⌫') return onChange(valor.slice(0, -1));
    if (t === '·') return onChange(valor + '.');
    onChange(valor + t);
  };
  return (
    <View>
      <View style={[s.campo, s.campoNum]}>
        <Text style={s.campoNumT}>{valor || 'nueva clave'}</Text>
      </View>
      <View style={{ height: 10 }} />
      <View style={s.pad}>
        {(letras ? letras : nums).map(n => (
          <TouchableOpacity key={n} style={s.teclaPad} onPress={() => pulsa(n)} activeOpacity={0.6}>
            <Text style={s.teclaPadT}>{n}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ height: 8 }} />
      <View style={s.filaT}>
        <TouchableOpacity onPress={() => setLetras(!letras)} style={[s.pastilla, letras && s.pastillaOn]}>
          <Text style={[s.pastillaT, letras && s.pastillaTOn]}>ABC</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setLetras(false)} style={[s.pastilla, !letras && s.pastillaOn]}>
          <Text style={[s.pastillaT, !letras && s.pastillaTOn]}>123</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ---------------- piezas -------------------------------------------
function Dialogo({ d, onCerrar }) {
  if (!d) return null;
  return (
    <Modal transparent animationType="fade" onRequestClose={onCerrar}>
      <TouchableOpacity style={s.velo} activeOpacity={1} onPress={onCerrar}>
        <TouchableOpacity style={s.modal} activeOpacity={1} onPress={() => {}}>
          <View style={s.punto} />
          <Text style={s.modalT}>{d.titulo}</Text>
          {d.texto ? <Text style={s.modalX}>{d.texto}</Text> : null}
          <TouchableOpacity style={[s.modalB, d.accion && d.peligro ? { backgroundColor: C.rojo } : {}]}
            onPress={() => { if (d.accion) d.accion(); onCerrar(); }}>
            <Text style={[s.modalBT, d.accion && d.peligro ? { color: '#fff' } : null]}>
              {d.accion ? 'Confirmar' : 'Entendido'}
            </Text>
          </TouchableOpacity>
          {d.accion ? (
            <TouchableOpacity style={s.modalBS} onPress={onCerrar}><Text style={s.modalBST}>Cancelar</Text></TouchableOpacity>
          ) : null}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function Seccion({ t }) { return <Text style={s.seccion}>{t}</Text>; }

function nivel(pct) {
  if (pct >= 0.90) return C.rojo;
  if (pct >= 0.75) return C.ambar;
  return C.txt;
}

// la barra se llena de verde mientras crece, y despues toma el color
// del nivel: blanco normal, ambar 75-90 %, rojo mas de 90 %
function Marca({ titulo, valor, sub, pct, invertido, carga }) {
  const p = Math.max(0, Math.min(100, Math.round(pct * 100)));
  const col = nivel(invertido ? 1 - pct : pct);
  const ancho = useRef(new Animated.Value(0)).current;
  const [llenando, setLlenando] = useState(false);

  useEffect(() => {
    setLlenando(true);
    ancho.setValue(0);
    Animated.timing(ancho, {
      toValue: p, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: false
    }).start(() => setLlenando(false));
  }, [p]);

  return (
    <View style={s.marca}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={s.marcaT}>{titulo}</Text>
        {carga ? <Text style={s.rayo}>⚡</Text> : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 5, marginTop: 5, marginBottom: 11 }}>
        <Text style={[s.marcaV, col !== C.txt && { color: col }]}>{valor}</Text>
        <Text style={s.marcaU}>{sub}</Text>
      </View>
      <View style={s.pista}>
        <Animated.View style={[
          s.relleno,
          { width: ancho.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
            backgroundColor: llenando ? C.verde : (col === C.txt ? C.soft : col) }
        ]} />
      </View>
    </View>
  );
}

function Boton({ t, onPress, principal }) {
  return (
    <TouchableOpacity style={[s.boton, principal && s.principal]} onPress={onPress} activeOpacity={0.65}>
      <Text style={[s.botonT, principal && s.principalT]}>{t}</Text>
    </TouchableOpacity>
  );
}

// rejilla de botones con icono encima y rotulo chico debajo
function Rejilla({ datos, cols, pequeno }) {
  const c = cols || 3;
  const ancho = (100 - (c - 1) * 2) / c;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -1 }}>
      {datos.map(([ico, txt, fn, off], i) => (
        <TouchableOpacity key={txt + i} onPress={fn} disabled={off} activeOpacity={0.6}
          style={[s.celda, { width: ancho + '%' }, pequeno && { paddingVertical: 9 }]}>
          <View style={[s.celdaInt, off && { opacity: 0.3 }]}>
            {ico ? <Text style={s.celdaIco}>{ico}</Text> : <View style={{ height: pequeno ? 4 : 18 }} /> }
            <Text style={s.celdaT} numberOfLines={1}>{txt}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function Fila({ txt, sub, onPress, ultimo, activo }) {
  return (
    <TouchableOpacity style={[s.fila, ultimo && s.filaF, activo && s.filaOn]}
      onPress={onPress} activeOpacity={0.5}>
      <View style={{ flex: 1 }}>
        <Text style={s.filaT} numberOfLines={1}>{txt}</Text>
        {sub ? <Text style={s.filaS} numberOfLines={1}>{sub}</Text> : null}
      </View>
      {onPress ? <Text style={s.chev}>›</Text> : null}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  entrada: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 30, paddingBottom: 18 },
  logo: { width: 66, height: 66, borderRadius: 17, alignSelf: 'center', marginBottom: 14 },
  tituloApp: { fontSize: 32, fontWeight: '600', color: C.txt, letterSpacing: -1, textAlign: 'center' },

  et: { fontSize: 10, color: C.faint, fontWeight: '600', letterSpacing: 1.1, marginBottom: 8 },
  campo: { backgroundColor: C.card, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 15, color: C.txt, fontSize: 15, borderWidth: 1, borderColor: C.line },
  campoNum: { paddingVertical: 17 },
  campoNumT: { color: C.txt, fontSize: 19, fontFamily: 'monospace', letterSpacing: 1 },
  campoOn: { borderColor: C.dim },

  filaT: { flexDirection: 'row', gap: 8 },
  pastilla: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  pastillaOn: { backgroundColor: C.soft, borderColor: C.faint },
  pastillaT: { color: C.faint, fontSize: 12, fontWeight: '600' },
  pastillaTOn: { color: C.txt },

  pad: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3 },
  teclaPad: { width: '33.33%', paddingVertical: 13, alignItems: 'center' },
  teclaPadT: { color: C.txt, fontSize: 21, fontWeight: '400' },

  principal: { backgroundColor: C.txt, borderRadius: 15, paddingVertical: 16, alignItems: 'center' },
  principalT: { color: C.bg, fontWeight: '700', fontSize: 15 },
  principalTxt: { color: C.bg, fontWeight: '700', fontSize: 16 },

  raiz: { flex: 1, backgroundColor: C.bg },
  cabeza: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, paddingTop: 50, paddingBottom: 14, gap: 14 },
  nombre: { fontSize: 23, fontWeight: '600', color: C.txt, letterSpacing: -0.5 },
  sube: { fontSize: 12, color: C.dim, marginTop: 2 },
  puntoVivo: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.faint },
  salirTxt: { color: C.faint, fontSize: 19, paddingHorizontal: 4 },

  cuerpo: { paddingHorizontal: 22, paddingBottom: 24, paddingTop: 4 },
  seccion: { fontSize: 11, color: C.faint, fontWeight: '600', letterSpacing: 1, marginTop: 26, marginBottom: 11 },

  marca: { backgroundColor: C.card, borderRadius: 18, padding: 16, marginBottom: 8 },
  marcaT: { fontSize: 12, color: C.dim, fontWeight: '500' },
  marcaV: { fontSize: 21, color: C.txt, fontWeight: '600', letterSpacing: -0.3 },
  marcaU: { fontSize: 12, color: C.dim, marginBottom: 3 },
  rayo: { fontSize: 13, color: C.verde },
  pista: { height: 3, backgroundColor: C.soft, borderRadius: 2, overflow: 'hidden' },
  relleno: { height: 3, borderRadius: 2 },

  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  celda: { padding: 1 },
  celdaInt: { backgroundColor: C.card, borderRadius: 15, paddingVertical: 15, alignItems: 'center', borderWidth: 1, borderColor: C.line },
  celdaIco: { color: C.txt, fontSize: 19, marginBottom: 7 },
  celdaT: { color: C.dim, fontSize: 11, fontWeight: '500' },

  boton: { backgroundColor: C.card, borderRadius: 13, paddingVertical: 14, paddingHorizontal: 17, borderWidth: 1, borderColor: C.line, alignItems: 'center' },
  botonT: { color: C.txt, fontSize: 14, fontWeight: '500' },

  caja: { backgroundColor: C.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.line, color: C.dim, fontSize: 13, lineHeight: 19 },
  cajaT: { color: C.faint, fontSize: 10, fontWeight: '600', letterSpacing: 1, marginBottom: 5 },
  salida: { color: C.dim, fontSize: 12, fontFamily: 'monospace', lineHeight: 17 },

  panel: { height: 250, backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  panelTxt: { color: C.faint, fontSize: 14 },
  borrar: { backgroundColor: C.soft, borderRadius: 14, paddingHorizontal: 18, justifyContent: 'center' },
  borrarTxt: { color: C.txt, fontSize: 19 },

  segment: { flexDirection: 'row', backgroundColor: C.card, borderRadius: 13, padding: 4, marginBottom: 14, flexWrap: 'wrap' },
  segItem: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  segOn: { backgroundColor: C.soft },
  segTxt: { fontSize: 12, color: C.faint, fontWeight: '600' },
  segTxtOn: { color: C.txt },

  captura: { width: '100%', height: 195, borderRadius: 15, backgroundColor: C.card, marginTop: 16 },
  fila: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  filaF: { borderBottomWidth: 0 },
  filaOn: { opacity: 1 },
  filaT: { fontSize: 15, color: C.txt },
  filaS: { fontSize: 12, color: C.dim, marginTop: 3 },
  chev: { color: C.faint, fontSize: 19, marginLeft: 12 },
  vacio: { color: C.faint, fontSize: 14, paddingVertical: 14 },
  nota: { color: C.dim, fontSize: 12, marginTop: 14, lineHeight: 18 },

  nav: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line, paddingVertical: 9 },
  navItem: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  navIco: { fontSize: 21, color: C.faint },
  navOn: { color: C.txt },

  velo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  modal: { width: '100%', backgroundColor: C.card, borderRadius: 26, padding: 24, alignItems: 'center' },
  punto: { width: 36, height: 4, borderRadius: 2, backgroundColor: C.soft, marginBottom: 18 },
  modalT: { fontSize: 19, fontWeight: '600', color: C.txt, textAlign: 'center' },
  modalX: { fontSize: 14, color: C.dim, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  modalB: { marginTop: 18, backgroundColor: C.soft, borderRadius: 15, paddingVertical: 14, alignItems: 'center', width: '100%' },
  modalBT: { color: C.txt, fontWeight: '600', fontSize: 15 },
  modalBS: { marginTop: 4, paddingVertical: 11, alignItems: 'center', width: '100%' },
  modalBST: { color: C.dim, fontWeight: '500', fontSize: 15 },
});
