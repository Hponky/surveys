<template>
  <div class="editor-container">
    <h1 class="editor-title">Crear Nueva Encuesta</h1>
    <p class="editor-subtitle">Define los detalles básicos de tu encuesta. Podrás añadir las preguntas en el siguiente paso.</p>

    <SurveyForm
      :title="surveyTitle"
      :description="surveyDescription"
      :is-submitting="isCreating"
      :error-message="apiErrorMessage"
      @update:title="surveyTitle = $event"
      @update:description="surveyDescription = $event"
      @submit="handleCreateSurvey"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import SurveyForm from '@/components/SurveyForm.vue';
import { useSurveyApi } from '@/services/api';

const router = useRouter();

const surveyTitle = ref('');
const surveyDescription = ref('');

const props = defineProps<{
  id?: string;
}>();

// Objeto reactivo para los datos de la encuesta que se enviarán a la API
const surveyData = computed(() => ({
  title: surveyTitle.value,
  description: surveyDescription.value
}));

const { isFetching: isCreating, error: apiError, execute, data: createdSurvey } = useSurveyApi().createSurvey(surveyData);

const apiErrorMessage = computed(() => {
  if (apiError.value) {
    // Intenta extraer un mensaje de error más específico si está disponible
    if (apiError.value.response && apiError.value.response.data && apiError.value.response.data.message) {
      return apiError.value.response.data.message;
    }
    return apiError.value.message || 'Error desconocido al comunicarse con la API.';
  }
  return null;
});

// Función para cargar los datos de la encuesta existente
const { data: loadedSurvey, execute: fetchSurveyById } = useSurveyApi().getSurvey(computed(() => props.id || '').value);

watch(loadedSurvey, (newSurvey) => {
  if (newSurvey) {
    surveyTitle.value = newSurvey.title;
    surveyDescription.value = newSurvey.description;
  } else if (props.id === 'new' || !props.id) {
    surveyTitle.value = '';
    surveyDescription.value = '';
  }
});

watch(
  () => props.id,
  (newId) => {
    if (newId && newId !== 'new') {
      fetchSurveyById();
    } else if (newId === 'new') {
      surveyTitle.value = '';
      surveyDescription.value = '';
    }
  },
  { immediate: true }
);

onMounted(() => {
  if (props.id && props.id !== 'new') {
    fetchSurveyById();
  }
});

const handleCreateSurvey = async () => {
  await execute();

  if (createdSurvey.value?.id) {
    router.push({ name: 'survey-edit', params: { id: createdSurvey.value.id } });
  }
};
</script>

<style scoped>
.editor-container {
  max-width: 700px;
  margin: 2rem auto;
  padding: 2.5rem;
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
  font-family: 'Segoe UI', sans-serif;
}

.editor-title {
  font-size: 2.2rem;
  color: #004085;
  text-align: center;
  margin-bottom: 0.5rem;
}

.editor-subtitle {
  text-align: center;
  color: #6c757d;
  margin-bottom: 2.5rem;
}
</style>