<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <header>
    <!-- Aquí podría ir una barra de navegación en el futuro -->
  </header>

  <main>
    <RouterView />
  </main>
</template>

<style scoped>
main {
  padding: 2rem;
}
</style>