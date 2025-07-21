<!-- src/components/AddQuestionForm.vue -->
<template>
  <div class="add-question-form-container">
    <h3 class="form-title">Añadir Nueva Pregunta</h3>
    <form @submit.prevent="handleSubmit" class="question-form">
      <div class="form-group">
        <label for="question-text">Texto de la Pregunta</label>
        <input
          id="question-text"
          v-model="question.text"
          type="text"
          placeholder="Ej: ¿Qué tan satisfecho estás con nuestro servicio?"
          required
        />
      </div>

      <div class="form-group">
        <label for="question-type">Tipo de Pregunta</label>
        <select id="question-type" v-model="question.type" required>
          <option value="OPEN_TEXT">Texto Abierto</option>
          <option value="MULTIPLE_CHOICE">Opción Múltiple</option>
        </select>
      </div>
    
      <!-- Se muestra solo si el tipo es Opción Múltiple -->
      <div v-if="question.type === 'MULTIPLE_CHOICE'" class="form-group options-group">
        <label>Opciones (una por línea)</label>
        <textarea
          v-model="optionsText"
          placeholder="Opción 1
    Opción 2
    Opción 3"
          rows="4"
          required
        ></textarea>
        <small>Asegúrate de tener al menos dos opciones.</small>
      </div>
      
      <div class="form-actions">
        <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
          {{ isSubmitting ? 'Añadiendo...' : 'Añadir Pregunta' }}
        </button>
      </div>
    </form>
    </div>
    </template>
    
    <script setup lang="ts">
    import { ref, watch, reactive } from 'vue';
    
    // El estado del formulario vive dentro de este componente
    const question = reactive({
      text: '',
      type: 'OPEN_TEXT' as 'OPEN_TEXT' | 'MULTIPLE_CHOICE', // Aseguramos el tipo literal
      options: [] as string[]
    });

// Usamos un v-model separado para el textarea de opciones
const optionsText = ref('');

// Observamos el textarea y lo convertimos en un array de strings
watch(optionsText, (newText) => {
    question.options = newText.split('\n').map(opt => opt.trim()).filter(opt => opt);
});

const props = defineProps<{
  isSubmitting: boolean;
}>();

const emit = defineEmits<{
  (e: 'add-question', questionData: typeof question): void;
}>();

const handleSubmit = () => {
  // Validación simple
  if (!question.text.trim()) {
    alert('El texto de la pregunta no puede estar vacío.');
    return;
  }
  if (question.type === 'MULTIPLE_CHOICE' && question.options.length < 2) {
    alert('Las preguntas de opción múltiple deben tener al menos dos opciones.');
    return;
  }
  
  // Emitimos el evento con los datos de la pregunta hacia el componente padre
  emit('add-question', { ...question });
  
  // Limpiamos el formulario después de enviar
  question.text = '';
  question.type = 'OPEN_TEXT';
  optionsText.value = '';
};
</script>

<style scoped>
.add-question-form-container {
  margin-top: 2rem;
  border-top: 1px solid #e9ecef;
  padding-top: 2rem;
}
.form-title {
  font-size: 1.8rem; color: #004085; margin-bottom: 1.5rem;
}
/* ... puedes copiar/adaptar los estilos del form-group y btn de otros componentes ... */
.form-group { margin-bottom: 1.5rem; }
.form-group label { display: block; margin-bottom: 0.5rem; font-weight: 600; }
.form-group input, .form-group select, .form-group textarea {
  width: 100%;
  padding: 0.8rem 1rem;
  border: 1px solid #ced4da;
  border-radius: 8px;
  font-size: 1rem;
}
.form-actions { text-align: right; }
.btn-primary:disabled { background-color: #6c757d; cursor: not-allowed; }
</style>