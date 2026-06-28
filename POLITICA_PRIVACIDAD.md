# Política de Privacidad y Términos de Uso

**Miniapps Escolar — Plataforma de gestión escolar con IA**
Vigente a partir del ciclo escolar 2025–2026

---

## 1. Responsable del tratamiento de datos

La presente plataforma es desarrollada y administrada por **Miniapps (JakoSoft)**, en cumplimiento de la *Ley Federal de Protección de Datos Personales en Posesión de los Particulares* (LFPDPPP) y demás normativa aplicable.

Para consultas relacionadas con esta política: [soporte vía WhatsApp](https://wa.me/5272222478493)

---

## 2. Datos que se recopilan

La plataforma recopila y almacena únicamente los datos necesarios para la gestión escolar interna:

- **Datos de alumnos:** nombre completo, CURP, grado, grupo, escuela de adscripción y calificaciones por periodo
- **Datos de usuarios del sistema:** nombre, correo electrónico, rol (supervisor, director, docente) y CCT de la escuela asignada
- **Registros de actividad:** cambios en calificaciones, altas y bajas de alumnos, accesos al sistema (con fines de auditoría interna)

---

## 3. Finalidad del tratamiento

Los datos recopilados tienen una **finalidad exclusivamente interna** y se utilizan para:

- Gestión y seguimiento de calificaciones por periodo
- Generación de reportes y boletas de evaluación
- Análisis de aprovechamiento escolar por grado, escuela y zona
- Control de movimientos de alumnos (altas, bajas, traslados)
- Auditoría de cambios realizados por usuarios del sistema

> **Los datos no serán compartidos, vendidos, cedidos ni transferidos a terceros** bajo ninguna circunstancia, salvo requerimiento expreso de autoridad competente.

---

## 4. Almacenamiento y seguridad de los datos

Los datos se almacenan en **Supabase** (PostgreSQL), plataforma con certificaciones internacionales de seguridad. La plataforma implementa:

- **Cifrado en tránsito:** toda comunicación usa HTTPS/TLS
- **Cifrado en reposo:** los datos almacenados están cifrados de forma automática
- **Autenticación segura:** acceso con correo y contraseña verificados mediante Supabase Auth
- **Control de acceso por roles:** cada usuario ve únicamente lo que le corresponde según su rol (supervisor, director o docente)
- **Seguridad en base de datos (RLS):** la escritura directa desde el navegador está bloqueada; las operaciones sensibles se procesan en el servidor con validación de identidad y permisos

> Los servidores de Supabase operan en infraestructura de Amazon Web Services (AWS), que puede incluir centros de datos ubicados fuera del territorio mexicano, en cumplimiento con los estándares de seguridad internacionales aplicables.

---

## 5. Uso de Inteligencia Artificial (IA)

Esta plataforma incorpora un módulo opcional de generación de observaciones con Inteligencia Artificial, utilizando el modelo **Claude Sonnet de Anthropic**. Al activar esta función:

- El sistema envía a la API de Anthropic únicamente el nombre del campo formativo, la calificación del alumno y la descripción opcional proporcionada por el docente
- **No se envían datos de identificación del alumno** (nombre, CURP u otros) a servicios externos
- Anthropic no almacena estos datos de forma permanente ni los utiliza para entrenamiento sin consentimiento explícito, conforme a su política de privacidad vigente
- El uso de este módulo es **voluntario**; el docente puede redactar observaciones manualmente sin activarlo

> **El docente es responsable de revisar, validar y, en su caso, modificar el texto generado antes de guardarlo.** La plataforma no garantiza la exactitud, pertinencia ni idoneidad del contenido producido por la IA.

---

## 6. Responsabilidad sobre los datos capturados

La plataforma provee las herramientas técnicas para la captura, consulta y gestión de información escolar. Sin embargo:

- **Cada usuario es responsable de la veracidad, exactitud y pertinencia de los datos que registra** en el sistema
- El desarrollador y los administradores de la plataforma **no se hacen responsables** por datos falsos, alterados, incompletos, capturados con error o que no correspondan a la realidad escolar
- Todos los cambios en calificaciones quedan registrados en el módulo de **Auditoría**, con identificación del usuario, fecha y hora

| Escenario | Responsable |
|-----------|-------------|
| Docente captura calificación incorrecta | El docente |
| Director registra alumno con datos erróneos | El director |
| Usuario modifica datos sin autorización | El usuario (queda en auditoría) |
| La plataforma muestra lo que el usuario capturó | El usuario que capturó |
| Falla de infraestructura de Supabase / AWS | Proveedor (fuerza mayor) |

---

## 7. Derechos ARCO

En cumplimiento de la LFPDPPP, los usuarios tienen derecho a **Acceder, Rectificar, Cancelar u Oponerse** al tratamiento de sus datos personales. Para ejercer estos derechos, comuníquese con soporte a través de [WhatsApp](https://wa.me/5272222478493).

---

## 8. Modificaciones a esta política

Esta política podrá actualizarse cuando sea necesario. Los cambios serán notificados a través de la propia plataforma. El uso continuado del sistema implica la aceptación de la versión vigente.

---

## 9. Aceptación

Al ingresar a **Miniapps Escolar**, el usuario declara haber leído, comprendido y aceptado la presente Política de Privacidad y Términos de Uso.

---

## 10. Implementación en el inicio de sesión

La aceptación de esta política está integrada directamente en la pantalla de login:

- Al cargar la pantalla de acceso se muestra un **checkbox obligatorio** con la leyenda de aceptación de la Política de Privacidad y Términos de Uso, junto con un enlace a este documento
- El botón **"Iniciar sesión"** permanece deshabilitado hasta que el usuario marca el checkbox
- El checkbox **no persiste entre sesiones**: se restablece en cada visita, de modo que el usuario debe aceptar activamente en cada ingreso

| Elemento | Comportamiento |
|----------|----------------|
| Checkbox de política | Obligatorio antes de iniciar sesión |
| Botón de acceso | Deshabilitado mientras el checkbox no esté marcado |
| Enlace a política | Abre la página `/privacidad` en pestaña nueva |
| Persistencia | Ninguna — se reinicia con cada carga de página |

---

*Miniapps Escolar · JakoSoft © 2026 · Versión 2.0*
