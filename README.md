# AutoClick Control Panel

Un frontend moderno y elegante para la API de AutoClick con tema Solarized-dark.

## Características

### 🎯 Funcionalidades Principales
- **Configuración Completa**: Soporte para todos los parámetros de la API
- **Contador de Clicks**: Visualización en tiempo real con animaciones
- **Prueba de Velocidad**: Medición precisa de rendimiento
- **Gestión de DelayClicks**: Agregar/eliminar configuraciones dinámicamente
- **Log de Actividad**: Seguimiento detallado de todas las operaciones

### 🎨 Diseño y UX
- **Tema Solarized-dark**: Colores profesionales y amigables para los ojos
- **Diseño Responsivo**: Adaptable a diferentes tamaños de pantalla
- **Animaciones Suaves**: Transiciones y efectos visuales elegantes
- **Notificaciones Toast**: Retroalimentación inmediata al usuario

### ⚙️ Configuración
- **Persistencia**: Configuración automáticamente guardada en localStorage
- **Atajos de Teclado**: F1 (iniciar), F2 (detener), F3 (guardar coordenadas)
- **Validaciones**: Formularios con validación en tiempo real
- **Auto-guardado**: Configuración guardada cada 5 segundos

## Estructura de Archivos

```
AutoplayClick/
├── index.html      # Estructura principal HTML
├── styles.css      # Estilos Solarized-dark
├── script.js       # Lógica de la aplicación
└── README.md       # Documentación
```

## Uso

1. **Configuración Inicial**:
   - Ingresa el título de la ventana objetivo
   - Selecciona el modo de activación (KEY, MOUSE, AUTO)
   - Configura el intervalo y modo de velocidad
   - Agrega los DelayClicks necesarios

2. **Operación**:
   - Presiona "Iniciar AutoClick" o F1
   - Monitorea el contador de clicks en tiempo real
   - Usa "Detener" o F2 para parar
   - Presiona F3 para guardar coordenadas del mouse

3. **Pruebas de Velocidad**:
   - Configura el número de clicks de prueba
   - Ejecuta la prueba para medir rendimiento
   - Revisa métricas: tiempo total, clicks/segundo, intervalo real

## API Endpoint

La aplicación se conecta a: `http://localhost:8080/api/autoclick/start`

### Estructura de Datos Enviados

```json
{
  "title": "NombreVentana",
  "mode": "KEY|MOUSE|AUTO",
  "interval": 100,
  "speedMode": "MS|MC|NN",
  "delayClicks": [
    {
      "delay": 0,
      "count": 10
    }
  ]
}
```

## Personalización

### Colores Solarized-dark
- **Base**: #002b36 (fondo principal)
- **Secundario**: #073642 (paneles)
- **Acentos**: #2aa198 (cyan), #268bd2 (azul), #859900 (verde)
- **Alertas**: #dc322f (rojo), #b58900 (amarillo), #cb4b16 (naranja)

### Modificaciones CSS
Los colores están definidos en variables CSS al inicio de `styles.css` para fácil personalización:

```css
:root {
    --base03: #002b36;
    --cyan: #2aa198;
    --blue: #268bd2;
    /* ... más variables */
}
```

## Características Técnicas

### JavaScript
- **Clase Principal**: `AutoClickApp`
- **Gestión de Estado**: Control completo del estado de la aplicación
- **Comunicación API**: Fetch API con manejo de errores
- **Persistencia**: localStorage para configuración
- **Eventos**: Listeners para teclado y mouse

### CSS
- **Grid Layout**: Layout responsivo con CSS Grid
- **Flexbox**: Alineación y distribución de elementos
- **Animaciones**: Transiciones suaves y efectos hover
- **Media Queries**: Adaptabilidad móvil completa

### HTML
- **Semántico**: Estructura HTML5 semántica
- **Accesibilidad**: Labels, roles y atributos ARIA
- **Font Awesome**: Iconografía profesional
- **Formularios**: Validación nativa del navegador

## Compatibilidad

- **Navegadores Modernos**: Chrome, Firefox, Safari, Edge
- **Dispositivos**: Desktop, tablet, móvil
- **Resoluciones**: Desde 320px hasta 4K

## Instalación

1. Clona o descarga los archivos
2. Asegúrate de que tu API esté ejecutándose en `localhost:8080`
3. Abre `index.html` en tu navegador
4. ¡Listo para usar!

## Troubleshooting

### Problemas Comunes

1. **Error de Conexión**: Verifica que la API esté ejecutándose
2. **CORS**: Configura CORS en tu servidor Spring Boot
3. **Configuración No Se Guarda**: Verifica que localStorage esté habilitado

### Configuración CORS para Spring Boot

```java
@CrossOrigin(origins = "*")
@RestController
public class AutoClickController {
    // ... tu código
}
```

## Próximas Mejoras

- [ ] Soporte para múltiples perfiles de configuración
- [ ] Exportar/importar configuraciones
- [ ] Gráficos de rendimiento en tiempo real
- [ ] Modo oscuro/claro alternativo
- [ ] Soporte para macros más complejos
