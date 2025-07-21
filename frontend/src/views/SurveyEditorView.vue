<template>
  <div class="editor-container">
    <h1 class="editor-title">{{ isEditing ? `Editar Encuesta: ${surveyTitle}` : 'Crear Nueva Encuesta' }}</h1>
    <p class="editor-subtitle">{{ isEditing ? 'Modifica los detalles y gestiona las preguntas de tu encuesta.' : 'Define los detalles básicos de tu encuesta. Podrás añadir las preguntas en el siguiente paso.' }}</p>

    <SurveyForm
      :title="surveyTitle"
      :description="surveyDescription"
      :is-submitting="isCreating"
      :error-message="apiErrorMessage"
      @update:title="surveyTitle = $event"
      @update:description="surveyDescription = $event"
      @submit="handleCreateSurvey"
    />

    <div v-if="isEditing" class="questions-section">
      <QuestionList :questions="questions" />
      <div v-if="questionErrorMessage" class="error-message">{{ questionErrorMessage }}</div>
      <AddQuestionForm :is-submitting="isSubmittingQuestion" @add-question="handleAddQuestion" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import SurveyForm from '@/components/SurveyForm.vue';
import QuestionList from '@/components/QuestionList.vue';
import AddQuestionForm from '@/components/AddQuestionForm.vue';
import { useSurveyApi } from '@/services/api';
import type { Question } from '@/services/api';

const router = useRouter();

const surveyTitle = ref('');
const surveyDescription = ref('');
const questions = ref<Question[]>([]);
const isSubmittingQuestion = ref(false);

const props = defineProps<{ id?: string }>();

const isEditing = computed(() => props.id && props.id !== 'new');

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
const { data: loadedSurvey, execute: fetchSurveyById } = useSurveyApi().getSurvey(computed(() => props.id || ''));

watch(loadedSurvey, (newSurvey) => {
  if (newSurvey) {
    surveyTitle.value = newSurvey.title;
    surveyDescription.value = newSurvey.description;
    questions.value = newSurvey.questions || [];
  } else if (props.id === 'new' || !props.id) {
    surveyTitle.value = '';
    surveyDescription.value = '';
    questions.value = [];
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

// Definimos un tipo local para los datos de la pregunta que vienen del formulario
interface AddQuestionFormData {
  text: string;
  type: 'OPEN_TEXT' | 'MULTIPLE_CHOICE';
  options?: string[];
}

const questionErrorMessage = ref<string | null>(null);

const handleAddQuestion = async (questionData: AddQuestionFormData) => {
  if (!props.id) {
    questionErrorMessage.value = 'Error: No se puede añadir una pregunta a una encuesta no guardada.';
    return;
  }

  isSubmittingQuestion.value = true;
  questionErrorMessage.value = null;

  try {
    console.debug('[SurveyEditor] Iniciando llamada para añadir pregunta:', {
      surveyId: props.id,
      questionData,
      timestamp: new Date().toISOString()
    });

    const apiCall = useSurveyApi().addQuestion(computed(() => props.id || ''), questionData);
    
    console.debug('[SurveyEditor] Configuración de la llamada API:', {
      method: 'POST',
      endpoint: `/surveys/${props.id}/questions`,
      headers: apiCall.options?.headers,
      body: JSON.stringify(questionData)
    });

    await apiCall.execute();

    console.debug('[SurveyEditor] Respuesta completa de la API:', {
      status: apiCall.statusCode.value,
      data: apiCall.data.value,
      error: apiCall.error.value,
      headers: apiCall.responseHeaders.value
    });

    if (apiCall.error.value) {
      const errorMsg = apiCall.error.value.response?.data?.message
        || apiCall.error.value.message
        || 'Error desconocido al añadir pregunta';
      questionErrorMessage.value = `Error: ${errorMsg}`;
      console.error('[SurveyEditor] Error detallado al añadir pregunta:', {
        error: apiCall.error.value,
        request: {
          url: `/surveys/${props.id}/questions`,
          method: 'POST',
          payload: questionData
        },
        response: apiCall.error.value.response?.data
      });
      return;
    }

    // Actualizar lista de preguntas mediante recarga desde servidor
    await fetchSurveyById();
    console.debug('[SurveyEditor] Pregunta añadida exitosamente. Recargando encuesta...');
    
  } catch (e: any) {
    const errorMsg = e.response?.data?.message || e.message || 'Error inesperado';
    questionErrorMessage.value = `Error: ${errorMsg}`;
    console.error('[SurveyEditor] Error no manejado al añadir pregunta:', {
      error: e,
      stack: e.stack,
      requestInfo: {
        surveyId: props.id,
        questionData
      }
    });
  } finally {
    isSubmittingQuestion.value = false;
    console.debug('[SurveyEditor] Finalizado proceso de añadir pregunta');
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