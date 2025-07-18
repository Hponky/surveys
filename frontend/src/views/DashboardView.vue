<template>
  <h1>Dashboard</h1>
  <div v-if="loading">Cargando encuestas...</div>
  <div v-else-if="error">Error al cargar encuestas: {{ error.message }}</div>
  <div v-else>
    <ul v-if="surveys && surveys.length">
      <li v-for="survey in surveys" :key="survey.id">
        {{ survey.title }}
      </li>
    </ul>
    <p v-else>No hay encuestas disponibles.</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useSurveyApi, type Survey } from '@/services/api';

const surveys = ref<Survey[]>([]);
const loading = ref(true);
const error = ref<Error | null>(null);

onMounted(async () => {
  const { getAllSurveys } = useSurveyApi();
  const { data, isFetching, error: fetchError, execute } = getAllSurveys();

  try {
    await execute();
    if (fetchError.value) {
      error.value = fetchError.value;
    } else if (data.value) {
      surveys.value = data.value;
    }
  } catch (e: unknown) {
    if (e instanceof Error) {
      error.value = e;
    } else {
      error.value = new Error('An unknown error occurred');
    }
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
/* Estilos específicos del componente aquí */
</style>