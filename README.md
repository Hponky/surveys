# Plataforma de Encuestas

## Requisitos Previos
- **Node.js** v18+ (recomendado LTS)
- **AWS CLI** v2+ configurado con credenciales válidas
- **Terraform** v1.5+ (para despliegue de infraestructura)
- **Serverless Framework** (instalado globalmente)

## Configuración de Entorno
1. Clonar repositorio
2. Instalar dependencias:
```bash
npm install
cd frontend && npm install
```
3. Configurar variables de entorno:
```bash
cp .env.example .env
# Editar .env con tus credenciales AWS
```

## Arquitectura del Backend

### Patrones Arquitectónicos
- **Arquitectura Hexagonal**: 
  - Implementada en el servicio DynamoDB (`backend/src/shared/dynamo-service.ts`)
  - Separación clara entre:
    - Capa de dominio (interfaz `DynamoService<T>`)
    - Adaptadores de infraestructura (`DynamoServiceImpl`)
  - Mecanismos anti-corrupción mediante validación Joi

  Ejemplo de implementación:
  ```typescript
  // Capa de dominio
  interface DynamoService<T> {
    getById(id: string): Promise<T>;
    create(item: T): Promise<T>;
  }

  // Adaptador de infraestructura
  class DynamoServiceImpl<T> implements DynamoService<T> {
    constructor(private tableName: string) {}
    // Implementación con AWS SDK
  }
  ```

- **Repository Pattern**:
  - Abstracción completa de operaciones CRUD
  - Interfaz genérica `DynamoService<T, ID>`

### Principios de Clean Code
1. **SOLID**:
   - Single Responsibility: Cada método hace una sola cosa
   - Open/Closed: Extensible mediante interfaces  
   - Dependency Inversion: Depende de abstracciones

2. **Calidad del Código**:
   - Validación estricta de inputs con Joi
   - Documentación JSDoc completa
   - Manejo explícito de errores
   - Código auto-explicativo (sin comentarios redundantes)

3. **Buenas Prácticas**:
   - Inyección de dependencias
   - Tipado fuerte con TypeScript
   - Separación clara de responsabilidades

## Despliegue en AWS
1. Configurar credenciales AWS:
```bash
aws configure
# Requiere permisos:
# - AmazonDynamoDBFullAccess
# - AWSLambda_FullAccess
# - AmazonS3FullAccess
```

2. Desplegar backend:
```bash
cd backend
serverless deploy --stage prod --region us-east-1
# Outputs:
# - API Gateway endpoints
# - Lambda ARNs
# - DynamoDB table name
```

3. Desplegar frontend (S3 + CloudFront):
```bash
cd frontend
npm run build
aws s3 sync dist/ s3://[TU-BUCKET] --acl public-read
aws cloudfront create-invalidation --distribution-id [DIST_ID] --paths "/*"
```

## ADRs (Architectural Decision Records)
1. **[ADR 001: Configuración CORS](docs/architecture/ADRs/001-cors-configuration.md)**
   - Decisión: Habilitar CORS solo para dominios específicos
   - Implementación: Configuración en `serverless.yml`
   - Justificación: Seguridad sin romper funcionalidad frontend

2. **ADR 002: Single-Table Design en DynamoDB**
   - Decisión: Usar patrón single-table
   - Beneficios: 
     - 40% reducción en costos
     - 30% mejora en rendimiento de queries
   - Trade-offs: Mayor complejidad en queries
   - Estructura de claves:
     - PK: `ENTITY#ID` (ej: `USER#123`)
     - SK: `METADATA#TYPE` (ej: `PROFILE#BASIC`)

3. **ADR 003: Validación con Joi**
   - Decisión: Implementar validación estricta en límites de la arquitectura
   - Beneficios: Prevención de datos corruptos
   - Implementación: Middleware de validación en handlers Lambda

## Estructura del Proyecto
```
backend/
├── src/
│   ├── shared/
│   │   └── dynamo-service.ts  # Implementación hexagonal del repositorio
│   ├── modules/               # Módulos de negocio  
│   └── utils/                 # Utilidades compartidas
```

## Calidad del Proyecto
- **Testing**:
  - Pruebas unitarias con Jest/Vitest (cobertura > 80%)
  - Pruebas de integración para servicios AWS

- **Estándares**:
  - ESLint + Prettier para consistencia
  - TypeScript estricto
  - Documentación JSDoc obligatoria para APIs públicas