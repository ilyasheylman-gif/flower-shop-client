<template>
  <div class="container page empty">
    <h1>404</h1>
    <p>Такой страницы нет — возможно, букет уже отцвёл.</p>
    <RouterLink :to="{ name: 'catalog' }" class="btn">В каталог</RouterLink>
  </div>
</template>
