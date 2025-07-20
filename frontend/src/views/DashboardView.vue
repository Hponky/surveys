<template>
<div class="dashboard-container">
  <header class="dashboard-header">
    <h1 class="dashboard-title">Mis Encuestas</h1>
    <RouterLink to="/survey/new" class="btn btn-primary">
      Crear Nueva Encuesta
    </RouterLink>
  </header>

  <section v-if="loading" class="state-message loading-state">
    <p>Cargando encuestas...</p>
  </section>

  <section v-else-if="error" class="state-message error-state">
    <p>Error al cargar las encuestas:</p>
    <pre>{{ error.message }}</pre>
  </section>

  <section v-else-if="surveys && surveys.length > 0" class="surveys-section">
    <div class="table-responsive">
      <table class="surveys-table">
        <thead>
          <tr>
            <th scope="col">Título</th>
            <th scope="col">Fecha de Creación</th>
            <th scope="col">Estado</th>
            <th scope="col">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="survey in surveys" :key="survey.id">
            <td>{{ survey.title }}</td>
            <td>{{ formattedDate(survey.createdAt) }}</td>
            <td><span :class="`status-badge status-${survey.status.toLowerCase()}`">{{ survey.status }}</span></td>
            <td class="actions">
              <RouterLink :to="`/survey/edit/${survey.id}`" class="action-link">Editar</RouterLink>
              <RouterLink :to="`/survey/results/${survey.id}`" class="action-link">Resultados</RouterLink>
              <button @click="shareSurvey(survey.id)" class="action-button">Compartir</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <section v-else class="state-message empty-state">
    <p>Aún no has creado ninguna encuesta. ¡Empieza creando una!</p>
    <RouterLink to="/survey/new" class="btn btn-secondary">
      Crear mi primera encuesta
    </RouterLink>
  </section>

  <div v-if="notification.show" :class="['notification', notification.type]" role="alert">
    {{ notification.message }}
  </div>
</div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useSurveyApi, type Survey } from '@/services/api';

const { getAllSurveys } = useSurveyApi();

const { data: surveys, isFetching: loading, error, execute } = getAllSurveys();

const notification = ref({
  show: false,
  message: '',
  type: ''
});

const showNotification = (message: string, type: 'success' | 'error') => {
  notification.value.message = message;
  notification.value.type = type;
  notification.value.show = true;
  setTimeout(() => {
    notification.value.show = false;
  }, 3000);
};

const shareSurvey = async (surveyId: Survey['id']) => {
  const url = `${window.location.origin}/survey/${surveyId}`;
  try {
    await navigator.clipboard.writeText(url);
    showNotification('¡Enlace copiado al portapapeles!', 'success');
  } catch (err) {
    showNotification('Error al copiar el enlace.', 'error');
  }
};

const formattedDate = (timestamp: string) => {
  return new Date(timestamp).toLocaleDateString();
};

onMounted(() => {
  execute();
});
</script>

<style scoped>
.dashboard-container {
  --color-primary-dark-blue: #004085;
  --color-text-dark: #343a40;
  --color-border-light: #e9ecef;
  --color-background-light: #f8f9fa;
  --color-hover-light: #f2f2f2;
  --color-success: #28a745;
  --color-error: #dc3545;
  --color-info: #6c757d;
  --color-primary-button: #007bff;
  --color-primary-button-hover: #0056b3;
  --color-secondary-button: #6c757d;
  --color-secondary-button-hover: #5a6268;
  --color-error-background: #ffe3e6;
  --color-error-border: #f5c6cb;

  max-width: 1000px;
  margin: 2rem auto;
  padding: 1.5rem;
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  color: var(--color-text-dark);
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border-light);
}

.dashboard-title {
  font-size: 2.5rem;
  color: var(--color-primary-dark-blue);
  font-weight: 700;
  margin: 0;
}

.btn {
  padding: 0.8rem 1.8rem;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.3s ease;
  cursor: pointer;
  border: none;
  font-size: 1rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn-primary {
  background-color: var(--color-primary-button);
  color: white;
  box-shadow: 0 4px 10px rgba(0, 123, 255, 0.2);
}

.btn-primary:hover {
  background-color: var(--color-primary-button-hover);
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(0, 123, 255, 0.3);
}

.btn-secondary {
  background-color: var(--color-secondary-button);
  color: white;
  box-shadow: 0 4px 10px rgba(108, 117, 125, 0.2);
}

.btn-secondary:hover {
  background-color: var(--color-secondary-button-hover);
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(108, 117, 125, 0.3);
}

.state-message {
  text-align: center;
  padding: 4rem 2rem;
  background-color: var(--color-background-light);
  border-radius: 10px;
  margin-top: 2rem;
  font-size: 1.1rem;
  color: var(--color-info);
}

.error-state pre {
  background-color: var(--color-error-background);
  color: var(--color-error);
  padding: 1.5rem;
  border-radius: 8px;
  text-align: left;
  margin-top: 1.5rem;
  font-family: 'Courier New', Courier, monospace;
  white-space: pre-wrap;
  word-break: break-all;
  border: 1px solid var(--color-error-border);
}

.surveys-section {
  margin-top: 2rem;
}

.table-responsive {
  overflow-x: auto;
  border-radius: 10px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
}

.surveys-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  background-color: #ffffff;
}

.surveys-table th,
.surveys-table td {
  padding: 1.2rem 1.5rem;
  text-align: left;
  border-bottom: 1px solid var(--color-border-light);
}

.surveys-table th {
  background-color: var(--color-background-light);
  font-weight: 600;
  color: var(--color-primary-dark-blue);
  position: sticky;
  top: 0;
  z-index: 1;
}

.surveys-table tbody tr:last-child td {
  border-bottom: none;
}

.surveys-table tbody tr:hover {
  background-color: var(--color-hover-light);
}

.status-badge {
  display: inline-block;
  padding: 0.4em 0.8em;
  border-radius: 20px;
  font-size: 0.85em;
  font-weight: 600;
  text-transform: capitalize;
  color: white;
}

.status-created { background-color: var(--color-info); }
.status-published { background-color: var(--color-success); }
.status-closed { background-color: var(--color-error); }

.actions {
  white-space: nowrap;
}

.action-link, .action-button {
  margin-right: 1rem;
  text-decoration: none;
  color: var(--color-primary-dark-blue);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem 0.75rem;
  font-size: 0.95rem;
  border-radius: 6px;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.action-link:hover, .action-button:hover {
  background-color: rgba(0, 123, 255, 0.1);
  color: var(--color-primary-button-hover);
}

.action-button {
  color: var(--color-info);
}

.action-button:hover {
  background-color: rgba(108, 117, 125, 0.1);
  color: var(--color-secondary-button-hover);
}

.notification {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  padding: 18px 30px;
  border-radius: 10px;
  color: white;
  font-weight: 600;
  z-index: 1000;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
  transition: opacity 0.4s ease-in-out, transform 0.4s ease-in-out;
  opacity: 1;
}

.notification.success {
  background-color: var(--color-success);
}

.notification.error {
  background-color: var(--color-error);
}
</style>