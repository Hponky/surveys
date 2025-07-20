<template>
  <form @submit.prevent="handleSubmit" class="survey-form">
    <div class="form-group">
      <label for="survey-title">Título de la Encuesta</label>
      <input
        id="survey-title"
        :value="title"
        @input="$emit('update:title', ($event.target as HTMLInputElement).value)"
        type="text"
        placeholder="Ej: Encuesta de Satisfacción del Cliente Q3"
        required
      />
      <p v-if="titleError" class="validation-error">{{ titleError }}</p>
    </div>

    <div class="form-group">
      <label for="survey-description">Descripción</label>
      <textarea
        id="survey-description"
        :value="description"
        @input="$emit('update:description', ($event.target as HTMLTextAreaElement).value)"
        placeholder="Ej: Breve descripción del objetivo de esta encuesta."
        rows="4"
        required
      ></textarea>
      <p v-if="descriptionError" class="validation-error">{{ descriptionError }}</p>
    </div>

    <div v-if="errorMessage" class="error-message">
      <p>Ocurrió un error:</p>
      <pre>{{ errorMessage }}</pre>
    </div>

    <div class="form-actions">
      <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
        {{ isSubmitting ? 'Guardando...' : 'Guardar y Añadir Preguntas' }}
      </button>
      <RouterLink to="/" class="btn btn-secondary">Cancelar</RouterLink>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { RouterLink } from 'vue-router';

const props = defineProps<{
  title: string;
  description: string;
  isSubmitting: boolean;
  errorMessage: string | null;
}>();

const emit = defineEmits<{
  (e: 'update:title', value: string): void;
  (e: 'update:description', value: string): void;
  (e: 'submit'): void;
}>();

const titleError = ref<string | null>(null);
const descriptionError = ref<string | null>(null);

watch(() => props.title, () => {
  if (titleError.value && props.title.trim()) {
    titleError.value = null;
  }
});

watch(() => props.description, () => {
  if (descriptionError.value && props.description.trim()) {
    descriptionError.value = null;
  }
});

const validateForm = () => {
  let isValid = true;
  if (!props.title.trim()) {
    titleError.value = 'El título de la encuesta es obligatorio.';
    isValid = false;
  } else {
    titleError.value = null;
  }

  if (!props.description.trim()) {
    descriptionError.value = 'La descripción de la encuesta es obligatoria.';
    isValid = false;
  } else {
    descriptionError.value = null;
  }
  return isValid;
};

const handleSubmit = () => {
  console.log('Valor de title antes de validar:', props.title);
  console.log('Valor de description antes de validar:', props.description);
  const isValid = validateForm();
  console.log('Resultado de validateForm():', isValid); // Añadir esta línea
  if (isValid) {
    emit('submit');
  }
};
</script>

<style scoped>
.survey-form {
  padding: 2.5rem;
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
  font-family: 'Segoe UI', sans-serif;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #343a40;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 0.8rem 1rem;
  border: 1px solid #ced4da;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.2);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
}

.btn {
  padding: 0.8rem 1.8rem;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  transition: background-color 0.3s ease;
  cursor: pointer;
  border: none;
  font-size: 1rem;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}
.btn-primary:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: #f8f9fa;
  color: #343a40;
  border: 1px solid #ced4da;
}

.error-message {
  margin-top: 1.5rem;
  background-color: #ffe3e6;
  color: #dc3545;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #f5c6cb;
}

.validation-error {
  color: #dc3545;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}
</style>