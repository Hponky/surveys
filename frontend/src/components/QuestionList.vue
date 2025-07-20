<!-- src/components/QuestionList.vue -->
<template>
  <div class="question-list-container">
    <h2 class="list-title">Preguntas de la Encuesta</h2>
    <ul v-if="questions.length > 0" class="question-list">
      <li v-for="(question, index) in questions" :key="question.questionId" class="question-item">
        <div class="question-content">
          <strong class="question-number">P{{ index + 1 }}:</strong>
          <span class="question-text">{{ question.text }}</span>
          <span class="question-type-badge">{{ question.type === 'MULTIPLE_CHOICE' ? 'Opción Múltiple' : 'Texto Abierto' }}</span>
        </div>
        <!-- En el futuro, aquí irían botones para editar/eliminar la pregunta -->
      </li>
    </ul>
    <div v-else class="empty-list-message">
      <p>Esta encuesta aún no tiene preguntas. ¡Añade la primera!</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Question } from '@/services/api'; // Reutilizamos la interfaz

defineProps<{
  questions: Question[];
}>();
</script>

<style scoped>
.question-list-container {
  margin-top: 3rem;
  border-top: 1px solid #e9ecef;
  padding-top: 2rem;
}

.list-title {
  font-size: 1.8rem;
  color: #004085;
  margin-bottom: 1.5rem;
}

.question-list {
  list-style-type: none;
  padding: 0;
  margin: 0;
}

.question-item {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 1rem 1.5rem;
  margin-bottom: 1rem;
  border: 1px solid #e9ecef;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.question-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.question-number {
  font-weight: bold;
  color: #007bff;
}

.question-type-badge {
  background-color: #e9ecef;
  color: #6c757d;
  padding: 0.3em 0.7em;
  border-radius: 12px;
  font-size: 0.8em;
  font-weight: 500;
}

.empty-list-message {
  text-align: center;
  padding: 2rem;
  color: #6c757d;
  background-color: #f8f9fa;
  border-radius: 8px;
}
</style>