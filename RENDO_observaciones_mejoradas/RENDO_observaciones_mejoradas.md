# Rendo — Observaciones de pruebas funcionales

Documento consolidado a partir de las pruebas realizadas. Se mantuvieron las capturas originales y se reformularon las observaciones para que sean más claras, breves y accionables.

## Marketplace y filtros

### 1. Favicon incorrecto
El favicon de la pestaña aparece como un triángulo en lugar del logo de Rendo.

![Captura 1](capturas/01-favicon-rendo.png)

### 2. Filtro “Palabras clave” poco claro
No queda claro qué campos o contenido consulta el filtro “Palabras clave”. Conviene aclarar su alcance o agregar un ejemplo.

![Captura 2](capturas/02-filtro-palabras-clave.png)

### 3. Categorías inconsistentes
En Marketplace faltan categorías que sí aparecen en el Panel Gestor, como Cabaña, Salón de Eventos y Cancha. Conviene unificar ambos listados.

![Captura 3](capturas/03-categorias-marketplace.png)

### 4. Filtro de zonas limitado
El filtro de zonas no contempla con claridad propiedades fuera de las zonas predefinidas, por ejemplo quintas o salones ubicados sobre la ruta.

![Captura 4](capturas/04-filtro-zonas.png)

### 5. Comportamiento del campo de precio
Al ingresar el precio mínimo y presionar Enter, no avanza al siguiente campo ni ejecuta una acción visible.

### 6. Moneda del rango de precios
El filtro está expresado únicamente en ARS. Confirmar si también debe admitir precios en USD.

![Captura 5](capturas/05-rango-precios.png)

### 7. Visibilidad de contraseña inconsistente
El control para mostrar/ocultar la contraseña no aparece de forma consistente en todos los navegadores o formularios.

![Captura 6](capturas/06-login-contrasena.png)

### 8. Zonas poco claras
La lógica y las opciones del filtro de zonas no resultan del todo claras y deberían revisarse para evitar ambigüedades.

![Captura 7](capturas/07-marketplace-filtros.png)

## Acceso, registro y cuenta

### 9. Bloqueo durante el flujo
La interfaz quedó bloqueada durante la navegación y fue necesario volver a ingresar para continuar.

![Captura 8](capturas/08-convertirse-gestor.png)

### 10. Error al convertirse en Gestor
Al reintentar la activación del rol Gestor, aparece el mensaje: “Error al actualizar el perfil. Intenta nuevamente”.

![Captura 9](capturas/09-error-conversion-gestor.png)

### 11. Gestión de perfil
No se encontró una opción visible para consultar o editar el perfil de usuario.

### 12. Baja de cuenta
No se encontró una opción para eliminar o dar de baja una cuenta de Inquilino/Buscador.

### 13. Acceso al registro
En algunas vistas no resulta evidente cómo crear una cuenta. En la pantalla de inicio de sesión posterior sí aparece “Crear cuenta”, por lo que conviene revisar la consistencia del acceso.

### 14. Diferencia entre navegadores
En Microsoft Edge sí aparece el control para mostrar la contraseña, a diferencia de otras pruebas. Revisar consistencia entre navegadores.

![Captura 10](capturas/10-registro-edge.png)

### 15. Mensaje sin traducir
Al intentar registrar un correo ya existente, el sistema muestra “User already registered” en inglés. Debería mostrarse en español.

![Captura 11](capturas/11-user-already-registered.png)

## Panel Gestor y gestión de unidades

### 16. Listado de categorías más completo
El Panel Gestor incluye más categorías que Marketplace. Conviene usar el mismo catálogo en ambos sectores.

![Captura 12](capturas/12-categorias-panel-gestor.png)

### 17. Valor “none” visible
El campo Grupo/Edificio muestra “none”. Debería reemplazarse por una etiqueta comprensible en español o quedar vacío cuando no corresponda.

### 18. Uso de emojis
Revisar el uso de emojis en títulos y secciones si se busca una interfaz más sobria y consistente.

### 19. Zona operativa
El campo Zona aparece como opcional y sus opciones no son claras. Revisar si debe ser obligatorio y qué valores debe ofrecer.

### 20. Edición limitada
Durante la edición, se reportó que solo era posible modificar la categoría “Departamento”. Revisar el cambio entre categorías.

![Captura 13](capturas/13-datos-basicos-grupo-zona.png)

### 21. Acción Cancelar
Al cancelar dentro del flujo de configuración de una unidad, el sistema vuelve al panel principal. Confirmar si ese comportamiento es el esperado.

### 22. Bloqueo en Galería de Fotos
La interfaz volvió a quedar bloqueada durante la carga o selección de imágenes.

![Captura 14](capturas/14-galeria-fotos.png)

### 23. Menú lateral durante el scroll
El menú lateral no acompaña correctamente el desplazamiento. Debería mantenerse accesible o dejar de mostrarse cuando ya no sea útil.

![Captura 15](capturas/15-menu-lateral-geolocalizacion.png)

### 24. Persistencia de geolocalización
Al salir de la sección, el campo de dirección se vacía aunque la ubicación continúa marcada en el mapa.

![Captura 16](capturas/16-geolocalizacion-campo.png)

### 25. Estabilidad general
Se observaron bloqueos frecuentes durante el flujo de carga y edición de unidades.

### 26. Guardado de cambios
En determinadas pruebas no fue posible guardar los cambios realizados en una unidad.

### 27. Capitalización inconsistente
La categoría aparece como “casa” en minúscula. Conviene mantener la misma capitalización en toda la interfaz.

![Captura 17](capturas/17-categoria-minuscula.png)

### 28. Publicación automática
La unidad quedó publicada automáticamente, sin una confirmación explícita del usuario.

### 29. Eliminar una unidad
No se encontró una opción visible para eliminar una unidad.

### 30. Pausar o desactivar una unidad
Falta una opción para deshabilitar temporalmente una unidad, por ejemplo cuando está en remodelación y no puede alquilarse.

![Captura 18](capturas/18-unidad-publicada.png)

### 31. Superposición de elementos
Hay una superposición visual entre acciones en la parte inferior del formulario, lo que afecta la claridad de la interfaz.

![Captura 19](capturas/19-superposicion-acciones.png)

### 32. Categoría de unidad inconsistente
Aunque el nombre de la unidad indica “CASA”, la ficha continúa mostrando “DEPARTAMENTO” y no permite cambiar correctamente la categoría.

![Captura 20](capturas/20-inconsistencia-casa-departamento.png)

### 33. Redirección inesperada al iniciar sesión
Al seleccionar la unidad “Sin título”, el sistema redirige a la pantalla de inicio de sesión. El comportamiento se reprodujo varias veces.

![Captura 21](capturas/21-redireccion-login.png)

### 34. Uso del mismo correo para distintos roles
No se pudo utilizar el mismo correo para los roles Gestor e Inquilino/Buscador. Confirmar si esta restricción es intencional, especialmente porque existe un flujo para convertir una cuenta en Gestor.
