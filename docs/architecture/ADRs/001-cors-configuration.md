# ADR 001: Configuración de CORS para la API de Encuestas

## Título
Configuración de CORS para la API de Encuestas

## Estado
Aceptado

## Contexto
La aplicación frontend (Vue.js) necesita comunicarse con la API de encuestas desplegada en AWS API Gateway. Durante el desarrollo y las pruebas, se encontró un error de "Política de Mismo Origen" (CORS), impidiendo que las solicitudes del frontend llegaran al backend. Esto se debe a que, por defecto, API Gateway no incluye las cabeceras `Access-Control-Allow-Origin` necesarias en sus respuestas.

## Decisión
Se ha decidido habilitar CORS para todos los endpoints `httpApi` definidos en el archivo `backend/serverless.yml`. Esto se logra añadiendo la propiedad `cors: true` a la configuración de cada evento `httpApi` relevante.

## Justificación
*   **Interoperabilidad Frontend-Backend:** Habilitar CORS es fundamental para permitir que las aplicaciones frontend basadas en navegador realicen solicitudes HTTP a la API, ya que la política de mismo origen es una característica de seguridad implementada por los navegadores.
*   **Simplicidad y Coherencia:** Aplicar `cors: true` a todos los endpoints `httpApi` en `serverless.yml` es la forma más sencilla y coherente de resolver el problema de CORS para toda la API, evitando configuraciones individuales complejas o errores futuros al añadir nuevos endpoints.
*   **Seguridad (Consideración):** Aunque `cors: true` habilita `Access-Control-Allow-Origin: *` por defecto, para una aplicación de demostración o interna, esto es aceptable. Para entornos de producción con requisitos de seguridad más estrictos, se podría refinar la configuración para especificar orígenes permitidos (`allowedOrigins`) y métodos (`allowedMethods`) explícitamente. Sin embargo, para el alcance actual, la configuración predeterminada es suficiente.

## Consecuencias
*   **Positivas:**
    *   Resuelve el error de CORS, permitiendo la comunicación fluida entre el frontend y el backend.
    *   Facilita el desarrollo y las pruebas de la aplicación frontend.
    *   Asegura que la API sea accesible desde cualquier origen, lo cual es útil para propósitos de demostración o APIs públicas.
*   **Negativas (Mitigadas):**
    *   La configuración predeterminada `cors: true` permite solicitudes desde cualquier origen (`*`). Esto podría ser una preocupación de seguridad en un entorno de producción si la API maneja datos sensibles y no está protegida por autenticación/autorización. Para este proyecto, se considera aceptable.

## Opciones Consideradas
*   **Configuración manual de cabeceras CORS en Lambda:** Descartado por ser más complejo y propenso a errores que la opción `cors: true` de Serverless Framework.
*   **Uso de un proxy inverso:** Descartado por añadir complejidad innecesaria a la arquitectura para este caso de uso.